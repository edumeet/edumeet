import Logger from '../../logger/Logger';

const { Resolver } = require('dns').promises;
const prom = require('prom-client');

const logger = new Logger('metrics:default');

const resolver = new Resolver();

const labelNames = [
	'pid', 'room_id', 'peer_id', 'display_name', 'user_agent', 'transport_id',
	'proto', 'local_addr', 'remote_addr', 'id', 'kind', 'codec', 'type'
];

const metadata = {
	'byteCount' : { metricType: prom.Counter, unit: 'bytes' },
	'score'     : { metricType: prom.Gauge }
};

module.exports = async function(workers, rooms, peers, registry, config)
{
	const newMetrics = function(subsystem)
	{
		const namespace = 'mediasoup';
		const metrics = new Map();

		for (const key in metadata)
		{
			if (Object.prototype.hasOwnProperty.call(metadata, key))
			{
				const value = metadata[key];
				const name = key.split(/(?=[A-Z])/).join('_')
					.toLowerCase();
				const unit = value.unit;
				const metricType = value.metricType;
				let s = `${namespace}_${subsystem}_${name}`;

				if (unit)
				{
					s += `_${unit}`;
				}
				const m = new metricType({
					name : s, help : `${subsystem}.${key}`, labelNames : labelNames, registers : [ registry ] });

				metrics.set(key, m);
			}
		}

		return metrics;
	};

	const commonLabels = function(both, fn)
	{
		for (const roomId of rooms.keys())
		{
			for (const [ peerId, peer ] of peers)
			{
				if (fn(peer))
				{
					const displayName = peer._displayName;
					const userAgent = peer._socket.client.request.headers['user-agent'];
					const kind = both.kind;
					const codec = both.rtpParameters.codecs[0].mimeType.split('/')[1];

					return { roomId, peerId, displayName, userAgent, kind, codec };
				}
			}
		}
		throw new Error('cannot find common labels');
	};

	const addr = async function(ip, port)
	{
		if (config.deidentify)
		{
			const a = ip.split('.');

			for (let i = 0; i < a.length - 2; i++)
			{
				a[i] = 'xx';
			}

			return `${a.join('.')}:${port}`;
		}
		else if (config.numeric)
		{
			return `${ip}:${port}`;
		}
		else
		{
			try
			{
				const a = await resolver.reverse(ip);

				ip = a[0];
			}
			catch (err)
			{
				logger.error(`reverse DNS query failed: ${ip} ${err.code}`);
			}

			return `${ip}:${port}`;
		}
	};

	const quiet = function(s)
	{
		return config.quiet ? '' : s;
	};

	const setValue = function(key, m, labels, v)
	{
		logger.debug(`setValue key=${key} v=${v}`);
		switch (metadata[key].metricType)
		{
			case prom.Counter:
				m.inc(labels, v);
				break;
			case prom.Gauge:
				m.set(labels, v);
				break;
			default:
				throw new Error(`unexpected metric: ${m}`);
		}
	};

	logger.debug('collect');
	const mRooms = new prom.Gauge({ name: 'edumeet_rooms', help: '#rooms', registers: [ registry ] });

	mRooms.set(rooms.size);
	const mPeers = new prom.Gauge({ name: 'edumeet_peers', help: '#peers', labelNames: [ 'room_id' ], registers: [ registry ] });

	for (const [ roomId, room ] of rooms)
	{
		mPeers.labels(roomId).set(Object.keys(room._peers).length);
	}

	const mConsumer = newMetrics('consumer');
	const mProducer = newMetrics('producer');

	for (const worker of workers.values())
	{
		logger.debug(`visiting worker ${worker.pid}`);
		for (const router of worker.appData.routers.values())
		{
			logger.debug(`visiting router ${router.id}`);
			for (const [ transportId, transport ] of router.appData.transports)
			{
				logger.debug(`visiting transport ${transportId}`);
				const transportJson = await transport.dump();

				if (transportJson.iceState != 'completed')
				{
					logger.debug(`skipping transport ${transportId}}: ${transportJson.iceState}`);
					continue;
				}
				const iceSelectedTuple = transportJson.iceSelectedTuple;
				const proto = iceSelectedTuple.protocol;
				const localAddr = await addr(iceSelectedTuple.localIp,
					iceSelectedTuple.localPort);
				const remoteAddr = await addr(iceSelectedTuple.remoteIp,
					iceSelectedTuple.remotePort);

				for (const [ producerId, producer ] of transport.appData.producers)
				{
					logger.debug(`visiting producer ${producerId}`);
					const { roomId, peerId, displayName, userAgent, kind, codec } =
						commonLabels(producer, (peer) => peer._producers.has(producerId));
					const a = await producer.getStats();

					for (const x of a)
					{
						const type = x.type;
						const labels = {
							'pid'          : worker.pid,
							'room_id'      : roomId,
							'peer_id'      : peerId,
							'display_name' : displayName,
							'user_agent'   : userAgent,
							'transport_id' : quiet(transportId),
							'proto'        : proto,
							'local_addr'   : localAddr,
							'remote_addr'  : remoteAddr,
							'id'           : quiet(producerId),
							'kind'         : kind,
							'codec'        : codec,
							'type'         : type
						};

						for (const [ key, m ] of mProducer)
						{
							setValue(key, m, labels, x[key]);
						}
					}
				}
				for (const [ consumerId, consumer ] of transport.appData.consumers)
				{
					logger.debug(`visiting consumer ${consumerId}`);
					const { roomId, peerId, displayName, userAgent, kind, codec } =
                        commonLabels(consumer, (peer) => peer._consumers.has(consumerId));
					const a = await consumer.getStats();

					for (const x of a)
					{
						if (x.type == 'inbound-rtp')
						{
							continue;
						}
						const type = x.type;
						const labels =
						{
							'pid'          : worker.pid,
							'room_id'      : roomId,
							'peer_id'      : peerId,
							'display_name' : displayName,
							'user_agent'   : userAgent,
							'transport_id' : quiet(transportId),
							'proto'        : proto,
							'local_addr'   : localAddr,
							'remote_addr'  : remoteAddr,
							'id'           : quiet(consumerId),
							'kind'         : kind,
							'codec'        : codec,
							'type'         : type
						};

						for (const [ key, m ] of mConsumer)
						{
							setValue(key, m, labels, x[key]);
						}
					}
				}
			}
		}
	}
};
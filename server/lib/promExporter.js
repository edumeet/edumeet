const { Resolver } = require('dns').promises;
const express = require('express');
const mediasoup = require('mediasoup');
const prom = require('prom-client');

const Logger = require('./Logger');
const Peer = require('./Peer');
const Room = require('./Room');

const logger = new Logger('prom');
const resolver = new Resolver();

const workers = new Map();

const label_names = [
	'pid', 'room_id', 'peer_id', 'display_name', 'user_agent', 'transport_id',
	'proto', 'local_addr', 'remote_addr', 'id', 'kind', 'codec', 'type'
];

const metadata = {
	'byteCount': { metric_type: prom.Counter, unit: 'bytes' },
	'score': { metric_type: prom.Gauge }
}

common_labels = function(both, fn) {
	for (let [room_id, room] of rooms) {
		for (let [peer_id, peer] of peers) {
			if (fn(peer)) {
				let display_name = peer._displayName;

				let user_agent = peer._socket.client.request.headers['user-agent'];
				let kind = both.kind;
				let codec = both.rtpParameters.codecs[0].mimeType.split('/')[1];
				return { room_id, peer_id, display_name, user_agent, kind, codec };
			}
		}
	}
	throw new Error('cannot find common labels');
}

set_value = function(key, m, labels, v) {
	logger.debug(`set_value key=${key} v=${v}`);
	switch (metadata[key].metric_type) {
	case prom.Counter:
		m.inc(labels, v);
		break;
	case prom.Gauge:
		m.set(labels, v);
		break;
	default:
		throw new Error(`unexpected metric: ${m}`);
	}
}

collect = async function(registry, rooms, peers) {

	metrics = function(subsystem) {
		let namespace = 'mediasoup';
		let metrics = new Map();
		for (let key in metadata) {
			value = metadata[key];
			let name	= key.split(/(?=[A-Z])/).join('_').toLowerCase();
			let unit = value.unit;
			let metric_type = value.metric_type;
			let s = `${namespace}_${subsystem}_${name}`;
			if (unit) {
				s += `_${unit}`;
			}
			m = new metric_type({name: s, help: `${subsystem}.${key}`,
				labelNames: label_names, registers: [registry]});
			metrics.set(key, m);
		}
		return metrics;
	}

	logger.debug('collect');
	const m_rooms = new prom.Gauge({name: 'edumeet_rooms', help: '#rooms',
		registers: [registry]});
	m_rooms.set(rooms.size);
	const m_peers = new prom.Gauge({name: 'edumeet_peers', help: '#peers',
		labelNames: ['room_id'], registers: [registry]});
	for (let [room_id, room] of rooms) {
		m_peers.labels(room_id).set(Object.keys(room._peers).length);
	}

	const m_consumer = metrics('consumer');
	const m_producer = metrics('producer');
	for (let [pid, worker] of workers) {
		logger.debug(`visiting worker ${pid}`);
		for (let router of worker._routers) {
			logger.debug(`visiting router ${router.id}`);
			for (let [transport_id, transport] of router._transports) {
				logger.debug(`visiting transport ${transport_id}`);
				let transport_j = await transport.dump();
				if (transport_j.iceState != 'completed') {
					logger.debug(`skipping transport ${transport_id}}: ${transport_j.iceState}`);
					continue;
				}
				let ice_selected_tuple = transport_j.iceSelectedTuple;
				let proto = ice_selected_tuple.protocol
				let local_addr = await addr(ice_selected_tuple.localIp,
					ice_selected_tuple.localPort);
				let remote_addr = await addr(ice_selected_tuple.remoteIp,
					ice_selected_tuple.remotePort);
				for (let [producer_id, producer] of transport._producers) {
					logger.debug(`visiting producer ${producer_id}`);
					let { room_id, peer_id, display_name, user_agent, kind, codec } = 
						common_labels(producer, peer => peer._producers.has(producer_id));
					let a = await producer.getStats();
					for (let x of a) {
						let type = x.type;
						let labels = {
						 'pid': pid,
						 'room_id': room_id,
						 'peer_id': peer_id,
						 'display_name': display_name,
						 'user_agent': user_agent,
						 'transport_id': quiet(transport_id),
						 'proto': proto,
						 'local_addr': local_addr,
						 'remote_addr': remote_addr,
						 'id': quiet(producer_id),
						 'kind': kind,
						 'codec': codec,
						 'type': type
						}
						for (let [key, m] of m_producer) {
							set_value(key, m, labels, x[key]);
						}
					}
				}
				for (let [consumer_id, consumer] of transport._consumers) {
					logger.debug(`visiting consumer ${consumer_id}`);
					let { room_id, peer_id, display_name, user_agent, kind, codec } = 
						common_labels(consumer, peer => peer._consumers.has(consumer_id));
					let a = await consumer.getStats();
					for (let x of a) {
						if (x.type == 'inbound-rtp') {
							continue;
						}
						let type = x.type;
						let labels = {
						 'pid': pid,
						 'room_id': room_id,
						 'peer_id': peer_id,
						 'display_name': display_name,
						 'user_agent': user_agent,
						 'transport_id': quiet(transport_id),
						 'proto': proto,
						 'local_addr': local_addr,
						 'remote_addr': remote_addr,
						 'id': quiet(consumer_id),
						 'kind': kind,
						 'codec': codec,
						 'type': type
						}
						for (let [key, m] of m_consumer) {
							set_value(key, m, labels, x[key]);
						}
					}
				}
			}
		}
	}
}

module.exports = async function(rooms, peers, config) {

	addr = async function(ip, port) {
		if (config.deidentify) {
			let a = ip.split('.')
			for (let i = 0; i < a.length - 2; i++) {
				a[i] = 'xx';
			}
			return `${a.join('.')}:${port}`;
		}
		else if (config.numeric) {
			return `${ip}:${port}`;
		}
		else {
			try {
				let a = await resolver.reverse(ip);
				ip = a[0];
			}
			catch (err) {
				logger.error(`reverse DNS query failed: ${ip} ${err.code}`);
			}
			return `${ip}:${port}`;
		}
	}

	quiet = function(s) {
		return config.quiet ? '' : s;
	}

	try {
		logger.debug(`config.deidentify=${config.deidentify}`);
		logger.debug(`config.numeric=${config.numeric}`);
		logger.debug(`config.port=${config.port}`);
		logger.debug(`config.quiet=${config.quiet}`);

		mediasoup.observer.on('newworker', worker => {
			logger.debug(`observing newworker ${worker.pid} #${workers.size}`);
			workers.set(worker.pid, worker);
			worker.observer.on('close', () => {
				logger.debug(`observing close worker ${worker.pid} #${workers.size - 1}`);
				workers.delete(worker.pid);
			});
		});

		let app = express();
		app.get('/', async (req, res) => {
			logger.debug(`GET ${req.originalUrl}`);
			let registry = new prom.Registry();
			await collect(registry, rooms, peers);
			res.set('Content-Type', registry.contentType);
			let data = registry.metrics();
			res.end(data);
		});
		let server = app.listen(config.port || 8889, () => {
			address = server.address();
			logger.info(`listening ${address.address}:${address.port}`);
		});
	}
	catch (err) {
		logger.error(err);
	}
}

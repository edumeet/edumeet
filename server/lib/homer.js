'use strict';

const path = require('path');
const fs = require('fs');

const STATS_INTERVAL = 4000; // TODO

function homer(server)
{
	if (!process.env.MEDIASOUP_HOMER_OUTPUT)
		throw new Error('MEDIASOUP_HOMER_OUTPUT env not set');

	server.on('newroom', (room) =>
	{
		const fileName =
			path.join(
				process.env.MEDIASOUP_HOMER_OUTPUT,
				`${(new Date()).toISOString()}_${room.id}`);

		const stream = fs.createWriteStream(fileName, { flags: 'a' });

		emit(
			{
				event           : 'server.newroom',
				roomId          : room.id,
				rtpCapabilities : room.rtpCapabilities
			},
			stream);

		handleRoom(room, stream);
	});
}

function handleRoom(room, stream)
{
	const baseEvent =
	{
		roomId : room.id
	};

	room.on('close', () =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event : 'room.close'
				}),
			stream);

		stream.end();
	});

	room.on('newpeer', (peer) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event           : 'room.newpeer',
					peerName        : peer.name,
					rtpCapabilities : peer.rtpCapabilities
				}),
			stream);

		handlePeer(peer, baseEvent, stream);
	});
}

function handlePeer(peer, baseEvent, stream)
{
	baseEvent = Object.assign({}, baseEvent,
		{
			peerName : peer.name
		});

	peer.on('close', (originator) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event      : 'peer.close',
					originator : originator
				}),
			stream);
	});

	peer.on('newtransport', (transport) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event              : 'peer.newtransport',
					transportId        : transport.id,
					direction          : transport.direction,
					iceLocalCandidates : transport.iceLocalCandidates
				}),
			stream);

		handleTransport(transport, baseEvent, stream);
	});

	peer.on('newproducer', (producer) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event         : 'peer.newproducer',
					producerId    : producer.id,
					kind          : producer.kind,
					transportId   : producer.transport.id,
					rtpParameters : producer.rtpParameters
				}),
			stream);

		handleProducer(producer, baseEvent, stream);
	});

	peer.on('newconsumer', (consumer) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event         : 'peer.newconsumer',
					consumerId    : consumer.id,
					kind          : consumer.kind,
					sourceId      : consumer.source.id,
					rtpParameters : consumer.rtpParameters
				}),
			stream);

		handleConsumer(consumer, baseEvent, stream);
	});

	// Must also handle existing Consumers at the time the Peer was created.
	for (const consumer of peer.consumers)
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event         : 'peer.newconsumer',
					consumerId    : consumer.id,
					kind          : consumer.kind,
					sourceId      : consumer.source.id,
					rtpParameters : consumer.rtpParameters
				}),
			stream);

		handleConsumer(consumer, baseEvent, stream);
	}
}

function handleTransport(transport, baseEvent, stream)
{
	baseEvent = Object.assign({}, baseEvent,
		{
			transportId : transport.id
		});

	const statsInterval = setInterval(() =>
	{
		transport.getStats()
			.then((stats) =>
			{
				emit(
					Object.assign({}, baseEvent,
						{
							event : 'transport.stats',
							stats : stats
						}),
					stream);
			});
	}, STATS_INTERVAL);

	transport.on('close', (originator) =>
	{
		clearInterval(statsInterval);

		emit(
			Object.assign({}, baseEvent,
				{
					event      : 'transport.close',
					originator : originator
				}),
			stream);
	});

	transport.on('iceselectedtuplechange', (iceSelectedTuple) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event            : 'transport.iceselectedtuplechange',
					iceSelectedTuple : iceSelectedTuple
				}),
			stream);
	});

	transport.on('icestatechange', (iceState) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event    : 'transport.icestatechange',
					iceState : iceState
				}),
			stream);
	});

	transport.on('dtlsstatechange', (dtlsState) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event     : 'transport.dtlsstatechange',
					dtlsState : dtlsState
				}),
			stream);
	});
}

function handleProducer(producer, baseEvent, stream)
{
	baseEvent = Object.assign({}, baseEvent,
		{
			producerId : producer.id
		});

	const statsInterval = setInterval(() =>
	{
		producer.getStats()
			.then((stats) =>
			{
				emit(
					Object.assign({}, baseEvent,
						{
							event : 'producer.stats',
							stats : stats
						}),
					stream);
			});
	}, STATS_INTERVAL);

	producer.on('close', (originator) =>
	{
		clearInterval(statsInterval);

		emit(
			Object.assign({}, baseEvent,
				{
					event      : 'producer.close',
					originator : originator
				}),
			stream);
	});

	producer.on('pause', (originator) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event      : 'producer.pause',
					originator : originator
				}),
			stream);
	});

	producer.on('resume', (originator) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event      : 'producer.resume',
					originator : originator
				}),
			stream);
	});
}

function handleConsumer(consumer, baseEvent, stream)
{
	baseEvent = Object.assign({}, baseEvent,
		{
			consumerId : consumer.id
		});

	const statsInterval = setInterval(() =>
	{
		consumer.getStats()
			.then((stats) =>
			{
				emit(
					Object.assign({}, baseEvent,
						{
							event : 'consumer.stats',
							stats : stats
						}),
					stream);
			});
	}, STATS_INTERVAL);

	consumer.on('close', (originator) =>
	{
		clearInterval(statsInterval);

		emit(
			Object.assign({}, baseEvent,
				{
					event      : 'consumer.close',
					originator : originator
				}),
			stream);
	});

	consumer.on('handled', () =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event       : 'consumer.handled',
					transportId : consumer.transport.id
				}),
			stream);
	});

	consumer.on('unhandled', () =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event : 'consumer.handled'
				}),
			stream);
	});

	consumer.on('pause', (originator) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event      : 'consumer.pause',
					originator : originator
				}),
			stream);
	});

	consumer.on('resume', (originator) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event      : 'consumer.resume',
					originator : originator
				}),
			stream);
	});

	consumer.on('effectiveprofilechange', (profile) =>
	{
		emit(
			Object.assign({}, baseEvent,
				{
					event   : 'consumer.effectiveprofilechange',
					profile : profile
				}),
			stream);
	});
}

function emit(event, stream)
{
	// Add timestamp.
	event.timestamp = Date.now();

	const line = JSON.stringify(event);

	stream.write(line);
	stream.write('\n');
}

module.exports = homer;

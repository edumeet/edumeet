import * as mediasoupClient from 'mediasoup-client';
import domready from 'domready';
import Logger from '../lib/Logger';
const DATA = require('./DATA');

window.mediasoupClient = mediasoupClient;

const logger = new Logger();


const SEND = true;
const SEND_AUDIO = true;
const SEND_VIDEO = false;
const RECV = true;


domready(() =>
{
	logger.debug('DOM ready');

	run();
});

function run()
{
	logger.debug('run() [environment:%s]', process.env.NODE_ENV);

	let transport1;
	let transport2;
	let audioTrack;
	let videoTrack;
	let audioProducer1;
	let audioProducer2;
	let videoProducer;

	logger.debug('calling room = new mediasoupClient.Room()');

	// const room = new mediasoupClient.Room();
	const room = new mediasoupClient.Room(DATA.ROOM_OPTIONS);

	window.room = room;

	room.on('closed', (originator, appData) =>
	{
		logger.warn(
			'room "closed" event [originator:%s, appData:%o]', originator, appData);
	});

	room.on('request', (request, callback, errback) =>
	{
		logger.warn('sending request [method:%s]:%o', request.method, request);

		switch (request.method)
		{
			case 'queryRoom':
			{
				setTimeout(() =>
				{
					callback(DATA.QUERY_ROOM_RESPONSE);
					errback('upppps');
				}, 200);
				break;
			}

			case 'joinRoom':
			{
				setTimeout(() =>
				{
					callback(DATA.JOIN_ROOM_RESPONSE);
					// errback('upppps');
				}, 200);
				break;
			}

			case 'createTransport':
			{
				setTimeout(() =>
				{
					switch (request.appData)
					{
						case 'TRANSPORT_1':
							callback(DATA.CREATE_TRANSPORT_1_RESPONSE);
							break;
						case 'TRANSPORT_2':
							callback(DATA.CREATE_TRANSPORT_2_RESPONSE);
							break;
						default:
							errback('upppps');
					}
				}, 250);
				break;
			}

			case 'createProducer':
			{
				setTimeout(() =>
				{
					callback();
				}, 250);
				break;
			}

			case 'enableConsumer':
			{
				setTimeout(() =>
				{
					callback();
				}, 500);
				break;
			}

			default:
				errback(`NO IDEA ABOUT REQUEST METHOD "${request.method}"`);
		}
	});

	room.on('notify', (notification) =>
	{
		logger.warn(
			'sending notification [method:%s]:%o', notification.method, notification);

		switch (notification.method)
		{
			case 'leaveRoom':
			case 'updateTransport':
			case 'closeTransport':
			case 'closeProducer':
			case 'pauseProducer':
			case 'resumeProducer':
			case 'pauseConsumer':
			case 'resumeConsumer':
				break;

			default:
				logger.error(`NO IDEA ABOUT NOTIFICATION METHOD "${notification.method}"`);
		}
	});

	room.on('newpeer', (peer) =>
	{
		logger.warn('room "newpeer" event [name:"%s", peer:%o]', peer.name, peer);

		handlePeer(peer);
	});

	Promise.resolve()
		.then(() =>
		{
			logger.debug('calling room.join()');

			const deviceInfo = mediasoupClient.getDeviceInfo();
			const appData =
			{
				device : `${deviceInfo.name} ${deviceInfo.version}`
			};

			return room.join(null, appData);
			// return room.join(DATA.ROOM_RTP_CAPABILITIES, appData);
		})
		.then((peers) =>
		{
			if (!RECV)
				return;

			logger.debug('room.join() succeeded');

			logger.debug('calling transport2 = room.createTransport("recv")');

			transport2 = room.createTransport('recv', 'TRANSPORT_2');
			window.transport2 = transport2;
			window.pc2 = transport2._handler._pc;

			handleTransport(transport2);

			for (const peer of peers)
			{
				handlePeer(peer);
			}
		})
		.then(() =>
		{
			if (!SEND)
				return;

			if (room.canSend('audio'))
				logger.debug('can send audio');
			else
				logger.warn('cannot send audio');

			if (room.canSend('video'))
				logger.debug('can send video');
			else
				logger.warn('cannot send video');

			logger.debug('calling transport1 = room.createTransport("send")');

			transport1 = room.createTransport('send', 'TRANSPORT_1');
			window.transport1 = transport1;
			window.pc1 = transport1._handler._pc;

			handleTransport(transport1);

			logger.debug('calling getUserMedia()');

			return navigator.mediaDevices
				.getUserMedia({ audio: SEND_AUDIO, video: SEND_VIDEO });
		})
		.then((stream) =>
		{
			if (!SEND)
				return;

			audioTrack = stream.getAudioTracks()[0];
			videoTrack = stream.getVideoTracks()[0];
			window.audioTrack = audioTrack;
			window.videoTrack = videoTrack;
		})
		// Add Producers.
		.then(() =>
		{
			if (audioTrack)
			{
				const deviceId = audioTrack.getSettings().deviceId;

				logger.debug('calling audioProducer1 = room.createProducer(audioTrack)');

				try
				{
					audioProducer1 = room.createProducer(audioTrack, `${deviceId}-1`);
					window.audioProducer1 = audioProducer1;

					handleProducer(audioProducer1);
				}
				catch (error)
				{
					logger.error(error);
				}

				logger.debug('calling audioProducer2 = room.createProducer(audioTrack)');

				try
				{
					audioProducer2 = room.createProducer(audioTrack, `${deviceId}-2`);
					window.audioProducer2 = audioProducer2;

					handleProducer(audioProducer2);
				}
				catch (error)
				{
					logger.error(error);
				}
			}

			if (videoTrack)
			{
				const deviceId = videoTrack.getSettings().deviceId;

				logger.debug('calling videoProducer = room.createProducer(videoTrack)');

				try
				{
					videoProducer = room.createProducer(videoTrack, `${deviceId}-1`);
					window.videoProducer = videoProducer;

					handleProducer(videoProducer);
				}
				catch (error)
				{
					logger.error(error);
				}
			}
		})
		// Receive notifications.
		.then(() =>
		{
			if (!RECV)
				return;

			setTimeout(() =>
			{
				room.receiveNotification(DATA.ALICE_WEBCAM_NEW_CONSUMER_NOTIFICATION);
			}, 2000);
		});
}

function handleTransport(transport)
{
	logger.warn(
		'handleTransport() [direction:%s, appData:"%s", transport:%o]',
		transport.direction, transport.appData, transport);

	transport.on('closed', (originator, appData) =>
	{
		logger.warn(
			'transport "closed" event [originator:%s, appData:%o, transport:%o]',
			originator, appData, transport);
	});

	transport.on('connectionstatechange', (state) =>
	{
		logger.warn(
			'transport "connectionstatechange" event [direction:%s, state:%s, transport:%o]',
			transport.direction, state, transport);
	});

	setInterval(() =>
	{
		const queue = transport._commandQueue._queue;

		if (queue.length !== 0)
			logger.error('queue not empty [transport:%o, queue:%o]', transport, queue);
	}, 15000);
}

function handlePeer(peer)
{
	logger.warn('handlePeer() [name:"%s", peer:%o]', peer.name, peer);

	switch (peer.name)
	{
		case 'alice':
			window.alice = peer;
			break;
		case 'bob':
			window.bob = peer;
			break;
	}

	for (const consumer of peer.consumers)
	{
		handleConsumer(consumer);
	}

	peer.on('closed', (originator, appData) =>
	{
		logger.warn(
			'peer "closed" event [name:"%s", originator:%s, appData:%o]',
			peer.name, originator, appData);
	});

	peer.on('newconsumer', (consumer) =>
	{
		logger.warn(
			'peer "newconsumer" event [name:"%s", id:%s, consumer:%o]',
			peer.name, consumer.id, consumer);

		handleConsumer(consumer);
	});
}

function handleProducer(producer)
{
	const transport1 = window.transport1;

	logger.debug(
		'handleProducer() [id:"%s", appData:%o, producer:%o]',
		producer.id, producer.appData, producer);

	logger.debug('handleProducer() | calling transport1.send(producer)');

	transport1.send(producer)
		.then(() =>
		{
			logger.debug('transport1.send(producer) succeeded');
		})
		.catch((error) =>
		{
			logger.error('transport1.send(producer) failed: %o', error);
		});

	producer.on('closed', (originator, appData) =>
	{
		logger.warn(
			'producer "closed" event [id:%s, originator:%s, appData:%o, producer:%o]',
			producer.id, originator, appData, producer);
	});

	producer.on('paused', (originator, appData) =>
	{
		logger.warn(
			'producer "paused" event [id:%s, originator:%s, appData:%o, producer:%o]',
			producer.id, originator, appData, producer);
	});

	producer.on('resumed', (originator, appData) =>
	{
		logger.warn(
			'producer "resumed" event [id:%s, originator:%s, appData:%o, producer:%o]',
			producer.id, originator, appData, producer);
	});

	producer.on('unhandled', () =>
	{
		logger.warn(
			'producer "unhandled" event [id:%s, producer:%o]', producer.id, producer);
	});
}

function handleConsumer(consumer)
{
	const transport2 = window.transport2;

	logger.debug(
		'handleConsumer() [id:"%s", appData:%o, consumer:%o]',
		consumer.id, consumer.appData, consumer);

	switch (consumer.appData)
	{
		case 'ALICE_MIC':
			window.aliceAudioConsumer = consumer;
			break;
		case 'ALICE_WEBCAM':
			window.aliceVideoConsumer = consumer;
			break;
		case 'BOB_MIC':
			window.bobAudioConsumer = consumer;
			break;
	}

	logger.debug('handleConsumer() calling transport2.receive(consumer)');

	transport2.receive(consumer)
		.then((track) =>
		{
			logger.warn(
				'transport2.receive(consumer) succeeded [track:%o]', track);
		})
		.catch((error) =>
		{
			logger.error('transport2.receive() failed:%o', error);
		});

	consumer.on('closed', (originator, appData) =>
	{
		logger.warn(
			'consumer "closed" event [id:%s, originator:%s, appData:%o, consumer:%o]',
			consumer.id, originator, appData, consumer);
	});

	consumer.on('paused', (originator, appData) =>
	{
		logger.warn(
			'consumer "paused" event [id:%s, originator:%s, appData:%o, consumer:%o]',
			consumer.id, originator, appData, consumer);
	});

	consumer.on('resumed', (originator, appData) =>
	{
		logger.warn(
			'consumer "resumed" event [id:%s, originator:%s, appData:%o, consumer:%o]',
			consumer.id, originator, appData, consumer);
	});

	consumer.on('unhandled', () =>
	{
		logger.warn(
			'consumer "unhandled" event [id:%s, consumer:%o]', consumer.id, consumer);
	});
}


// NOTE: Trigger server notifications.

window.notifyRoomClosed = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'roomClosed',
		notification : true,
		appData      : 'ha cascao la room remota!!!'
	};

	room.receiveNotification(notification);
};

window.notifyTransportClosed = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'transportClosed',
		notification : true,
		id           : room.transports[0].id,
		appData      : 'admin closed your transport'
	};

	room.receiveNotification(notification);
};

window.notifyAudioProducer1Closed = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'producerClosed',
		notification : true,
		id           : window.audioProducer1.id,
		appData      : 'te paro el micro por la fuerza'
	};

	room.receiveNotification(notification);
};

window.notifyAudioProducer1Paused = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'producerPaused',
		notification : true,
		id           : window.audioProducer1.id,
		appData      : 'te pause el micro por la fuerza'
	};

	room.receiveNotification(notification);
};

window.notifyAudioProducer1Resumed = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'producerResumed',
		notification : true,
		id           : window.audioProducer1.id,
		appData      : 'te resumo el micro'
	};

	room.receiveNotification(notification);
};

window.notifyAlicePeerClosed = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'peerClosed',
		notification : true,
		name         : 'alice',
		appData      : 'peer left'
	};

	room.receiveNotification(notification);
};

window.notifyAliceAudioConsumerClosed = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'consumerClosed',
		notification : true,
		peerName     : 'alice',
		id           : 3333,
		appData      : 'mic broken'
	};

	room.receiveNotification(notification);
};

window.notifyAliceVideoConsumerClosed = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'consumerClosed',
		notification : true,
		peerName     : 'alice',
		id           : 4444,
		appData      : 'webcam broken'
	};

	room.receiveNotification(notification);
};

window.notifyAliceVideoConsumerPaused = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'consumerPaused',
		notification : true,
		peerName     : 'alice',
		id           : 4444,
		appData      : 'webcam paused'
	};

	room.receiveNotification(notification);
};

window.notifyAliceVideoConsumerResumed = function()
{
	const room = window.room;
	const notification =
	{
		method       : 'consumerResumed',
		notification : true,
		peerName     : 'alice',
		id           : 4444,
		appData      : 'webcam resumed'
	};

	room.receiveNotification(notification);
};


// NOTE: Test pause/resume.

window.testPauseResume = function()
{
	logger.debug('testPauseResume() with audioProducer1');

	const producer = window.audioProducer1;

	// producer.once('paused', () =>
	// {
	// 	producer.resume('I RESUME TO FUACK!!!');
	// });

	logger.debug('testPauseResume() | (1) calling producer.pause()');

	if (producer.pause('I PAUSE (1)'))
	{
		logger.warn(
			'testPauseResume() | (1) producer.pause() succeeded [locallyPaused:%s]',
			producer.locallyPaused);
	}
	else
	{
		logger.error(
			'testPauseResume() | (1) producer.pause() failed [locallyPaused:%s]',
			producer.locallyPaused);
	}

	logger.debug('testPauseResume() | (2) calling producer.pause()');

	if (producer.pause('I PAUSE (2)'))
	{
		logger.warn(
			'testPauseResume() | (2) producer.pause() succeeded [locallyPaused:%s]',
			producer.locallyPaused);
	}
	else
	{
		logger.error(
			'testPauseResume() | (2) producer.pause() failed [locallyPaused:%s]',
			producer.locallyPaused);
	}

	logger.debug('testPauseResume() | (3) calling producer.resume()');

	if (producer.resume('I RESUME (3)'))
	{
		logger.warn(
			'testPauseResume() | (3) producer.resume() succeeded [locallyPaused:%s]',
			producer.locallyPaused);
	}
	else
	{
		logger.error(
			'testPauseResume() | (3) producer.resume() failed [locallyPaused:%s]',
			producer.locallyPaused);
	}
};


// NOTE: For debugging.

window.dump1 = function()
{
	const transport1 = window.transport1;
	const pc1 = transport1._handler._pc;

	if (pc1 && pc1.localDescription)
		logger.warn('PC1 SEND LOCAL OFFER:\n%s', pc1.localDescription.sdp);

	if (pc1 && pc1.remoteDescription)
		logger.warn('PC1 SEND REMOTE ANSWER:\n%s', pc1.remoteDescription.sdp);
};

window.dump2 = function()
{
	const transport2 = window.transport2;
	const pc2 = transport2._handler._pc;

	if (pc2 && pc2.remoteDescription)
		logger.warn('PC2 RECV REMOTE OFFER:\n%s', pc2.remoteDescription.sdp);

	if (pc2 && pc2.localDescription)
		logger.warn('PC2 RECV LOCAL ANSWER:\n%s', pc2.localDescription.sdp);
};

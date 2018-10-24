'use strict';

const EventEmitter = require('events').EventEmitter;
const WebTorrent = require('webtorrent-hybrid');
const Logger = require('./Logger');
const config = require('../config');

const MAX_BITRATE = config.mediasoup.maxBitrate || 1000000;
const MIN_BITRATE = Math.min(50000, MAX_BITRATE);
const BITRATE_FACTOR = 0.75;

const logger = new Logger('Room');

const torrentClient = new WebTorrent({
	tracker : {
		rtcConfig : {
			iceServers : config.turnServers
		}
	}
});

class Room extends EventEmitter
{
	constructor(roomId, mediaServer, io)
	{
		logger.info('constructor() [roomId:"%s"]', roomId);

		super();
		this.setMaxListeners(Infinity);

		// Room ID.
		this._roomId = roomId;

		// Closed flag.
		this._closed = false;

		this._chatHistory = [];

		this._fileHistory = [];

		this._lastN = [];


		this._io = io;

		this._signalingPeers = new Map();

		try
		{
			// mediasoup Room instance.
			this._mediaRoom = mediaServer.Room(config.mediasoup.mediaCodecs);
		}
		catch (error)
		{
			this.close();

			throw error;
		}

		// Current max bitrate for all the participants.
		this._maxBitrate = MAX_BITRATE;

		// Current active speaker.
		// @type {mediasoup.Peer}
		this._currentActiveSpeaker = null;

		this._handleMediaRoom();
	}

	get id()
	{
		return this._roomId;
	}

	close()
	{
		logger.debug('close()');

		this._closed = true;

		// Close the signalingPeers
		if (this._signalingPeers)
			for (let peer of this._signalingPeers)
			{
				peer.socket.disconnect();
			};

		this._signalingPeers.clear();

		// Close the mediasoup Room.
		if (this._mediaRoom)
			this._mediaRoom.close();

		// Emit 'close' event.
		this.emit('close');
	}

	logStatus()
	{
		if (!this._mediaRoom)
			return;

		logger.info(
			'logStatus() [room id:"%s", peers:%s, mediasoup peers:%s]',
			this._roomId,
			this._signalingPeers.length,
			this._mediaRoom.peers.length);
	}

	handleConnection(peerName, socket)
	{
		logger.info('handleConnection() [peerName:"%s"]', peerName);

		if (this._signalingPeers.has(peerName))
		{
			logger.warn(
				'handleConnection() | there is already a peer with same peerName, ' +
				'closing the previous one [peerName:"%s"]',
				peerName);

			const signalingPeer = this._signalingPeers.get(peerName);

			signalingPeer.socket.disconnect();
			this._signalingPeers.delete(peerName);
		}

		const signalingPeer = { peerName : peerName, socket : socket };

		const index = this._lastN.indexOf(peerName);

		if (index === -1) // We don't have this peer, add to end
		{
			this._lastN.push(peerName);
		}

		this._handleSignalingPeer(signalingPeer);
	}

	_handleMediaRoom()
	{
		logger.debug('_handleMediaRoom()');

		const activeSpeakerDetector = this._mediaRoom.createActiveSpeakerDetector();

		activeSpeakerDetector.on('activespeakerchange', (activePeer) =>
		{
			if (activePeer)
			{
				logger.info('new active speaker [peerName:"%s"]', activePeer.name);

				this._currentActiveSpeaker = activePeer;

				const index = this._lastN.indexOf(activePeer.name);

				if (index > -1) // We have this speaker in the list, move to front
				{
					this._lastN.splice(index, 1);
					this._lastN = [activePeer.name].concat(this._lastN);
				}

				const activeVideoProducer = activePeer.producers
					.find((producer) => producer.kind === 'video');

				for (const peer of this._mediaRoom.peers)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.kind !== 'video')
							continue;

						if (consumer.source === activeVideoProducer)
						{
							consumer.setPreferredProfile('high');
						}
						else
						{
							consumer.setPreferredProfile('low');
						}
					}
				}
			}
			else
			{
				logger.info('no active speaker');

				this._currentActiveSpeaker = null;

				for (const peer of this._mediaRoom.peers)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.kind !== 'video')
							continue;

						consumer.setPreferredProfile('low');
					}
				}
			}

			this._io.to(this._roomId).emit('active-speaker', {
					peerName : activePeer ? activePeer.name : null
				});
		});
	}

	_handleSignalingPeer(signalingPeer)
	{
		logger.debug('_handleSignalingPeer() [peer:"%s"]', signalingPeer.id);

		signalingPeer.socket.on('mediasoup-request', (request, cb) =>
		{
			const mediasoupRequest = request;

			this._handleMediasoupClientRequest(
				signalingPeer, mediasoupRequest, cb);
		});

		signalingPeer.socket.on('mediasoup-notification', (request, cb) =>
		{
			// Return no error
			cb(null);

			const mediasoupNotification = request;

			this._handleMediasoupClientNotification(
				signalingPeer, mediasoupNotification);
		});

		signalingPeer.socket.on('change-display-name', (request, cb) =>
		{
			// Return no error
			cb(null);

			const { displayName } = request;
			const mediaPeer  = this._mediaRoom.getPeerByName(signalingPeer.peerName);
			const oldDisplayName = mediaPeer.appData.displayName;

			mediaPeer.appData.displayName = displayName;

			signalingPeer.socket.broadcast.to(this._roomId).emit(
				'display-name-changed',
				{
					peerName       : signalingPeer.peerName,
					displayName    : displayName,
					oldDisplayName : oldDisplayName
				}
			);
		});

		signalingPeer.socket.on('change-profile-picture', (request, cb) =>
		{
			// Return no error
			cb(null);

			signalingPeer.socket.broadcast.to(this._roomId).emit(
				'profile-picture-changed',
				{
					peerName : signalingPeer.peerName,
					picture  : request.picture
				}
			);
		});

		signalingPeer.socket.on('chat-message', (request, cb) =>
		{
			// Return no error
			cb(null);

			const { chatMessage } = request;

			this._chatHistory.push(chatMessage);

			// Spread to others
			signalingPeer.socket.broadcast.to(this._roomId).emit(
				'chat-message-receive',
				{
					peerName    : signalingPeer.peerName,
					chatMessage : chatMessage
				}
			);
		});

		signalingPeer.socket.on('server-history', (request, cb) =>
		{
			// Return to sender
			cb(
				null,
				{
					chatHistory : this._chatHistory,
					fileHistory : this._fileHistory,
					lastN       : this._lastN
				}
			);
		});

		signalingPeer.socket.on('send-file', (request, cb) =>
		{
			// Return no error
			cb(null);

			const fileData = request.file;

			this._fileHistory.push(fileData);

			if (!torrentClient.get(fileData.file.magnet))
			{
				torrentClient.add(fileData.file.magnet);
			}

			// Spread to others
			signalingPeer.socket.broadcast.to(this._roomId).emit(
				'file-receive',
				{
					file : fileData
				}
			);
		});

		signalingPeer.socket.on('raisehand-message', (request, cb) =>
		{
			// Return no error
			cb(null);

			const { raiseHandState } = request;
			const { mediaPeer } = signalingPeer;

			mediaPeer.appData.raiseHandState = request.raiseHandState;
			// Spread to others
			signalingPeer.socket.broadcast.to(this._roomId).emit(
				'raisehand-message',
				{
					peerName       : signalingPeer.peerName,
					raiseHandState : raiseHandState
				},
			);
		});

		signalingPeer.socket.on('disconnect', () =>
		{
			logger.debug('Peer "close" event [peer:"%s"]', signalingPeer.peerName);

			const mediaPeer  = this._mediaRoom.getPeerByName(signalingPeer.peerName);

			if (mediaPeer && !mediaPeer.closed)
				mediaPeer.close();

			const index = this._lastN.indexOf(signalingPeer.peerName);

			if (index > -1) // We have this peer in the list, remove
			{
				this._lastN.splice(index, 1);
			}

			// If this is the latest peer in the room, close the room.
			// However wait a bit (for reconnections).
			setTimeout(() =>
			{
				if (this._mediaRoom && this._mediaRoom.closed)
					return;

				if (this._mediaRoom.peers.length === 0)
				{
					logger.info(
						'last peer in the room left, closing the room [roomId:"%s"]',
						this._roomId);

					this.close();
				}
			}, 5000);
		});
	}

	_handleMediaPeer(signalingPeer, mediaPeer)
	{
		mediaPeer.on('notify', (notification) =>
		{
			signalingPeer.socket.emit('mediasoup-notification', notification);
		});

		mediaPeer.on('newtransport', (transport) =>
		{
			logger.info(
				'mediaPeer "newtransport" event [id:%s, direction:%s]',
				transport.id, transport.direction);

			// Update peers max sending  bitrate.
			if (transport.direction === 'send')
			{
				this._updateMaxBitrate();

				transport.on('close', () =>
				{
					this._updateMaxBitrate();
				});
			}

			this._handleMediaTransport(transport);
		});

		mediaPeer.on('newproducer', (producer) =>
		{
			logger.info('mediaPeer "newproducer" event [id:%s]', producer.id);

			this._handleMediaProducer(producer);
		});

		mediaPeer.on('newconsumer', (consumer) =>
		{
			logger.info('mediaPeer "newconsumer" event [id:%s]', consumer.id);

			this._handleMediaConsumer(consumer);
		});

		// Also handle already existing Consumers.
		for (const consumer of mediaPeer.consumers)
		{
			logger.info('mediaPeer existing "consumer" [id:%s]', consumer.id);

			this._handleMediaConsumer(consumer);
		}

		// Notify about the existing active speaker.
		if (this._currentActiveSpeaker)
		{
			signalingPeer.socket.emit(
				'active-speaker',
				{
					peerName : this._currentActiveSpeaker.name
				});
		}
	}

	_handleMediaTransport(transport)
	{
		transport.on('close', (originator) =>
		{
			logger.info(
				'Transport "close" event [originator:%s]', originator);
		});
	}

	_handleMediaProducer(producer)
	{
		producer.on('close', (originator) =>
		{
			logger.info(
				'Producer "close" event [originator:%s]', originator);
		});

		producer.on('pause', (originator) =>
		{
			logger.info(
				'Producer "pause" event [originator:%s]', originator);
		});

		producer.on('resume', (originator) =>
		{
			logger.info(
				'Producer "resume" event [originator:%s]', originator);
		});
	}

	_handleMediaConsumer(consumer)
	{
		consumer.on('close', (originator) =>
		{
			logger.info(
				'Consumer "close" event [originator:%s]', originator);
		});

		consumer.on('pause', (originator) =>
		{
			logger.info(
				'Consumer "pause" event [originator:%s]', originator);
		});

		consumer.on('resume', (originator) =>
		{
			logger.info(
				'Consumer "resume" event [originator:%s]', originator);
		});

		consumer.on('effectiveprofilechange', (profile) =>
		{
			logger.info(
				'Consumer "effectiveprofilechange" event [profile:%s]', profile);
		});

		// If video, initially make it 'low' profile unless this is for the current
		// active speaker.
		if (consumer.kind === 'video' && consumer.peer !== this._currentActiveSpeaker)
			consumer.setPreferredProfile('low');
	}

	_handleMediasoupClientRequest(signalingPeer, request, cb)
	{
		logger.debug(
			'mediasoup-client request [method:%s, peer:"%s"]',
			request.method, signalingPeer.peerName);

		switch (request.method)
		{
			case 'queryRoom':
			{
				this._mediaRoom.receiveRequest(request)
					.then((response) => cb(null, response))
					.catch((error) => cb(error.toString()));

				break;
			}

			case 'join':
			{
				// TODO: Handle appData. Yes?
				const { peerName } = request;

				if (peerName !== signalingPeer.peerName)
				{
					cb('that is not your corresponding mediasoup Peer name');

					break;
				}
				else if (signalingPeer.mediaPeer)
				{
					cb('already have a mediasoup Peer');

					break;
				}

				this._mediaRoom.receiveRequest(request)
					.then((response) =>
					{
						cb(null, response);

						// Get the newly created mediasoup Peer.
						const mediaPeer = this._mediaRoom.getPeerByName(peerName);

						signalingPeer.mediaPeer = mediaPeer;

						this._handleMediaPeer(signalingPeer, mediaPeer);
					})
					.catch((error) =>
					{
						cb(error.toString());
					});

				break;
			}

			default:
			{
				const { mediaPeer } = signalingPeer;

				if (!mediaPeer)
				{
					logger.error(
						'cannot handle mediasoup request, no mediasoup Peer [method:"%s"]',
						request.method);

					cb('no mediasoup Peer');
				}

				mediaPeer.receiveRequest(request)
					.then((response) => cb(null, response))
					.catch((error) => cb(error.toString()));
			}
		}
	}

	_handleMediasoupClientNotification(signalingPeer, notification)
	{
		logger.debug(
			'mediasoup-client notification [method:%s, peer:"%s"]',
			notification.method, signalingPeer.peerName);

		// NOTE: mediasoup-client just sends notifications with target 'peer',
		// so first of all, get the mediasoup Peer.
		const { mediaPeer } = signalingPeer;

		if (!mediaPeer)
		{
			logger.error(
				'cannot handle mediasoup notification, no mediasoup Peer [method:"%s"]',
				notification.method);

			return;
		}

		mediaPeer.receiveNotification(notification);
	}

	_updateMaxBitrate()
	{
		if (this._mediaRoom.closed)
			return;

		const numPeers = this._mediaRoom.peers.length;
		const previousMaxBitrate = this._maxBitrate;
		let newMaxBitrate;

		if (numPeers <= 2)
		{
			newMaxBitrate = MAX_BITRATE;
		}
		else
		{
			newMaxBitrate = Math.round(MAX_BITRATE / ((numPeers - 1) * BITRATE_FACTOR));

			if (newMaxBitrate < MIN_BITRATE)
				newMaxBitrate = MIN_BITRATE;
		}

		this._maxBitrate = newMaxBitrate;

		for (const peer of this._mediaRoom.peers)
		{
			for (const transport of peer.transports)
			{
				if (transport.direction === 'send')
				{
					transport.setMaxBitrate(newMaxBitrate)
						.catch((error) =>
						{
							logger.error('transport.setMaxBitrate() failed: %s', String(error));
						});
				}
			}
		}

		logger.info(
			'_updateMaxBitrate() [num peers:%s, before:%skbps, now:%skbps]',
			numPeers,
			Math.round(previousMaxBitrate / 1000),
			Math.round(newMaxBitrate / 1000));
	}
}

module.exports = Room;

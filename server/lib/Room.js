'use strict';

const EventEmitter = require('events').EventEmitter;
const Logger = require('./Logger');
const Lobby = require('./Lobby');
const config = require('../config/config');

const logger = new Logger('Room');

class Room extends EventEmitter
{
	/**
	 * Factory function that creates and returns Room instance.
	 *
	 * @async
	 *
	 * @param {mediasoup.Worker} mediasoupWorker - The mediasoup Worker in which a new
	 *   mediasoup Router must be created.
	 * @param {String} roomId - Id of the Room instance.
	 */
	static async create({ mediasoupWorker, roomId })
	{
		logger.info('create() [roomId:%s, forceH264:%s]', roomId);

		// Router media codecs.
		let mediaCodecs = config.mediasoup.router.mediaCodecs;

		// Create a mediasoup Router.
		const mediasoupRouter = await mediasoupWorker.createRouter({ mediaCodecs });

		// Create a mediasoup AudioLevelObserver.
		const audioLevelObserver = await mediasoupRouter.createAudioLevelObserver(
			{
				maxEntries : 1,
				threshold  : -80,
				interval   : 800
			});

		return new Room({ roomId, mediasoupRouter, audioLevelObserver });
	}

	constructor({ roomId, mediasoupRouter, audioLevelObserver })
	{
		logger.info('constructor() [roomId:"%s"]', roomId);

		super();
		this.setMaxListeners(Infinity);

		// Room ID.
		this._roomId = roomId;

		// Closed flag.
		this._closed = false;

		// Locked flag.
		this._locked = false;

		// if true: accessCode is a possibility to open the room
		this._joinByAccesCode = true;

		// access code to the room, applicable if ( _locked == true and _joinByAccessCode == true )
		this._accessCode = '';

		this._lobby = new Lobby();

		this._lobby.on('promotePeer', (peer) =>
		{
			logger.info('promotePeer() [peer:"%o"]', peer);

			const { peerId } = peer;

			this._peerJoining({ ...peer });

			Object.values(this._peers).forEach((peer) =>
			{
				this._notification(peer.socket, 'promotedPeer', { peerId });
			});
		});

		this._lobby.on('lobbyPeerDisplayNameChanged', (peer) =>
		{
			const { peerId, displayName } = peer;

			Object.values(this._peers).forEach((peer) =>
			{
				this._notification(peer.socket, 'lobbyPeerDisplayNameChanged', { peerId, displayName });
			});
		});

		this._lobby.on('peerClosed', (peer) =>
		{
			logger.info('peerClosed() [peer:"%o"]', peer);

			const { peerId } = peer;

			Object.values(this._peers).forEach((peer) =>
			{
				this._notification(peer.socket, 'lobbyPeerClosed', { peerId });
			});
		});

		this._chatHistory = [];

		this._fileHistory = [];

		this._lastN = [];

		this._peers = {};

		// mediasoup Router instance.
		// @type {mediasoup.Router}
		this._mediasoupRouter = mediasoupRouter;

		// mediasoup AudioLevelObserver.
		// @type {mediasoup.AudioLevelObserver}
		this._audioLevelObserver = audioLevelObserver;

		// Set audioLevelObserver events.
		this._audioLevelObserver.on('volumes', (volumes) =>
		{
			const { producer, volume } = volumes[0];

			// logger.debug(
			//	'audioLevelObserver "volumes" event [producerId:%s, volume:%s]',
			//	producer.id, volume);

			// Notify all Peers.
			Object.values(this._peers).forEach((peer) =>
			{
				this._notification(peer.socket, 'activeSpeaker', {
					peerId : producer.appData.peerId,
					volume : volume
				});
			});
		});

		this._audioLevelObserver.on('silence', () =>
		{
			// logger.debug('audioLevelObserver "silence" event');

			// Notify all Peers.
			Object.values(this._peers).forEach((peer) =>
			{
				this._notification(peer.socket, 'activeSpeaker', { peerId : null });
			});
		});

		// Current active speaker.
		// @type {mediasoup.Peer}
		this._currentActiveSpeaker = null;
	}

	get id()
	{
		return this._roomId;
	}

	close()
	{
		logger.debug('close()');

		this._closed = true;

		this._lobby.close();

		Object.values(this._peers).forEach((peer) =>
		{
			if (peer.socket)
				peer.socket.disconnect();
		});

		this._peers = {};

		// Close the mediasoup Router.
		this._mediasoupRouter.close();

		// Emit 'close' event.
		this.emit('close');
	}

	logStatus()
	{
		logger.info(
			'logStatus() [room id:"%s", peers:%o]',
			this._roomId,
			this._peers
		);
	}

	handleConnection({ peerId, consume, socket })
	{
		logger.info('handleConnection() [peerId:"%s"]', peerId);

		// This will allow reconnects to join despite lock
		if (this._peers[peerId])
		{
			logger.warn(
				'handleConnection() | there is already a peer with same peerId, ' +
				'closing the previous one [peerId:"%s"]',
				peerId);

			const peer = this._peers[peerId];

			peer.socket.disconnect();
			delete this._peers[peerId];
		}
		else if (this._locked) // Don't allow connections to a locked room
		{
			this._lobby.parkPeer({ peerId, consume, socket });

			Object.values(this._peers).forEach((peer) =>
			{
				this._notification(peer.socket, 'parkedPeer', { peerId });
			});

			return;
		}

		this._peerJoining({ peerId, consume, socket });
	}

	_peerJoining({ peerId, consume, socket })
	{
		socket.join(this._roomId);

		const peer = { id : peerId, socket : socket };

		const index = this._lastN.indexOf(peerId);

		if (index === -1) // We don't have this peer, add to end
		{
			this._lastN.push(peerId);
		}

		this._peers[peerId] = peer;

		this._handlePeer({ peer, consume });
		this._notification(socket, 'roomReady');
	}

	isLocked()
	{
		return this._locked;
	}

	peerAuthenticated(peerid)
	{
		logger.debug('peerAuthenticated() | [peerId:"%s"]', peerId);

		if (!this._locked)
		{
			if (!Boolean(this._peers[peerid]))
			{
				this._lobby.promotePeer(peerId);
			}
		}
	}

	_handlePeer({ peer, consume })
	{
		logger.debug('_handlePeer() [peer:"%s"]', peer.id);

		peer.data = {};

		// Not joined after a custom protoo 'join' request is later received.
		peer.data.consume = consume;
		peer.data.joined = false;
		peer.data.displayName = undefined;
		peer.data.device = undefined;
		peer.data.rtpCapabilities = undefined;
		peer.data.raiseHandState = false;

		// Have mediasoup related maps ready even before the Peer joins since we
		// allow creating Transports before joining.
		peer.data.transports = new Map();
		peer.data.producers = new Map();
		peer.data.consumers = new Map();

		peer.socket.on('request', (request, cb) =>
		{
			logger.debug(
				'Peer "request" event [method:%s, peerId:%s]',
				request.method, peer.id);

			this._handleSocketRequest(peer, request, cb)
				.catch((error) =>
				{
					logger.error('request failed:%o', error);

					cb(error);
				});
		});

		peer.socket.on('disconnect', () =>
		{
			if (this._closed)
				return;

			logger.debug('Peer "close" event [peerId:%s]', peer.id);

			// If the Peer was joined, notify all Peers.
			if (peer.data.joined)
			{
				this._notification(peer.socket, 'peerClosed', { peerId: peer.id }, true);
			}

			const index = this._lastN.indexOf(peer.id);

			if (index > -1) // We have this peer in the list, remove
			{
				this._lastN.splice(index, 1);
			}

			// Iterate and close all mediasoup Transport associated to this Peer, so all
			// its Producers and Consumers will also be closed.
			for (const transport of peer.data.transports.values())
			{
				transport.close();
			}

			delete this._peers[peer.id];

			// If this is the latest Peer in the room, close the room after a while.
			if (Object.keys(this._peers).length == 0)
			{
				setTimeout(() =>
				{
					if (this._closed)
						return;

					if (Object.keys(this._peers).length == 0)
					{
						logger.info(
							'last Peer in the room left, closing the room [roomId:%s]',
							this._roomId);

						this.close();
					}
				}, 10000);
			}
		});
	}

	async _handleSocketRequest(peer, request, cb)
	{
		switch (request.method)
		{

			case 'getRouterRtpCapabilities':
			{
				cb(null, this._mediasoupRouter.rtpCapabilities);

				break;
			}

			case 'join':
			{
				// Ensure the Peer is not already joined.
				if (peer.data.joined)
					throw new Error('Peer already joined');

				const {
					displayName,
					picture,
					device,
					rtpCapabilities
				} = request.data;

				// Store client data into the protoo Peer data object.
				peer.data.displayName = displayName;
				peer.data.picture = picture;
				peer.data.device = device;
				peer.data.rtpCapabilities = rtpCapabilities;

				// Tell the new Peer about already joined Peers.
				// And also create Consumers for existing Producers.

				const peerInfos = [];

				Object.values(this._peers).forEach((joinedPeer) =>
				{
					if (joinedPeer.data.joined)
					{
						peerInfos.push(
							{
								id          : joinedPeer.id,
								displayName : joinedPeer.data.displayName,
								picture     : joinedPeer.data.picture,
								device      : joinedPeer.data.device
							});
	
						for (const producer of joinedPeer.data.producers.values())
						{
							this._createConsumer(
								{
									consumerPeer : peer,
									producerPeer : joinedPeer,
									producer
								});
						}
					}
				});

				cb(null, { peers: peerInfos });

				// Mark the new Peer as joined.
				peer.data.joined = true;

				this._notification(
					peer.socket,
					'newPeer',
					{
						id          : peer.id,
						displayName : displayName,
						picture     : picture,
						device      : device
					},
					true
				);

				logger.debug(
					'peer joined [peeerId: %s, displayName: %s, picture: %s, device: %o]',
					peer.id, displayName, picture, device);

				break;
			}

			case 'createWebRtcTransport':
			{
				// NOTE: Don't require that the Peer is joined here, so the client can
				// initiate mediasoup Transports and be ready when he later joins.

				const { forceTcp, producing, consuming } = request.data;
				const {
					maxIncomingBitrate,
					initialAvailableOutgoingBitrate
				} = config.mediasoup.webRtcTransport;

				const transport = await this._mediasoupRouter.createWebRtcTransport(
					{
						listenIps : config.mediasoup.webRtcTransport.listenIps,
						enableUdp : !forceTcp,
						enableTcp : true,
						preferUdp : true,
						initialAvailableOutgoingBitrate,
						appData   : { producing, consuming }
					});

				// Store the WebRtcTransport into the protoo Peer data Object.
				peer.data.transports.set(transport.id, transport);

				cb(
					null,
					{
						id             : transport.id,
						iceParameters  : transport.iceParameters,
						iceCandidates  : transport.iceCandidates,
						dtlsParameters : transport.dtlsParameters
					});

				// If set, apply max incoming bitrate limit.
				if (maxIncomingBitrate)
				{
					try { await transport.setMaxIncomingBitrate(maxIncomingBitrate); }
					catch (error) {}
				}

				break;
			}

			case 'connectWebRtcTransport':
			{
				const { transportId, dtlsParameters } = request.data;
				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				await transport.connect({ dtlsParameters });

				cb();

				break;
			}

			case 'restartIce':
			{
				const { transportId } = request.data;
				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				const iceParameters = await transport.restartIce();

				cb(null, iceParameters);

				break;
			}

			case 'produce':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { transportId, kind, rtpParameters } = request.data;
				let { appData } = request.data;
				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				// Add peerId into appData to later get the associated Peer during
				// the 'loudest' event of the audioLevelObserver.
				appData = { ...appData, peerId: peer.id };

				const producer =
					await transport.produce({ kind, rtpParameters, appData });

				// Store the Producer into the protoo Peer data Object.
				peer.data.producers.set(producer.id, producer);

				// Set Producer events.
				producer.on('score', (score) =>
				{
					// logger.debug(
					// 	'producer "score" event [producerId:%s, score:%o]',
					// 	producer.id, score);

					this._notification(peer.socket, 'producerScore', { producerId: producer.id, score });
				});

				producer.on('videoorientationchange', (videoOrientation) =>
				{
					logger.debug(
						'producer "videoorientationchange" event [producerId:%s, videoOrientation:%o]',
						producer.id, videoOrientation);
				});

				cb(null, { id: producer.id });

				Object.values(this._peers).forEach((otherPeer) =>
				{
					if (otherPeer.data.joined && otherPeer !== peer)
					{
						this._createConsumer(
							{
								consumerPeer : otherPeer,
								producerPeer : peer,
								producer
							});
					}
				});

				// Add into the audioLevelObserver.
				if (kind === 'audio')
				{
					this._audioLevelObserver.addProducer({ producerId: producer.id })
						.catch(() => {});
				}

				break;
			}

			case 'closeProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				producer.close();

				// Remove from its map.
				peer.data.producers.delete(producer.id);

				cb();

				break;
			}

			case 'pauseProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				await producer.pause();

				cb();

				break;
			}

			case 'resumeProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				await producer.resume();

				cb();

				break;
			}

			case 'pauseConsumer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.pause();

				cb();

				break;
			}

			case 'resumeConsumer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.resume();

				cb();

				break;
			}

			case 'setConsumerPreferedLayers':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId, spatialLayer, temporalLayer } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.setPreferredLayers({ spatialLayer, temporalLayer });

				cb();

				break;
			}

			case 'requestConsumerKeyFrame':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.requestKeyFrame();

				cb();

				break;
			}

			case 'getTransportStats':
			{
				const { transportId } = request.data;
				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				const stats = await transport.getStats();

				cb(null, stats);

				break;
			}

			case 'getProducerStats':
			{
				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				const stats = await producer.getStats();

				cb(null, stats);

				break;
			}

			case 'getConsumerStats':
			{
				const { consumerId } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				const stats = await consumer.getStats();

				cb(null, stats);

				break;
			}

			case 'changeDisplayName':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { displayName } = request.data;
				const oldDisplayName = peer.data.displayName;

				peer.data.displayName = displayName;

				// Spread to others
				this._notification(peer.socket, 'changeDisplayName', {
					peerId         : peer.id,
					displayName    : displayName,
					oldDisplayName : oldDisplayName
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'changeProfilePicture':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { picture } = request.data;

				// Spread to others
				this._notification(peer.socket, 'changeProfilePicture', {
					peerId  : peer.id,
					picture : picture
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'chatMessage':
			{
				const { chatMessage } = request.data;
	
				this._chatHistory.push(chatMessage);

				// Spread to others
				this._notification(peer.socket, 'chatMessage', {
					peerId      : peer.id,
					chatMessage : chatMessage
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'serverHistory':
			{
				// Return to sender
				const lobbyPeers = this._lobby.peerList();
				cb(
					null,
					{
						chatHistory : this._chatHistory,
						fileHistory : this._fileHistory,
						lastN       : this._lastN,
						locked      : this._locked,
						lobbyPeers  : lobbyPeers,
						accessCode  : this._accessCode
					}
				);

				break;
			}

			case 'lockRoom':
			{
				this._locked = true;

				// Spread to others
				this._notification(peer.socket, 'lockRoom', {
					peerId : peer.id
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'unlockRoom':
			{
				this._locked = false;

				// Spread to others
				this._notification(peer.socket, 'unlockRoom', {
					peerId : peer.id
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'setAccessCode':
			{
				const { accessCode } = request.data;
	
				this._accessCode = accessCode;

				// Spread to others
				// if (request.public) {
				this._notification(peer.socket, 'setAccessCode', {
					peerId     : peer.id,
					accessCode : accessCode
				}, true);
				//}

				// Return no error
				cb();

				break;
			}

			case 'setJoinByAccessCode':
			{
				const { joinByAccessCode } = request.data;
	
				this._joinByAccessCode = joinByAccessCode;

				// Spread to others
				this._notification(peer.socket, 'setJoinByAccessCode', {
					peerId     : peer.id,
					joinByAccessCode : joinByAccessCode
				}, true);

				// Return no error
				cb();

				break;
			}
	

			case 'promotePeer':
			{
				const { peerId } = request.data;

				this._lobby.promotePeer(peerId);

				// Return no error
				cb();

				break;
			}

			case 'promoteAllPeers':
			{
				this._lobby.promoteAllPeers();

				// Return no error
				cb();

				break;
			}

			case 'sendFile':
			{
				const { magnetUri } = request.data;
	
				this._fileHistory.push({ peerId: peer.id, magnetUri: magnetUri });

				// Spread to others
				this._notification(peer.socket, 'sendFile', {
					peerId    : peer.id,
					magnetUri : magnetUri
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'raiseHand':
			{
				const { raiseHandState } = request.data;

				peer.data.raiseHandState = raiseHandState;

				// Spread to others
				this._notification(peer.socket, 'raiseHand', {
					peerId         : peer.id,
					raiseHandState : raiseHandState
				}, true);

				// Return no error
				cb();

				break;
			}

			default:
			{
				logger.error('unknown request.method "%s"', request.method);

				cb(500, `unknown request.method "${request.method}"`);
			}
		}
	}

	/**
	 * Creates a mediasoup Consumer for the given mediasoup Producer.
	 *
	 * @async
	 */
	async _createConsumer({ consumerPeer, producerPeer, producer })
	{
		// Optimization:
		// - Create the server-side Consumer. If video, do it paused.
		// - Tell its Peer about it and wait for its response.
		// - Upon receipt of the response, resume the server-side Consumer.
		// - If video, this will mean a single key frame requested by the
		//   server-side Consumer (when resuming it).

		// NOTE: Don't create the Consumer if the remote Peer cannot consume it.
		if (
			!consumerPeer.data.rtpCapabilities ||
			!this._mediasoupRouter.canConsume(
				{
					producerId      : producer.id,
					rtpCapabilities : consumerPeer.data.rtpCapabilities
				})
		)
		{
			return;
		}

		// Must take the Transport the remote Peer is using for consuming.
		const transport = Array.from(consumerPeer.data.transports.values())
			.find((t) => t.appData.consuming);

		// This should not happen.
		if (!transport)
		{
			logger.warn('_createConsumer() | Transport for consuming not found');

			return;
		}

		// Create the Consumer in paused mode.
		let consumer;

		try
		{
			consumer = await transport.consume(
				{
					producerId      : producer.id,
					rtpCapabilities : consumerPeer.data.rtpCapabilities,
					paused          : producer.kind === 'video'
				});
		}
		catch (error)
		{
			logger.warn('_createConsumer() | transport.consume():%o', error);

			return;
		}

		// Store the Consumer into the protoo consumerPeer data Object.
		consumerPeer.data.consumers.set(consumer.id, consumer);

		// Set Consumer events.
		consumer.on('transportclose', () =>
		{
			// Remove from its map.
			consumerPeer.data.consumers.delete(consumer.id);
		});

		consumer.on('producerclose', () =>
		{
			// Remove from its map.
			consumerPeer.data.consumers.delete(consumer.id);

			this._notification(consumerPeer.socket, 'consumerClosed', { consumerId: consumer.id });
		});

		consumer.on('producerpause', () =>
		{
			this._notification(consumerPeer.socket, 'consumerPaused', { consumerId: consumer.id });
		});

		consumer.on('producerresume', () =>
		{
			this._notification(consumerPeer.socket, 'consumerResumed', { consumerId: consumer.id });
		});

		consumer.on('score', (score) =>
		{
			// logger.debug(
			// 	'consumer "score" event [consumerId:%s, score:%o]',
			// 	consumer.id, score);

			this._notification(consumerPeer.socket, 'consumerScore', { consumerId: consumer.id, score });
		});

		consumer.on('layerschange', (layers) =>
		{
			this._notification(
				consumerPeer.socket,
				'consumerLayersChanged',
				{
					consumerId    : consumer.id,
					spatialLayer  : layers ? layers.spatialLayer : null,
					temporalLayer : layers ? layers.temporalLayer : null
				}
			);
		});

		// Send a protoo request to the remote Peer with Consumer parameters.
		try
		{
			await this._request(
				consumerPeer.socket,
				'newConsumer',
				{
					peerId         : producerPeer.id,
					kind           : producer.kind,
					producerId     : producer.id,
					id             : consumer.id,
					kind           : consumer.kind,
					rtpParameters  : consumer.rtpParameters,
					type           : consumer.type,
					appData        : producer.appData,
					producerPaused : consumer.producerPaused
				}
			);

			// Now that we got the positive response from the remote Peer and, if
			// video, resume the Consumer to ask for an efficient key frame.
			if (producer.kind === 'video')
				await consumer.resume();

			this._notification(
				consumerPeer.socket,
				'consumerScore',
				{
					consumerId : consumer.id,
					score      : consumer.score
				}
			);
		}
		catch (error)
		{
			logger.warn('_createConsumer() | failed:%o', error);
		}
	}

	_timeoutCallback(callback)
	{
		let called = false;

		const interval = setTimeout(
			() =>
			{
				if (called)
					return;
				called = true;
				callback(new Error('Request timeout.'));
			},
			10000
		);

		return (...args) =>
		{
			if (called)
				return;
			called = true;
			clearTimeout(interval);

			callback(...args);
		};
	}

	_request(socket, method, data = {})
	{
		return new Promise((resolve, reject) =>
		{
			socket.emit(
				'request',
				{ method, data },
				this._timeoutCallback((err, response) =>
				{
					if (err)
					{
						reject(err);
					}
					else
					{
						resolve(response);
					}
				})
			);
		});
	}

	_notification(socket, method, data = {}, broadcast = false)
	{
		if (broadcast)
		{
			socket.broadcast.to(this._roomId).emit(
				'notification', { method, data }
			);
		}
		else
		{
			socket.emit('notification', { method, data });
		}
	}
}

module.exports = Room;

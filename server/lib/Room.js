'use strict';

const EventEmitter = require('events').EventEmitter;
const protooServer = require('protoo-server');
const webrtc = require('mediasoup').webrtc;
const logger = require('./logger')('Room');
const config = require('../config');

const MAX_BITRATE = config.mediasoup.maxBitrate || 3000000;
const MIN_BITRATE = Math.min(50000 || MAX_BITRATE);
const BITRATE_FACTOR = 0.75;
const MIN_AUDIO_LEVEL = -50;

class Room extends EventEmitter
{
	constructor(roomId, mediaServer)
	{
		logger.log('constructor() [roomId:"%s"]', roomId);

		super();
		this.setMaxListeners(Infinity);

		// Room ID.
		this._roomId = roomId;
		// Protoo Room instance.
		this._protooRoom = new protooServer.Room();
		// mediasoup Room instance.
		this._mediaRoom = null;
		// Pending peers (this is because at the time we get the first peer, the
		// mediasoup room does not yet exist).
		this._pendingProtooPeers = [];
		// Current max bitrate for all the participants.
		this._maxBitrate = MAX_BITRATE;
		// Current active speaker mediasoup Peer.
		this._activeSpeaker = null;

		// Create a mediasoup room.
		mediaServer.createRoom(
			{
				mediaCodecs : config.mediasoup.roomCodecs
			})
			.then((room) =>
			{
				logger.debug('mediasoup room created');

				this._mediaRoom = room;

				process.nextTick(() =>
				{
					this._mediaRoom.on('newpeer', (peer) =>
					{
						this._updateMaxBitrate();

						peer.on('close', () =>
						{
							this._updateMaxBitrate();
						});
					});

					// TODO: FIX?
					this._mediaRoom.on('audiolevels', (entries) =>
					{
						logger.debug('room "audiolevels" event');

						for (let entry of entries)
						{
							logger.debug('- [peer name:%s, rtpReceiver.id:%s, audio level:%s]',
								entry.peer.name, entry.rtpReceiver.id, entry.audioLevel);
						}

						let activeSpeaker;
						let activeLevel;

						if (entries.length > 0)
						{
							activeSpeaker = entries[0].peer;
							activeLevel = entries[0].audioLevel;

							if (activeLevel < MIN_AUDIO_LEVEL)
							{
								activeSpeaker = null;
								activeLevel = undefined;
							}
						}
						else
						{
							activeSpeaker = null;
						}

						if (this._activeSpeaker !== activeSpeaker)
						{
							let data = {};

							if (activeSpeaker)
							{
								logger.debug('active speaker [peer:"%s", volume:%s]',
									activeSpeaker.name, activeLevel);

								data.peer = { id: activeSpeaker.name };
								data.level = activeLevel;
							}
							else
							{
								logger.debug('no current speaker');

								data.peer = null;
							}

							this._protooRoom.spread('activespeaker', data);
						}

						this._activeSpeaker = activeSpeaker;
					});
				});

				// Run all the pending join requests.
				for (let protooPeer of this._pendingProtooPeers)
				{
					this._handleProtooPeer(protooPeer);
				}
			});
	}

	get id()
	{
		return this._roomId;
	}

	close()
	{
		logger.debug('close()');

		// Close the protoo Room.
		this._protooRoom.close();

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

		logger.log(
			'logStatus() [room id:"%s", protoo peers:%s, mediasoup peers:%s]',
			this._roomId,
			this._protooRoom.peers.length,
			this._mediaRoom.peers.length);
	}

	createProtooPeer(peerId, transport)
	{
		logger.log('createProtooPeer() [peerId:"%s"]', peerId);

		if (this._protooRoom.hasPeer(peerId))
		{
			logger.warn('createProtooPeer() | there is already a peer with same peerId, closing the previous one [peerId:"%s"]', peerId);

			let protooPeer = this._protooRoom.getPeer(peerId);

			protooPeer.close();
		}

		return this._protooRoom.createPeer(peerId, transport)
			.then((protooPeer) =>
			{
				if (this._mediaRoom)
					this._handleProtooPeer(protooPeer);
				else
					this._pendingProtooPeers.push(protooPeer);
			});
	}

	_handleProtooPeer(protooPeer)
	{
		logger.debug('_handleProtooPeer() [peerId:"%s"]', protooPeer.id);

		let mediaPeer = this._mediaRoom.Peer(protooPeer.id);
		let peerconnection;

		protooPeer.data.msids = [];

		protooPeer.on('close', () =>
		{
			logger.debug('protoo Peer "close" event [peerId:"%s"]', protooPeer.id);

			this._protooRoom.spread(
				'removepeer',
				{
					peer :
					{
						id    : protooPeer.id,
						msids : protooPeer.data.msids
					}
				});

			// Close the media stuff.
			if (peerconnection)
				peerconnection.close();
			else
				mediaPeer.close();

			// If this is the latest peer in the room, close the room.
			// However, wait a bit (for reconnections).
			setTimeout(() =>
			{
				if (this._mediaRoom && this._mediaRoom.closed)
					return;

				if (this._protooRoom.peers.length === 0)
				{
					logger.log(
						'last peer in the room left, closing the room [roomId:"%s"]',
						this._roomId);

					this.close();
				}
			}, 10000);
		});

		Promise.resolve()
			// Send 'join' request to the new peer.
			.then(() =>
			{
				return protooPeer.send(
					'joinme',
					{
						peerId : protooPeer.id,
						roomId : this.id
					});
			})
			// Create a RTCPeerConnection instance and set media capabilities.
			.then((data) =>
			{
				peerconnection = new webrtc.RTCPeerConnection(
					{
						peer             : mediaPeer,
						usePlanB         : !!data.usePlanB,
						transportOptions : config.mediasoup.peerTransport,
						maxBitrate       : this._maxBitrate
					});

				// Store the RTCPeerConnection instance within the protoo Peer.
				protooPeer.data.peerconnection = peerconnection;

				mediaPeer.on('newtransport', (transport) =>
				{
					transport.on('iceselectedtuplechange', (data) =>
					{
						logger.log('"iceselectedtuplechange" event [peerId:"%s", protocol:%s, remoteIP:%s, remotePort:%s]',
							protooPeer.id, data.protocol, data.remoteIP, data.remotePort);
					});
				});

				// Set RTCPeerConnection capabilities.
				return peerconnection.setCapabilities(data.capabilities);
			})
			// Send 'peers' request for the new peer to know about the existing peers.
			.then(() =>
			{
				return protooPeer.send(
					'peers',
					{
						peers : this._protooRoom.peers
							// Filter this protoo Peer.
							.filter((peer) =>
							{
								return peer !== protooPeer;
							})
							.map((peer) =>
							{
								return {
									id    : peer.id,
									msids : peer.data.msids
								};
							})
					});
			})
			// Tell all the other peers about the new peer.
			.then(() =>
			{
				this._protooRoom.spread(
					'addpeer',
					{
						peer :
						{
							id    : protooPeer.id,
							msids : protooPeer.data.msids
						}
					},
					[ protooPeer ]);
			})
			.then(() =>
			{
				// Send initial SDP offer.
				return this._sendOffer(protooPeer,
					{
						offerToReceiveAudio : 1,
						offerToReceiveVideo : 1
					});
			})
			.then(() =>
			{
				// Handle PeerConnection events.
				peerconnection.on('negotiationneeded', () =>
				{
					logger.debug('"negotiationneeded" event [peerId:"%s"]', protooPeer.id);

					// Send SDP re-offer.
					this._sendOffer(protooPeer);
				});

				peerconnection.on('signalingstatechange', () =>
				{
					logger.debug('"signalingstatechange" event [peerId:"%s", signalingState:%s]',
						protooPeer.id, peerconnection.signalingState);
				});
			})
			.then(() =>
			{
				protooPeer.on('request', (request, accept, reject) =>
				{
					logger.debug('protoo Peer "request" event [method:%s]', request.method);

					switch(request.method)
					{
						case 'reofferme':
						{
							accept();
							this._sendOffer(protooPeer);

							break;
						}

						case 'restartice':
						{
							peerconnection.restartIce()
								.then(() =>
								{
									accept();
								})
								.catch((error) =>
								{
									logger.error('"restartice" request failed: %s', error);
									logger.error('stack:\n' + error.stack);

									reject(500, `"restartice" failed: ${error.message}`);
								});

							break;
						}

						case 'disableremotevideo':
						{
							let videoMsid = request.data.msid;
							let disable = request.data.disable;
							let videoRtpSender;

							for (let rtpSender of mediaPeer.rtpSenders)
							{
								if (rtpSender.kind !== 'video')
									continue;

								let msid = rtpSender.rtpParameters.userParameters.msid.split(/\s/)[0];

								if (msid === videoMsid)
								{
									videoRtpSender = rtpSender;
									break;
								}
							}

							if (videoRtpSender)
							{
								return Promise.resolve()
									.then(() =>
									{
										if (disable)
											return videoRtpSender.disable({ emit: false });
										else
											return videoRtpSender.enable({ emit: false });
									})
									.then(() =>
									{
										logger.log('"disableremotevideo" request succeed [disable:%s]',
											!!disable);

										accept();
									})
									.catch((error) =>
									{
										logger.error('"disableremotevideo" request failed: %s', error);
										logger.error('stack:\n' + error.stack);

										reject(500, `"disableremotevideo" failed: ${error.message}`);
									});
							}
							else
							{
								reject(404, 'msid not found');
							}

							break;
						}

						default:
						{
							logger.error('unknown method');

							reject(404, 'unknown method');
						}
					}
				});
			})
			.catch((error) =>
			{
				logger.error('_handleProtooPeer() failed: %s', error.message);
				logger.error('stack:\n' + error.stack);

				protooPeer.close();
			});
	}

	_sendOffer(protooPeer, options)
	{
		logger.debug('_sendOffer() [peerId:"%s"]', protooPeer.id);

		let peerconnection = protooPeer.data.peerconnection;
		let mediaPeer = peerconnection.peer;

		return Promise.resolve()
			.then(() =>
			{
				return peerconnection.createOffer(options);
			})
			.then((desc) =>
			{
				return peerconnection.setLocalDescription(desc);
			})
			// Send the SDP offer to the peer.
			.then(() =>
			{
				return protooPeer.send(
					'offer',
					{
						offer : peerconnection.localDescription.serialize()
					});
			})
			// Process the SDP answer from the peer.
			.then((data) =>
			{
				let answer = data.answer;

				return peerconnection.setRemoteDescription(answer);
			})
			.then(() =>
			{
				let oldMsids = protooPeer.data.msids;

				// Reset peer's msids.
				protooPeer.data.msids = [];

				let setMsids = new Set();

				// Update peer's msids information.
				for (let rtpReceiver of mediaPeer.rtpReceivers)
				{
					let msid = rtpReceiver.rtpParameters.userParameters.msid.split(/\s/)[0];

					setMsids.add(msid);
				}

				protooPeer.data.msids = Array.from(setMsids);

				// If msids changed, notify.
				let sameValues = (
					oldMsids.length == protooPeer.data.msids.length) &&
					oldMsids.every((element, index) =>
					{
						return element === protooPeer.data.msids[index];
					});

				if (!sameValues)
				{
					this._protooRoom.spread(
						'updatepeer',
						{
							peer :
							{
								id    : protooPeer.id,
								msids : protooPeer.data.msids
							}
						},
						[ protooPeer ]);
				}
			})
			.catch((error) =>
			{
				logger.error('_sendOffer() failed: %s', error);
				logger.error('stack:\n' + error.stack);

				logger.warn('resetting peerconnection');
				peerconnection.reset();
			});
	}

	_updateMaxBitrate()
	{
		if (this._mediaRoom.closed)
			return;

		let numPeers = this._mediaRoom.peers.length;
		let previousMaxBitrate = this._maxBitrate;
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

		if (newMaxBitrate === previousMaxBitrate)
			return;

		for (let peer of this._mediaRoom.peers)
		{
			if (!peer.capabilities || peer.closed)
				continue;

			for (let transport of peer.transports)
			{
				if (transport.closed)
					continue;

				transport.setMaxBitrate(newMaxBitrate);
			}
		}

		logger.log('_updateMaxBitrate() [num peers:%s, before:%skbps, now:%skbps]',
			numPeers,
			Math.round(previousMaxBitrate / 1000),
			Math.round(newMaxBitrate / 1000));

		this._maxBitrate = newMaxBitrate;
	}
}

module.exports = Room;

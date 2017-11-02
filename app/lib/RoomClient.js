import protooClient from 'protoo-client';
import * as mediasoupClient from 'mediasoup-client';
import Logger from './Logger';
import { getProtooUrl } from './urlFactory';
import * as cookiesManager from './cookiesManager';
import * as requestActions from './redux/requestActions';
import * as stateActions from './redux/stateActions';

const logger = new Logger('RoomClient');

const ROOM_OPTIONS =
{
	requestTimeout   : 10000,
	transportOptions :
	{
		tcp : false
	}
};

const VIDEO_CONSTRAINS =
{
	qvga : { width: { ideal: 320 }, height: { ideal: 240 } },
	vga  : { width: { ideal: 640 }, height: { ideal: 480 } },
	hd   : { width: { ideal: 1280 }, height: { ideal: 720 } }
};

export default class RoomClient
{
	constructor(
		{ roomId, peerName, displayName, device, useSimulcast, produce, dispatch, getState })
	{
		logger.debug(
			'constructor() [roomId:"%s", peerName:"%s", displayName:"%s", device:%s]',
			roomId, peerName, displayName, device.flag);

		const protooUrl = getProtooUrl(peerName, roomId);
		const protooTransport = new protooClient.WebSocketTransport(protooUrl);

		// Closed flag.
		this._closed = false;

		// Whether we should produce.
		this._produce = produce;

		// Whether simulcast should be used.
		this._useSimulcast = useSimulcast;

		// Redux store dispatch function.
		this._dispatch = dispatch;

		// Redux store getState function.
		this._getState = getState;

		// My peer name.
		this._peerName = peerName;

		// protoo-client Peer instance.
		this._protoo = new protooClient.Peer(protooTransport);

		// mediasoup-client Room instance.
		this._room = new mediasoupClient.Room(ROOM_OPTIONS);

		// Transport for sending.
		this._sendTransport = null;

		// Transport for receiving.
		this._recvTransport = null;

		// Local mic mediasoup Producer.
		this._micProducer = null;

		// Local webcam mediasoup Producer.
		this._webcamProducer = null;

		// Map of webcam MediaDeviceInfos indexed by deviceId.
		// @type {Map<String, MediaDeviceInfos>}
		this._webcams = new Map();

		// Local Webcam. Object with:
		// - {MediaDeviceInfo} [device]
		// - {String} [resolution] - 'qvga' / 'vga' / 'hd'.
		this._webcam =
		{
			device     : null,
			resolution : 'hd'
		};

		this._join({ displayName, device });
	}

	close()
	{
		if (this._closed)
			return;

		this._closed = true;

		logger.debug('close()');

		// Leave the mediasoup Room.
		this._room.leave();

		// Close protoo Peer (wait a bit so mediasoup-client can send
		// the 'leaveRoom' notification).
		setTimeout(() => this._protoo.close(), 250);

		this._dispatch(stateActions.setRoomState('closed'));
	}

	changeDisplayName(displayName)
	{
		logger.debug('changeDisplayName() [displayName:"%s"]', displayName);

		// Store in cookie.
		cookiesManager.setUser({ displayName });

		return this._protoo.send('change-display-name', { displayName })
			.then(() =>
			{
				this._dispatch(
					stateActions.setDisplayName(displayName));

				this._dispatch(requestActions.notify(
					{
						text : 'Display name changed'
					}));
			})
			.catch((error) =>
			{
				logger.error('changeDisplayName() | failed: %o', error);

				this._dispatch(requestActions.notify(
					{
						type : 'error',
						text : `Could not change display name: ${error}`
					}));

				// We need to refresh the component for it to render the previous
				// displayName again.
				this._dispatch(stateActions.setDisplayName());
			});
	}

	muteMic()
	{
		logger.debug('muteMic()');

		this._micProducer.pause();
	}

	unmuteMic()
	{
		logger.debug('unmuteMic()');

		this._micProducer.resume();
	}

	enableWebcam()
	{
		logger.debug('enableWebcam()');

		// Store in cookie.
		cookiesManager.setDevices({ webcamEnabled: true });

		this._dispatch(
			stateActions.setWebcamInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				return this._updateWebcams();
			})
			.then(() =>
			{
				return this._setWebcamProducer();
			})
			.then(() =>
			{
				this._dispatch(
					stateActions.setWebcamInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('enableWebcam() | failed: %o', error);

				this._dispatch(
					stateActions.setWebcamInProgress(false));
			});
	}

	disableWebcam()
	{
		logger.debug('disableWebcam()');

		// Store in cookie.
		cookiesManager.setDevices({ webcamEnabled: false });

		this._dispatch(
			stateActions.setWebcamInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				this._webcamProducer.close();

				this._dispatch(
					stateActions.setWebcamInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('disableWebcam() | failed: %o', error);

				this._dispatch(
					stateActions.setWebcamInProgress(false));
			});
	}

	changeWebcam()
	{
		logger.debug('changeWebcam()');

		this._dispatch(
			stateActions.setWebcamInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				return this._updateWebcams();
			})
			.then(() =>
			{
				const array = Array.from(this._webcams.keys());
				const len = array.length;
				const deviceId =
					this._webcam.device ? this._webcam.device.deviceId : undefined;
				let idx = array.indexOf(deviceId);

				if (idx < len - 1)
					idx++;
				else
					idx = 0;

				this._webcam.device = this._webcams.get(array[idx]);

				logger.debug(
					'changeWebcam() | new selected webcam [device:%o]',
					this._webcam.device);

				// Reset video resolution to HD.
				this._webcam.resolution = 'hd';
			})
			.then(() =>
			{
				const { device, resolution } = this._webcam;

				if (!device)
					throw new Error('no webcam devices');

				logger.debug('changeWebcam() | calling getUserMedia()');

				return navigator.mediaDevices.getUserMedia(
					{
						video :
						{
							deviceId : { exact: device.deviceId },
							...VIDEO_CONSTRAINS[resolution]
						}
					});
			})
			.then((stream) =>
			{
				const track = stream.getVideoTracks()[0];

				return this._webcamProducer.replaceTrack(track)
					.then((newTrack) =>
					{
						track.stop();

						return newTrack;
					});
			})
			.then((newTrack) =>
			{
				this._dispatch(
					stateActions.setProducerTrack(this._webcamProducer.id, newTrack));

				this._dispatch(
					stateActions.setWebcamInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('changeWebcam() failed: %o', error);

				this._dispatch(
					stateActions.setWebcamInProgress(false));
			});
	}

	changeWebcamResolution()
	{
		logger.debug('changeWebcamResolution()');

		let oldResolution;
		let newResolution;

		this._dispatch(
			stateActions.setWebcamInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				oldResolution = this._webcam.resolution;

				switch (oldResolution)
				{
					case 'qvga':
						newResolution = 'vga';
						break;
					case 'vga':
						newResolution = 'hd';
						break;
					case 'hd':
						newResolution = 'qvga';
						break;
				}

				this._webcam.resolution = newResolution;
			})
			.then(() =>
			{
				const { device, resolution } = this._webcam;

				logger.debug('changeWebcamResolution() | calling getUserMedia()');

				return navigator.mediaDevices.getUserMedia(
					{
						video :
						{
							deviceId : { exact: device.deviceId },
							...VIDEO_CONSTRAINS[resolution]
						}
					});
			})
			.then((stream) =>
			{
				const track = stream.getVideoTracks()[0];

				return this._webcamProducer.replaceTrack(track)
					.then((newTrack) =>
					{
						track.stop();

						return newTrack;
					});
			})
			.then((newTrack) =>
			{
				this._dispatch(
					stateActions.setProducerTrack(this._webcamProducer.id, newTrack));

				this._dispatch(
					stateActions.setWebcamInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('changeWebcamResolution() failed: %o', error);

				this._dispatch(
					stateActions.setWebcamInProgress(false));

				this._webcam.resolution = oldResolution;
			});
	}

	enableAudioOnly()
	{
		logger.debug('enableAudioOnly()');

		this._dispatch(
			stateActions.setAudioOnlyInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				if (this._webcamProducer)
					this._webcamProducer.close();

				for (const peer of this._room.peers)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.kind !== 'video')
							continue;

						consumer.pause('audio-only-mode');
					}
				}

				this._dispatch(
					stateActions.setAudioOnlyState(true));

				this._dispatch(
					stateActions.setAudioOnlyInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('enableAudioOnly() failed: %o', error);

				this._dispatch(
					stateActions.setAudioOnlyInProgress(false));
			});
	}

	disableAudioOnly()
	{
		logger.debug('disableAudioOnly()');

		this._dispatch(
			stateActions.setAudioOnlyInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				if (!this._webcamProducer && this._room.canSend('video'))
					return this.enableWebcam();
			})
			.then(() =>
			{
				for (const peer of this._room.peers)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.kind !== 'video' || !consumer.supported)
							continue;

						consumer.resume();
					}
				}

				this._dispatch(
					stateActions.setAudioOnlyState(false));

				this._dispatch(
					stateActions.setAudioOnlyInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('disableAudioOnly() failed: %o', error);

				this._dispatch(
					stateActions.setAudioOnlyInProgress(false));
			});
	}

	restartIce()
	{
		logger.debug('restartIce()');

		this._dispatch(
			stateActions.setRestartIceInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				this._room.restartIce();

				// Make it artificially longer.
				setTimeout(() =>
				{
					this._dispatch(
						stateActions.setRestartIceInProgress(false));
				}, 500);
			})
			.catch((error) =>
			{
				logger.error('restartIce() failed: %o', error);

				this._dispatch(
					stateActions.setRestartIceInProgress(false));
			});
	}

	_join({ displayName, device })
	{
		this._dispatch(stateActions.setRoomState('connecting'));

		this._protoo.on('open', () =>
		{
			logger.debug('protoo Peer "open" event');

			this._joinRoom({ displayName, device });
		});

		this._protoo.on('disconnected', () =>
		{
			logger.warn('protoo Peer "disconnected" event');

			this._dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'WebSocket disconnected'
				}));

			// Leave Room.
			try { this._room.remoteClose({ cause: 'protoo disconnected' }); }
			catch (error) {}

			this._dispatch(stateActions.setRoomState('connecting'));
		});

		this._protoo.on('close', () =>
		{
			if (this._closed)
				return;

			logger.warn('protoo Peer "close" event');

			this.close();
		});

		this._protoo.on('request', (request, accept, reject) =>
		{
			logger.debug(
				'_handleProtooRequest() [method:%s, data:%o]',
				request.method, request.data);

			switch (request.method)
			{
				case 'mediasoup-notification':
				{
					accept();

					const notification = request.data;

					this._room.receiveNotification(notification);

					break;
				}

				case 'active-speaker':
				{
					accept();

					const { peerName } = request.data;

					this._dispatch(
						stateActions.setRoomActiveSpeaker(peerName));

					break;
				}

				case 'display-name-changed':
				{
					accept();

					// eslint-disable-next-line no-shadow
					const { peerName, displayName, oldDisplayName } = request.data;

					// NOTE: Hack, we shouldn't do this, but this is just a demo.
					const peer = this._room.getPeerByName(peerName);

					if (!peer)
					{
						logger.error('peer not found');

						break;
					}

					peer.appData.displayName = displayName;

					this._dispatch(
						stateActions.setPeerDisplayName(displayName, peerName));

					this._dispatch(requestActions.notify(
						{
							text : `${oldDisplayName} is now ${displayName}`
						}));

					break;
				}

				default:
				{
					logger.error('unknown protoo method "%s"', request.method);

					reject(404, 'unknown method');
				}
			}
		});
	}

	_joinRoom({ displayName, device })
	{
		logger.debug('_joinRoom()');

		// NOTE: We allow rejoining (room.join()) the same mediasoup Room when Protoo
		// WebSocket re-connects, so we must clean existing event listeners. Otherwise
		// they will be called twice after the reconnection.
		this._room.removeAllListeners();

		this._room.on('close', (originator, appData) =>
		{
			if (originator === 'remote')
			{
				logger.warn('mediasoup Peer/Room remotely closed [appData:%o]', appData);

				this._dispatch(stateActions.setRoomState('closed'));

				return;
			}
		});

		this._room.on('request', (request, callback, errback) =>
		{
			logger.debug(
				'sending mediasoup request [method:%s]:%o', request.method, request);

			this._protoo.send('mediasoup-request', request)
				.then(callback)
				.catch(errback);
		});

		this._room.on('notify', (notification) =>
		{
			logger.debug(
				'sending mediasoup notification [method:%s]:%o',
				notification.method, notification);

			this._protoo.send('mediasoup-notification', notification)
				.catch((error) =>
				{
					logger.warn('could not send mediasoup notification:%o', error);
				});
		});

		this._room.on('newpeer', (peer) =>
		{
			logger.debug(
				'room "newpeer" event [name:"%s", peer:%o]', peer.name, peer);

			this._handlePeer(peer);
		});

		this._room.join(this._peerName, { displayName, device })
			.then(() =>
			{
				// Create Transport for sending.
				this._sendTransport =
					this._room.createTransport('send', { media: 'SEND_MIC_WEBCAM' });

				this._sendTransport.on('close', (originator) =>
				{
					logger.debug(
						'Transport "close" event [originator:%s]', originator);
				});

				// Create Transport for receiving.
				this._recvTransport =
					this._room.createTransport('recv', { media: 'RECV' });

				this._recvTransport.on('close', (originator) =>
				{
					logger.debug(
						'receiving Transport "close" event [originator:%s]', originator);
				});
			})
			.then(() =>
			{
				// Set our media capabilities.
				this._dispatch(stateActions.setMediaCapabilities(
					{
						canSendMic    : this._room.canSend('audio'),
						canSendWebcam : this._room.canSend('video')
					}));
			})
			.then(() =>
			{
				// Don't produce if explicitely requested to not to do it.
				if (!this._produce)
					return;

				// NOTE: Don't depend on this Promise to continue (so we don't do return).
				Promise.resolve()
					// Add our mic.
					.then(() =>
					{
						if (!this._room.canSend('audio'))
							return;

						this._setMicProducer()
							.catch(() => {});
					})
					// Add our webcam (unless the cookie says no).
					.then(() =>
					{
						if (!this._room.canSend('video'))
							return;

						const devicesCookie = cookiesManager.getDevices();

						if (!devicesCookie || devicesCookie.webcamEnabled)
							this.enableWebcam();
					});
			})
			.then(() =>
			{
				this._dispatch(stateActions.setRoomState('connected'));

				// Clean all the existing notifcations.
				this._dispatch(stateActions.removeAllNotifications());

				this._dispatch(requestActions.notify(
					{
						text    : 'You are in the room',
						timeout : 5000
					}));

				const peers = this._room.peers;

				for (const peer of peers)
				{
					this._handlePeer(peer, { notify: false });
				}
			})
			.catch((error) =>
			{
				logger.error('_joinRoom() failed:%o', error);

				this._dispatch(requestActions.notify(
					{
						type : 'error',
						text : `Could not join the room: ${error.toString()}`
					}));

				this.close();
			});
	}

	_setMicProducer()
	{
		if (!this._room.canSend('audio'))
		{
			return Promise.reject(
				new Error('cannot send audio'));
		}

		if (this._micProducer)
		{
			return Promise.reject(
				new Error('mic Producer already exists'));
		}

		let producer;

		return Promise.resolve()
			.then(() =>
			{
				logger.debug('_setMicProducer() | calling getUserMedia()');

				return navigator.mediaDevices.getUserMedia({ audio: true });
			})
			.then((stream) =>
			{
				const track = stream.getAudioTracks()[0];

				producer = this._room.createProducer(track, null, { source: 'mic' });

				// No need to keep original track.
				track.stop();

				// Send it.
				return producer.send(this._sendTransport);
			})
			.then(() =>
			{
				this._micProducer = producer;

				this._dispatch(stateActions.addProducer(
					{
						id             : producer.id,
						source         : 'mic',
						locallyPaused  : producer.locallyPaused,
						remotelyPaused : producer.remotelyPaused,
						track          : producer.track,
						codec          : producer.rtpParameters.codecs[0].name
					}));

				producer.on('close', (originator) =>
				{
					logger.debug(
						'mic Producer "close" event [originator:%s]', originator);

					this._micProducer = null;
					this._dispatch(stateActions.removeProducer(producer.id));
				});

				producer.on('pause', (originator) =>
				{
					logger.debug(
						'mic Producer "pause" event [originator:%s]', originator);

					this._dispatch(stateActions.setProducerPaused(producer.id, originator));
				});

				producer.on('resume', (originator) =>
				{
					logger.debug(
						'mic Producer "resume" event [originator:%s]', originator);

					this._dispatch(stateActions.setProducerResumed(producer.id, originator));
				});

				producer.on('handled', () =>
				{
					logger.debug('mic Producer "handled" event');
				});

				producer.on('unhandled', () =>
				{
					logger.debug('mic Producer "unhandled" event');
				});
			})
			.then(() =>
			{
				logger.debug('_setMicProducer() succeeded');
			})
			.catch((error) =>
			{
				logger.error('_setMicProducer() failed:%o', error);

				this._dispatch(requestActions.notify(
					{
						text : `Mic producer failed: ${error.name}:${error.message}`
					}));

				if (producer)
					producer.close();

				throw error;
			});
	}

	_setWebcamProducer()
	{
		if (!this._room.canSend('video'))
		{
			return Promise.reject(
				new Error('cannot send video'));
		}

		if (this._webcamProducer)
		{
			return Promise.reject(
				new Error('webcam Producer already exists'));
		}

		let producer;

		return Promise.resolve()
			.then(() =>
			{
				const { device, resolution } = this._webcam;

				if (!device)
					throw new Error('no webcam devices');

				logger.debug('_setWebcamProducer() | calling getUserMedia()');

				return navigator.mediaDevices.getUserMedia(
					{
						video :
						{
							deviceId : { exact: device.deviceId },
							...VIDEO_CONSTRAINS[resolution]
						}
					});
			})
			.then((stream) =>
			{
				const track = stream.getVideoTracks()[0];

				producer = this._room.createProducer(
					track, { simulcast: this._useSimulcast }, { source: 'webcam' });

				// No need to keep original track.
				track.stop();

				// Send it.
				return producer.send(this._sendTransport);
			})
			.then(() =>
			{
				this._webcamProducer = producer;

				const { device } = this._webcam;

				this._dispatch(stateActions.addProducer(
					{
						id             : producer.id,
						source         : 'webcam',
						deviceLabel    : device.label,
						type           : this._getWebcamType(device),
						locallyPaused  : producer.locallyPaused,
						remotelyPaused : producer.remotelyPaused,
						track          : producer.track,
						codec          : producer.rtpParameters.codecs[0].name
					}));

				producer.on('close', (originator) =>
				{
					logger.debug(
						'webcam Producer "close" event [originator:%s]', originator);

					this._webcamProducer = null;
					this._dispatch(stateActions.removeProducer(producer.id));
				});

				producer.on('pause', (originator) =>
				{
					logger.debug(
						'webcam Producer "pause" event [originator:%s]', originator);

					this._dispatch(stateActions.setProducerPaused(producer.id, originator));
				});

				producer.on('resume', (originator) =>
				{
					logger.debug(
						'webcam Producer "resume" event [originator:%s]', originator);

					this._dispatch(stateActions.setProducerResumed(producer.id, originator));
				});

				producer.on('handled', () =>
				{
					logger.debug('webcam Producer "handled" event');
				});

				producer.on('unhandled', () =>
				{
					logger.debug('webcam Producer "unhandled" event');
				});
			})
			.then(() =>
			{
				logger.debug('_setWebcamProducer() succeeded');
			})
			.catch((error) =>
			{
				logger.error('_setWebcamProducer() failed:%o', error);

				this._dispatch(requestActions.notify(
					{
						text : `Webcam producer failed: ${error.name}:${error.message}`
					}));

				if (producer)
					producer.close();

				throw error;
			});
	}

	_updateWebcams()
	{
		logger.debug('_updateWebcams()');

		// Reset the list.
		this._webcams = new Map();

		return Promise.resolve()
			.then(() =>
			{
				logger.debug('_updateWebcams() | calling enumerateDevices()');

				return navigator.mediaDevices.enumerateDevices();
			})
			.then((devices) =>
			{
				for (const device of devices)
				{
					if (device.kind !== 'videoinput')
						continue;

					this._webcams.set(device.deviceId, device);
				}
			})
			.then(() =>
			{
				const array = Array.from(this._webcams.values());
				const len = array.length;
				const currentWebcamId =
					this._webcam.device ? this._webcam.device.deviceId : undefined;

				logger.debug('_updateWebcams() [webcams:%o]', array);

				if (len === 0)
					this._webcam.device = null;
				else if (!this._webcams.has(currentWebcamId))
					this._webcam.device = array[0];

				this._dispatch(
					stateActions.setCanChangeWebcam(this._webcams.size >= 2));
			});
	}

	_getWebcamType(device)
	{
		if (/(back|rear)/i.test(device.label))
		{
			logger.debug('_getWebcamType() | it seems to be a back camera');

			return 'back';
		}
		else
		{
			logger.debug('_getWebcamType() | it seems to be a front camera');

			return 'front';
		}
	}

	_handlePeer(peer, { notify = true } = {})
	{
		const displayName = peer.appData.displayName;

		this._dispatch(stateActions.addPeer(
			{
				name        : peer.name,
				displayName : displayName,
				device      : peer.appData.device,
				consumers   : []
			}));

		if (notify)
		{
			this._dispatch(requestActions.notify(
				{
					text : `${displayName} joined the room`
				}));
		}

		for (const consumer of peer.consumers)
		{
			this._handleConsumer(consumer);
		}

		peer.on('close', (originator) =>
		{
			logger.debug(
				'peer "close" event [name:"%s", originator:%s]',
				peer.name, originator);

			this._dispatch(stateActions.removePeer(peer.name));

			if (this._room.joined)
			{
				this._dispatch(requestActions.notify(
					{
						text : `${peer.appData.displayName} left the room`
					}));
			}
		});

		peer.on('newconsumer', (consumer) =>
		{
			logger.debug(
				'peer "newconsumer" event [name:"%s", id:%s, consumer:%o]',
				peer.name, consumer.id, consumer);

			this._handleConsumer(consumer);
		});
	}

	_handleConsumer(consumer)
	{
		const codec = consumer.rtpParameters.codecs[0];

		this._dispatch(stateActions.addConsumer(
			{
				id             : consumer.id,
				peerName       : consumer.peer.name,
				source         : consumer.appData.source,
				supported      : consumer.supported,
				locallyPaused  : consumer.locallyPaused,
				remotelyPaused : consumer.remotelyPaused,
				track          : null,
				codec          : codec ? codec.name : null
			},
			consumer.peer.name));

		consumer.on('close', (originator) =>
		{
			logger.debug(
				'consumer "close" event [id:%s, originator:%s, consumer:%o]',
				consumer.id, originator, consumer);

			this._dispatch(stateActions.removeConsumer(
				consumer.id, consumer.peer.name));
		});

		consumer.on('pause', (originator) =>
		{
			logger.debug(
				'consumer "pause" event [id:%s, originator:%s, consumer:%o]',
				consumer.id, originator, consumer);

			this._dispatch(stateActions.setConsumerPaused(consumer.id, originator));
		});

		consumer.on('resume', (originator) =>
		{
			logger.debug(
				'consumer "resume" event [id:%s, originator:%s, consumer:%o]',
				consumer.id, originator, consumer);

			this._dispatch(stateActions.setConsumerResumed(consumer.id, originator));
		});

		consumer.on('effectiveprofilechange', (profile) =>
		{
			logger.debug(
				'consumer "effectiveprofilechange" event [id:%s, consumer:%o, profile:%s]',
				consumer.id, consumer, profile);

			this._dispatch(stateActions.setConsumerEffectiveProfile(consumer.id, profile));
		});

		// Receive the consumer (if we can).
		if (consumer.supported)
		{
			// Pause it if video and we are in audio-only mode.
			if (consumer.kind === 'video' && this._getState().me.audioOnly)
				consumer.pause('audio-only-mode');

			consumer.receive(this._recvTransport)
				.then((track) =>
				{
					this._dispatch(stateActions.setConsumerTrack(consumer.id, track));
				})
				.catch((error) =>
				{
					logger.error(
						'unexpected error while receiving a new Consumer:%o', error);
				});
		}
	}
}

import protooClient from 'protoo-client';
import * as mediasoupClient from 'mediasoup-client';
import Logger from './Logger';
import hark from 'hark';
import ScreenShare from './ScreenShare';
import { getProtooUrl } from './urlFactory';
import * as cookiesManager from './cookiesManager';
import * as requestActions from './redux/requestActions';
import * as stateActions from './redux/stateActions';
import {
	turnServers,
	requestTimeout,
	transportOptions
} from '../config';

const logger = new Logger('RoomClient');

const ROOM_OPTIONS =
{
	requestTimeout   : requestTimeout,
	transportOptions : transportOptions,
	turnServers      : turnServers
};

const VIDEO_CONSTRAINS =
{
	width       : { ideal: 1280 },
	aspectRatio : 1.334
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

		// window element to external login site
		this._loginWindow;

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

		// This device
		this._device = device;

		// My peer name.
		this._peerName = peerName;

		// protoo-client Peer instance.
		this._protoo = new protooClient.Peer(protooTransport);

		// mediasoup-client Room instance.
		this._room = new mediasoupClient.Room(ROOM_OPTIONS);
		this._room.roomId = roomId;

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

		this._audioDevices = new Map();

		// Local Webcam. Object with:
		// - {MediaDeviceInfo} [device]
		// - {String} [resolution] - 'qvga' / 'vga' / 'hd'.
		this._webcam = {
			device     : null,
			resolution : 'hd'
		};

		this._audioDevice = {
			device : null
		};

		this._screenSharing = ScreenShare.create();

		this._screenSharingProducer = null;

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

	login()
	{
		const url = `/login?roomId=${this._room.roomId}&peerName=${this._peerName}`;

		this._loginWindow = window.open(url, 'loginWindow');
	}

	logout()
	{
		window.location = '/logout';
	}

	closeLoginWindow()
	{
		this._loginWindow.close();
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

	changeProfilePicture(picture) 
	{
		logger.debug('changeProfilePicture() [picture: "%s"]', picture);

		this._protoo.send('change-profile-picture', { picture }).catch((error) => 
		{
			logger.error('shareProfilePicure() | failed: %o', error);
		});
	}

	sendChatMessage(chatMessage)
	{
		logger.debug('sendChatMessage() [chatMessage:"%s"]', chatMessage);

		return this._protoo.send('chat-message', { chatMessage })
			.catch((error) =>
			{
				logger.error('sendChatMessage() | failed: %o', error);

				this._dispatch(requestActions.notify(
					{
						type : 'error',
						text : `Could not send chat: ${error}`
					}));
			});
	}

	getChatHistory()
	{
		logger.debug('getChatHistory()');

		return this._protoo.send('chat-history', {})
			.catch((error) =>
			{
				logger.error('getChatHistory() | failed: %o', error);

				this._dispatch(requestActions.notify(
					{
						type : 'error',
						text : `Could not get chat history: ${error}`
					}));
			});
	}

	checkAuth()
	{
		logger.debug('checkAuth()');

		return this._protoo.send('check-auth', {})
			.catch((error) =>
			{
				logger.error('checkAuth() | failed: %o', error);
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

	installExtension()
	{
		logger.debug('installExtension()');

		return new Promise((resolve, reject) =>
		{
			window.addEventListener('message', _onExtensionMessage, false);
			// eslint-disable-next-line no-undef
			chrome.webstore.install(null, _successfulInstall, _failedInstall);
			function _onExtensionMessage({ data })
			{
				if (data.type === 'ScreenShareInjected')
				{
					logger.debug('installExtension() | installation succeeded');

					return resolve();
				}
			}

			function _failedInstall(reason)
			{
				window.removeEventListener('message', _onExtensionMessage);

				return reject(
					new Error('Failed to install extension: %s', reason));
			}

			function _successfulInstall()
			{
				logger.debug('installExtension() | installation accepted');
			}
		})
			.then(() =>
			{
				// This should be handled better
				this._dispatch(stateActions.setScreenCapabilities(
					{
						canShareScreen : this._room.canSend('video'),
						needExtension  : false
					}));
			})
			.catch((error) =>
			{
				logger.error('installExtension() | failed: %o', error);
			});
	}

	enableScreenSharing()
	{
		logger.debug('enableScreenSharing()');

		this._dispatch(
			stateActions.setScreenShareInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				return this._setScreenShareProducer();
			})
			.then(() =>
			{
				this._dispatch(
					stateActions.setScreenShareInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('enableScreenSharing() | failed: %o', error);

				this._dispatch(
					stateActions.setScreenShareInProgress(false));
			});
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

	disableScreenSharing()
	{
		logger.debug('disableScreenSharing()');

		this._dispatch(
			stateActions.setScreenShareInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				this._screenSharingProducer.close();

				this._dispatch(
					stateActions.setScreenShareInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('disableScreenSharing() | failed: %o', error);

				this._dispatch(
					stateActions.setScreenShareInProgress(false));
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

	changeAudioDevice(deviceId)
	{
		logger.debug('changeAudioDevice() [deviceId: %s]', deviceId);

		this._dispatch(
			stateActions.setAudioInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				this._audioDevice.device = this._audioDevices.get(deviceId);

				logger.debug(
					'changeAudioDevice() | new selected webcam [device:%o]',
					this._audioDevice.device);
			})
			.then(() =>
			{
				const { device } = this._audioDevice;

				if (!device)
					throw new Error('no audio devices');

				logger.debug('changeAudioDevice() | calling getUserMedia()');

				return navigator.mediaDevices.getUserMedia(
					{
						audio :
						{
							deviceId : { exact: device.deviceId }
						}
					});
			})
			.then((stream) =>
			{
				const track = stream.getAudioTracks()[0];

				return this._micProducer.replaceTrack(track)
					.then((newTrack) =>
					{
						track.stop();

						return newTrack;
					});
			})
			.then((newTrack) =>
			{
				this._dispatch(
					stateActions.setProducerTrack(this._micProducer.id, newTrack));

				return this._updateAudioDevices();
			})
			.then(() =>
			{
				this._dispatch(
					stateActions.setAudioInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('changeAudioDevice() failed: %o', error);

				this._dispatch(
					stateActions.setAudioInProgress(false));
			});
	}

	changeWebcam(deviceId)
	{
		logger.debug('changeWebcam() [deviceId: %s]', deviceId);

		this._dispatch(
			stateActions.setWebcamInProgress(true));

		return Promise.resolve()
			.then(() =>
			{
				this._webcam.device = this._webcams.get(deviceId);

				logger.debug(
					'changeWebcam() | new selected webcam [device:%o]',
					this._webcam.device);

				// Reset video resolution to HD.
				this._webcam.resolution = 'hd';
			})
			.then(() =>
			{
				const { device } = this._webcam;

				if (!device)
					throw new Error('no webcam devices');

				logger.debug('changeWebcam() | calling getUserMedia()');

				return navigator.mediaDevices.getUserMedia(
					{
						video :
						{
							deviceId : { exact: device.deviceId },
							...VIDEO_CONSTRAINS
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

				return this._updateWebcams();
			})
			.then(() =>
			{
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
				const { device } = this._webcam;

				logger.debug('changeWebcamResolution() | calling getUserMedia()');

				return navigator.mediaDevices.getUserMedia(
					{
						video :
						{
							deviceId : { exact: device.deviceId },
							...VIDEO_CONSTRAINS
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

	mutePeerAudio(peerName)
	{
		logger.debug('mutePeerAudio() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerAudioInProgress(peerName, true));

		return Promise.resolve()
			.then(() =>
			{
				for (const peer of this._room.peers)
				{
					if (peer.name === peerName)
					{
						for (const consumer of peer.consumers)
						{
							if (consumer.appData.source !== 'mic')
								continue;

							consumer.pause('mute-audio');
						}
					}
				}

				this._dispatch(
					stateActions.setPeerAudioInProgress(peerName, false));
			})
			.catch((error) =>
			{
				logger.error('mutePeerAudio() failed: %o', error);

				this._dispatch(
					stateActions.setPeerAudioInProgress(peerName, false));
			});
	}

	unmutePeerAudio(peerName)
	{
		logger.debug('unmutePeerAudio() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerAudioInProgress(peerName, true));

		return Promise.resolve()
			.then(() =>
			{
				for (const peer of this._room.peers)
				{
					if (peer.name === peerName)
					{
						for (const consumer of peer.consumers)
						{
							if (consumer.appData.source !== 'mic' || !consumer.supported)
								continue;

							consumer.resume();
						}
					}
				}

				this._dispatch(
					stateActions.setPeerAudioInProgress(peerName, false));
			})
			.catch((error) =>
			{
				logger.error('unmutePeerAudio() failed: %o', error);

				this._dispatch(
					stateActions.setPeerAudioInProgress(peerName, false));
			});
	}

	pausePeerVideo(peerName)
	{
		logger.debug('pausePeerVideo() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerVideoInProgress(peerName, true));

		return Promise.resolve()
			.then(() =>
			{
				for (const peer of this._room.peers)
				{
					if (peer.name === peerName)
					{
						for (const consumer of peer.consumers)
						{
							if (consumer.appData.source !== 'webcam')
								continue;

							consumer.pause('pause-video');
						}
					}
				}

				this._dispatch(
					stateActions.setPeerVideoInProgress(peerName, false));
			})
			.catch((error) =>
			{
				logger.error('pausePeerVideo() failed: %o', error);

				this._dispatch(
					stateActions.setPeerVideoInProgress(peerName, false));
			});
	}

	resumePeerVideo(peerName)
	{
		logger.debug('resumePeerVideo() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerVideoInProgress(peerName, true));

		return Promise.resolve()
			.then(() =>
			{
				for (const peer of this._room.peers)
				{
					if (peer.name === peerName)
					{
						for (const consumer of peer.consumers)
						{
							if (consumer.appData.source !== 'webcam' || !consumer.supported)
								continue;

							consumer.resume();
						}
					}
				}

				this._dispatch(
					stateActions.setPeerVideoInProgress(peerName, false));
			})
			.catch((error) =>
			{
				logger.error('resumePeerVideo() failed: %o', error);

				this._dispatch(
					stateActions.setPeerVideoInProgress(peerName, false));
			});
	}

	pausePeerScreen(peerName)
	{
		logger.debug('pausePeerScreen() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerScreenInProgress(peerName, true));

		return Promise.resolve()
			.then(() =>
			{
				for (const peer of this._room.peers)
				{
					if (peer.name === peerName)
					{
						for (const consumer of peer.consumers)
						{
							if (consumer.appData.source !== 'screen')
								continue;

							consumer.pause('pause-screen');
						}
					}
				}

				this._dispatch(
					stateActions.setPeerScreenInProgress(peerName, false));
			})
			.catch((error) =>
			{
				logger.error('pausePeerScreen() failed: %o', error);

				this._dispatch(
					stateActions.setPeerScreenInProgress(peerName, false));
			});
	}

	resumePeerScreen(peerName)
	{
		logger.debug('resumePeerScreen() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerScreenInProgress(peerName, true));

		return Promise.resolve()
			.then(() =>
			{
				for (const peer of this._room.peers)
				{
					if (peer.name === peerName)
					{
						for (const consumer of peer.consumers)
						{
							if (consumer.appData.source !== 'screen' || !consumer.supported)
								continue;

							consumer.resume();
						}
					}
				}

				this._dispatch(
					stateActions.setPeerScreenInProgress(peerName, false));
			})
			.catch((error) =>
			{
				logger.error('resumePeerScreen() failed: %o', error);

				this._dispatch(
					stateActions.setPeerScreenInProgress(peerName, false));
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

	sendRaiseHandState(state)
	{
		logger.debug('sendRaiseHandState: ', state);

		this._dispatch(
			stateActions.setMyRaiseHandStateInProgress(true));

		return this._protoo.send('raisehand-message', { raiseHandState: state })
			.then(() =>
			{
				this._dispatch(
					stateActions.setMyRaiseHandState(state));

				this._dispatch(requestActions.notify(
					{
						text : 'raiseHand state changed'
					}));
				this._dispatch(
					stateActions.setMyRaiseHandStateInProgress(false));
			})
			.catch((error) =>
			{
				logger.error('sendRaiseHandState() | failed: %o', error);

				this._dispatch(requestActions.notify(
					{
						type : 'error',
						text : `Could not change raise hand state: ${error}`
					}));

				// We need to refresh the component for it to render changed state
				this._dispatch(stateActions.setMyRaiseHandState(!state));
				this._dispatch(
					stateActions.setMyRaiseHandStateInProgress(false));
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

				case 'profile-picture-changed':
				{
					accept();

					const { peerName, picture } = request.data;

					this._dispatch(stateActions.setPeerPicture(peerName, picture));

					break;
				}

				// This means: server wants to change MY user information
				case 'auth':
				{
					logger.debug('got auth event from server', request.data);
					accept();

					this.changeDisplayName(request.data.name);

					this.changeProfilePicture(request.data.picture);
					this._dispatch(stateActions.setPicture(
						request.data.photos && request.data.photos[0]
					));

					this._dispatch(stateActions.loggedIn());

					this._dispatch(requestActions.notify(
						{
							text : `Authenticated successfully: ${request.data}`
						}
					));

					this.closeLoginWindow();

					break;
				}

				case 'raisehand-message':
				{
					accept();
					const { peerName, raiseHandState } = request.data;

					logger.debug('Got raiseHandState from "%s"', peerName);

					this._dispatch(
						stateActions.setPeerRaiseHandState(peerName, raiseHandState));
					break;
				}

				case 'chat-message-receive':
				{
					accept();

					const { peerName, chatMessage } = request.data;

					logger.debug('Got chat from "%s"', peerName);

					this._dispatch(
						stateActions.addResponseMessage({ ...chatMessage, peerName }));

					break;
				}

				case 'chat-history-receive':
				{
					accept();

					const { chatHistory } = request.data;

					if (chatHistory.length > 0)
					{
						logger.debug('Got chat history');
						this._dispatch(
							stateActions.addChatHistory(chatHistory));
					}

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
				this._dispatch(stateActions.setScreenCapabilities(
					{
						canShareScreen : this._room.canSend('video') &&
							this._screenSharing.isScreenShareAvailable(),
						needExtension : this._screenSharing.needExtension()
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

				this.getChatHistory();

				this.checkAuth();

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
				logger.debug('_setMicProducer() | calling _updateAudioDevices()');

				return this._updateAudioDevices();
			})
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
				const stream = new MediaStream;

				logger.debug('_setMicProducer() succeeded');
				stream.addTrack(producer.track);
				if (!stream.getAudioTracks()[0])
					throw new Error('_setMicProducer(): given stream has no audio track');
				producer.hark = hark(stream, { play: false });

				// eslint-disable-next-line no-unused-vars
				producer.hark.on('volume_change', (dBs, threshold) =>
				{
					// The exact formula to convert from dBs (-100..0) to linear (0..1) is:
					//   Math.pow(10, dBs / 20)
					// However it does not produce a visually useful output, so let exagerate
					// it a bit. Also, let convert it from 0..1 to 0..10 and avoid value 1 to
					// minimize component renderings.
					let volume = Math.round(Math.pow(10, dBs / 85) * 10);

					if (volume === 1)
						volume = 0;

					if (volume !== producer.volume)
					{
						producer.volume = volume;
						this._dispatch(stateActions.setProducerVolume(producer.id, volume));
					}
				});
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

	_setScreenShareProducer()
	{
		if (!this._room.canSend('video'))
		{
			return Promise.reject(
				new Error('cannot send screen'));
		}

		let producer;

		return Promise.resolve()
			.then(() =>
			{
				const available = this._screenSharing.isScreenShareAvailable() &&
					!this._screenSharing.needExtension();

				if (!available)
					throw new Error('screen sharing not available');

				logger.debug('_setScreenShareProducer() | calling getUserMedia()');

				return this._screenSharing.start({
					width     : 1280,
					height    : 720,
					frameRate : 3
				});
			})
			.then((stream) =>
			{
				const track = stream.getVideoTracks()[0];

				producer = this._room.createProducer(
					track, { simulcast: false }, { source: 'screen' });

				// No need to keep original track.
				track.stop();

				// Send it.
				return producer.send(this._sendTransport);
			})
			.then(() =>
			{
				this._screenSharingProducer = producer;

				this._dispatch(stateActions.addProducer(
					{
						id             : producer.id,
						source         : 'screen',
						deviceLabel    : 'screen',
						type           : 'screen',
						locallyPaused  : producer.locallyPaused,
						remotelyPaused : producer.remotelyPaused,
						track          : producer.track,
						codec          : producer.rtpParameters.codecs[0].name
					}));

				producer.on('close', (originator) =>
				{
					logger.debug(
						'webcam Producer "close" event [originator:%s]', originator);

					this._screenSharingProducer = null;
					this._dispatch(stateActions.removeProducer(producer.id));
				});

				producer.on('trackended', (originator) =>
				{
					logger.debug(
						'webcam Producer "trackended" event [originator:%s]', originator);

					this.disableScreenSharing();
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
				logger.debug('_setScreenShareProducer() succeeded');
			})
			.catch((error) =>
			{
				logger.error('_setScreenShareProducer() failed:%o', error);

				this._dispatch(requestActions.notify(
					{
						text : `Screen share producer failed: ${error.name}:${error.message}`
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
				const { device } = this._webcam;

				if (!device)
					throw new Error('no webcam devices');

				logger.debug('_setWebcamProducer() | calling getUserMedia()');

				return navigator.mediaDevices.getUserMedia(
					{
						video :
						{
							deviceId : { exact: device.deviceId },
							...VIDEO_CONSTRAINS
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

	_updateAudioDevices()
	{
		logger.debug('_updateAudioDevices()');

		// Reset the list.
		this._audioDevices = new Map();

		return Promise.resolve()
			.then(() =>
			{
				logger.debug('_updateAudioDevices() | calling enumerateDevices()');

				return navigator.mediaDevices.enumerateDevices();
			})
			.then((devices) =>
			{
				for (const device of devices)
				{
					if (device.kind !== 'audioinput')
						continue;

					device.value = device.deviceId;

					this._audioDevices.set(device.deviceId, device);
				}
			})
			.then(() =>
			{
				const array = Array.from(this._audioDevices.values());
				const len = array.length;
				const currentAudioDeviceId =
					this._audioDevice.device ? this._audioDevice.device.deviceId : undefined;

				logger.debug('_updateAudioDevices() [audiodevices:%o]', array);

				if (len === 0)
					this._audioDevice.device = null;
				else if (!this._audioDevices.has(currentAudioDeviceId))
					this._audioDevice.device = array[0];

				this._dispatch(
					stateActions.setCanChangeWebcam(this._webcams.size >= 2));

				this._dispatch(
					stateActions.setCanChangeAudioDevice(len >= 2));
				if (len >= 1)
					this._dispatch(
						stateActions.setAudioDevices(this._audioDevices));
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

					device.value = device.deviceId;

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

				this._dispatch(
					stateActions.setCanChangeWebcam(len >= 2));
				if (len >= 1)
					this._dispatch(
						stateActions.setWebcamDevices(this._webcams));
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
			consumer.peer.name)
		);

		consumer.on('close', (originator) =>
		{
			logger.debug(
				'consumer "close" event [id:%s, originator:%s, consumer:%o]',
				consumer.id, originator, consumer);

			this._dispatch(stateActions.removeConsumer(
				consumer.id, consumer.peer.name));
		});

		consumer.on('handled', (originator) =>
		{
			logger.debug(
				'consumer "handled" event [id:%s, originator:%s, consumer:%o]',
				consumer.id, originator, consumer);
			if (consumer.kind === 'audio')
			{
				const stream = new MediaStream;

				stream.addTrack(consumer.track);
				if (!stream.getAudioTracks()[0])
					throw new Error('consumer.on("handled" | given stream has no audio track');

				consumer.hark = hark(stream, { play: false });

				// eslint-disable-next-line no-unused-vars
				consumer.hark.on('volume_change', (dBs, threshold) =>
				{
					// The exact formula to convert from dBs (-100..0) to linear (0..1) is:
					//   Math.pow(10, dBs / 20)
					// However it does not produce a visually useful output, so let exagerate
					// it a bit. Also, let convert it from 0..1 to 0..10 and avoid value 1 to
					// minimize component renderings.
					let volume = Math.round(Math.pow(10, dBs / 85) * 10);

					if (volume === 1)
						volume = 0;

					if (volume !== consumer.volume)
					{
						consumer.volume = volume;
						this._dispatch(stateActions.setConsumerVolume(consumer.id, volume));
					}
				});
			}
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

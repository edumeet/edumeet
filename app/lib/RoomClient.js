import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import Logger from './Logger';
import hark from 'hark';
import ScreenShare from './ScreenShare';
import Spotlights from './Spotlights';
import { getSignalingUrl } from './urlFactory';
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
	turnServers      : turnServers,
	maxSpotlights    : 4
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

		const signalingUrl = getSignalingUrl(peerName, roomId);

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

		// Socket.io peer connection
		this._signalingSocket = io(signalingUrl);

		// mediasoup-client Room instance.
		this._room = new mediasoupClient.Room(ROOM_OPTIONS);
		this._room.roomId = roomId;

		// Max spotlights
		this._maxSpotlights = ROOM_OPTIONS.maxSpotlights;

		// Manager of spotlight
		this._spotlights = new Spotlights(this._maxSpotlights, this._room);

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

		// Close signaling Peer (wait a bit so mediasoup-client can send
		// the 'leaveRoom' notification).
		setTimeout(() => this._signalingSocket.close(), 250);

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

	notify(text)
	{
		this._dispatch(requestActions.notify({ text: text }));
	}

	timeoutCallback(callback)
	{
		let called = false;

		const interval = setTimeout(
			() =>
			{
				if (called)
					return;
				called = true;
				callback(new Error('Callback timeout'));
			},
			5000
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

	sendRequest(method, data)
	{
		return new Promise((resolve, reject) =>
		{
			if (!this._signalingSocket)
			{
				reject('No socket connection.');
			}
			else
			{
				this._signalingSocket.emit(method, data, this.timeoutCallback((err, response) =>
				{
					if (err)
					{
						reject(err);
					}
					else
					{
						resolve(response);
					}
				}));
			}
		});
	}

	async changeDisplayName(displayName)
	{
		logger.debug('changeDisplayName() [displayName:"%s"]', displayName);

		// Store in cookie.
		cookiesManager.setUser({ displayName });

		try
		{
			await this.sendRequest('change-display-name', { displayName });

			this._dispatch(stateActions.setDisplayName(displayName));

			this.notify('Display name changed');
		}
		catch (error)
		{
			logger.error('changeDisplayName() | failed: %o', error);

			this.notify(`Could not change display name: ${error}`);

			// We need to refresh the component for it to render the previous
			// displayName again.
			this._dispatch(stateActions.setDisplayName());
		}
	}

	async changeProfilePicture(picture)
	{
		logger.debug('changeProfilePicture() [picture: "%s"]', picture);

		try
		{
			await this.sendRequest('change-profile-picture', { picture });
		}
		catch (error)
		{
			logger.error('shareProfilePicure() | failed: %o', error);
		}
	}

	async sendChatMessage(chatMessage)
	{
		logger.debug('sendChatMessage() [chatMessage:"%s"]', chatMessage);

		try
		{
			await this.sendRequest('chat-message', { chatMessage });
		}
		catch (error)
		{
			logger.error('sendChatMessage() | failed: %o', error);

			this.notify(`Could not send chat: ${error}`);
		}
	}

	async sendFile(file)
	{
		logger.debug('sendFile() [file: %o]', file);

		try
		{
			await this.sendRequest('send-file', { file });
		}
		catch (error)
		{
			logger.error('sendFile() | failed: %o', error);

			this.notify('An error occurred while sharing a file');
		}
	}

	async getServerHistory()
	{
		logger.debug('getServerHistory()');

		try
		{
			const {
				chatHistory,
				fileHistory,
				lastN
			} = await this.sendRequest('server-history');

			if (chatHistory.length > 0)
			{
				logger.debug('Got chat history');
				this._dispatch(
					stateActions.addChatHistory(chatHistory));
			}

			if (fileHistory.length > 0)
			{
				logger.debug('Got files history');

				this._dispatch(stateActions.addFileHistory(fileHistory));
			}

			if (lastN.length > 0)
			{
				logger.debug('Got lastN');

				// Remove our self from list
				const index = lastN.indexOf(this._peerName);

				lastN.splice(index, 1);

				this._spotlights.addSpeakerList(lastN);
			}
		}
		catch (error)
		{
			logger.error('getServerHistory() | failed: %o', error);

			this.notify(`Could not get chat history: ${error}`);
		}
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

	// Updated consumers based on spotlights
	async updateSpotlights(spotlights)
	{
		logger.debug('updateSpotlights()');

		try
		{
			for (const peer of this._room.peers)
			{
				if (spotlights.indexOf(peer.name) > -1) // Resume video for speaker
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.kind !== 'video' || !consumer.supported)
							continue;

						await consumer.resume();
					}
				}
				else // Pause video for everybody else
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.kind !== 'video')
							continue;

						await consumer.pause('not-speaker');
					}
				}
			}
		}
		catch (error)
		{
			logger.error('updateSpotlights() failed: %o', error);
		}
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

	async enableScreenSharing()
	{
		logger.debug('enableScreenSharing()');

		this._dispatch(stateActions.setScreenShareInProgress(true));

		try
		{
			await this._setScreenShareProducer();
		}
		catch (error)
		{
			logger.error('enableScreenSharing() | failed: %o', error);
		}

		this._dispatch(stateActions.setScreenShareInProgress(false));
	}

	async enableWebcam()
	{
		logger.debug('enableWebcam()');

		// Store in cookie.
		cookiesManager.setDevices({ webcamEnabled: true });

		this._dispatch(stateActions.setWebcamInProgress(true));

		try
		{
			await this._updateWebcams();
			await this._setWebcamProducer();
		}
		catch (error)
		{
			logger.error('enableWebcam() | failed: %o', error);
		}

		this._dispatch(stateActions.setWebcamInProgress(false));
	}

	async disableScreenSharing()
	{
		logger.debug('disableScreenSharing()');

		this._dispatch(stateActions.setScreenShareInProgress(true));

		try
		{
			await this._screenSharingProducer.close();
		}
		catch (error)
		{
			logger.error('disableScreenSharing() | failed: %o', error);
		}

		this._dispatch(stateActions.setScreenShareInProgress(false));
	}

	async disableWebcam()
	{
		logger.debug('disableWebcam()');

		// Store in cookie.
		cookiesManager.setDevices({ webcamEnabled: false });

		this._dispatch(stateActions.setWebcamInProgress(true));

		try
		{
			this._webcamProducer.close();
		}
		catch (error)
		{
			logger.error('disableWebcam() | failed: %o', error);
		}

		this._dispatch(stateActions.setWebcamInProgress(false));
	}

	async changeAudioDevice(deviceId)
	{
		logger.debug('changeAudioDevice() [deviceId: %s]', deviceId);

		this._dispatch(
			stateActions.setAudioInProgress(true));

		try
		{
			this._audioDevice.device = this._audioDevices.get(deviceId);

			logger.debug(
				'changeAudioDevice() | new selected webcam [device:%o]',
				this._audioDevice.device);

			const { device } = this._audioDevice;

			if (!device)
				throw new Error('no audio devices');

			logger.debug('changeAudioDevice() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					audio :
					{
						deviceId : { exact: device.deviceId }
					}
				});

			const track = stream.getAudioTracks()[0];

			const newTrack = await this._micProducer.replaceTrack(track);

			track.stop();

			this._dispatch(
				stateActions.setProducerTrack(this._micProducer.id, newTrack));

			cookiesManager.setAudioDevice({ audioDeviceId: deviceId });

			await this._updateAudioDevices();
		}
		catch (error)
		{
			logger.error('changeAudioDevice() failed: %o', error);
		}

		this._dispatch(
			stateActions.setAudioInProgress(false));
	}

	async changeWebcam(deviceId)
	{
		logger.debug('changeWebcam() [deviceId: %s]', deviceId);

		this._dispatch(
			stateActions.setWebcamInProgress(true));

		try
		{
			this._webcam.device = this._webcams.get(deviceId);

			logger.debug(
				'changeWebcam() | new selected webcam [device:%o]',
				this._webcam.device);

			// Reset video resolution to HD.
			this._webcam.resolution = 'hd';

			const { device } = this._webcam;

			if (!device)
				throw new Error('no webcam devices');

			logger.debug('changeWebcam() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					video :
					{
						deviceId : { exact: device.deviceId },
						...VIDEO_CONSTRAINS
					}
				});

			const track = stream.getVideoTracks()[0];

			const newTrack = await this._webcamProducer.replaceTrack(track);

			track.stop();

			this._dispatch(
				stateActions.setProducerTrack(this._webcamProducer.id, newTrack));

			cookiesManager.setVideoDevice({ videoDeviceId: deviceId });

			await this._updateWebcams();
		}
		catch (error)
		{
			logger.error('changeWebcam() failed: %o', error);
		}

		this._dispatch(
			stateActions.setWebcamInProgress(false));
	}

	async changeWebcamResolution()
	{
		logger.debug('changeWebcamResolution()');

		let oldResolution;
		let newResolution;

		this._dispatch(
			stateActions.setWebcamInProgress(true));

		try
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

			const { device } = this._webcam;

			logger.debug('changeWebcamResolution() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					video :
					{
						deviceId : { exact: device.deviceId },
						...VIDEO_CONSTRAINS
					}
				});

			const track = stream.getVideoTracks()[0];

			const newTrack = await this._webcamProducer.replaceTrack(track);

			track.stop();

			this._dispatch(
				stateActions.setProducerTrack(this._webcamProducer.id, newTrack));
		}
		catch (error)
		{
			logger.error('changeWebcamResolution() failed: %o', error);

			this._webcam.resolution = oldResolution;
		}

		this._dispatch(
			stateActions.setWebcamInProgress(false));
	}

	async mutePeerAudio(peerName)
	{
		logger.debug('mutePeerAudio() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerAudioInProgress(peerName, true));

		try
		{
			for (const peer of this._room.peers)
			{
				if (peer.name === peerName)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.appData.source !== 'mic')
							continue;

						await consumer.pause('mute-audio');
					}
				}
			}
		}
		catch (error)
		{
			logger.error('mutePeerAudio() failed: %o', error);
		}

		this._dispatch(
			stateActions.setPeerAudioInProgress(peerName, false));
	}

	async unmutePeerAudio(peerName)
	{
		logger.debug('unmutePeerAudio() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerAudioInProgress(peerName, true));

		try
		{
			for (const peer of this._room.peers)
			{
				if (peer.name === peerName)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.appData.source !== 'mic' || !consumer.supported)
							continue;

						await consumer.resume();
					}
				}
			}
		}
		catch (error)
		{
			logger.error('unmutePeerAudio() failed: %o', error);
		}

		this._dispatch(
			stateActions.setPeerAudioInProgress(peerName, false));
	}

	async pausePeerVideo(peerName)
	{
		logger.debug('pausePeerVideo() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerVideoInProgress(peerName, true));

		try
		{
			for (const peer of this._room.peers)
			{
				if (peer.name === peerName)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.appData.source !== 'webcam')
							continue;

						await consumer.pause('pause-video');
					}
				}
			}
		}
		catch (error)
		{
			logger.error('pausePeerVideo() failed: %o', error);
		}

		this._dispatch(
			stateActions.setPeerVideoInProgress(peerName, false));
	}

	async resumePeerVideo(peerName)
	{
		logger.debug('resumePeerVideo() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerVideoInProgress(peerName, true));

		try
		{
			for (const peer of this._room.peers)
			{
				if (peer.name === peerName)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.appData.source !== 'webcam' || !consumer.supported)
							continue;

						await consumer.resume();
					}
				}
			}
		}
		catch (error)
		{
			logger.error('resumePeerVideo() failed: %o', error);
		}

		this._dispatch(
			stateActions.setPeerVideoInProgress(peerName, false));
	}

	async pausePeerScreen(peerName)
	{
		logger.debug('pausePeerScreen() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerScreenInProgress(peerName, true));

		try
		{
			for (const peer of this._room.peers)
			{
				if (peer.name === peerName)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.appData.source !== 'screen')
							continue;

						await consumer.pause('pause-screen');
					}
				}
			}
		}
		catch (error)
		{
			logger.error('pausePeerScreen() failed: %o', error);
		}

		this._dispatch(
			stateActions.setPeerScreenInProgress(peerName, false));
	}

	async resumePeerScreen(peerName)
	{
		logger.debug('resumePeerScreen() [peerName:"%s"]', peerName);

		this._dispatch(
			stateActions.setPeerScreenInProgress(peerName, true));

		try
		{
			for (const peer of this._room.peers)
			{
				if (peer.name === peerName)
				{
					for (const consumer of peer.consumers)
					{
						if (consumer.appData.source !== 'screen' || !consumer.supported)
							continue;

						await consumer.resume();
					}
				}
			}
		}
		catch (error)
		{
			logger.error('resumePeerScreen() failed: %o', error);
		}

		this._dispatch(
			stateActions.setPeerScreenInProgress(peerName, false));
	}

	async enableAudioOnly()
	{
		logger.debug('enableAudioOnly()');

		this._dispatch(
			stateActions.setAudioOnlyInProgress(true));

		try
		{
			if (this._webcamProducer)
				await this._webcamProducer.close();

			for (const peer of this._room.peers)
			{
				for (const consumer of peer.consumers)
				{
					if (consumer.kind !== 'video')
						continue;

					await consumer.pause('audio-only-mode');
				}
			}

			this._dispatch(
				stateActions.setAudioOnlyState(true));
		}
		catch (error)
		{
			logger.error('enableAudioOnly() failed: %o', error);
		}

		this._dispatch(
			stateActions.setAudioOnlyInProgress(false));
	}

	async disableAudioOnly()
	{
		logger.debug('disableAudioOnly()');

		this._dispatch(
			stateActions.setAudioOnlyInProgress(true));

		try
		{
			if (!this._webcamProducer && this._room.canSend('video'))
				await this.enableWebcam();

			for (const peer of this._room.peers)
			{
				for (const consumer of peer.consumers)
				{
					if (consumer.kind !== 'video' || !consumer.supported)
						continue;

					await consumer.resume();
				}
			}

			this._dispatch(
				stateActions.setAudioOnlyState(false));
		}
		catch (error)
		{
			logger.error('disableAudioOnly() failed: %o', error);
		}

		this._dispatch(
			stateActions.setAudioOnlyInProgress(false));
	}

	async sendRaiseHandState(state)
	{
		logger.debug('sendRaiseHandState: ', state);

		this._dispatch(
			stateActions.setMyRaiseHandStateInProgress(true));

		try
		{
			await this.sendRequest('raisehand-message', { raiseHandState: state });

			this._dispatch(
				stateActions.setMyRaiseHandState(state));
		}
		catch (error)
		{
			logger.error('sendRaiseHandState() | failed: %o', error);

			this.notify(`Could not change raise hand state: ${error}`);

			// We need to refresh the component for it to render changed state
			this._dispatch(stateActions.setMyRaiseHandState(!state));
		}

		this._dispatch(
			stateActions.setMyRaiseHandStateInProgress(false));
	}

	async restartIce()
	{
		logger.debug('restartIce()');

		this._dispatch(
			stateActions.setRestartIceInProgress(true));

		try
		{
			await this._room.restartIce();
		}
		catch (error)
		{
			logger.error('restartIce() failed: %o', error);
		}

		// Make it artificially longer.
		setTimeout(() =>
		{
			this._dispatch(
				stateActions.setRestartIceInProgress(false));
		}, 500);
	}

	_join({ displayName, device })
	{
		this._dispatch(stateActions.setRoomState('connecting'));

		this._signalingSocket.on('connect', () =>
		{
			logger.debug('signaling Peer "connect" event');

			this._joinRoom({ displayName, device });
		});

		this._signalingSocket.on('disconnect', () =>
		{
			logger.warn('signaling Peer "disconnect" event');

			this.notify('WebSocket disconnected');

			// Leave Room.
			try { this._room.remoteClose({ cause: 'signaling disconnected' }); }
			catch (error) {}

			this._dispatch(stateActions.setRoomState('connecting'));
		});

		this._signalingSocket.on('close', () =>
		{
			if (this._closed)
				return;

			logger.warn('signaling Peer "close" event');

			this.close();
		});

		this._signalingSocket.on('mediasoup-notification', (data) =>
		{
			const notification = data;

			this._room.receiveNotification(notification);
		});

		this._signalingSocket.on('active-speaker', (data) =>
		{
			const { peerName } = data;

			this._dispatch(
				stateActions.setRoomActiveSpeaker(peerName));

			if (peerName && peerName !== this._peerName)
				this._spotlights.handleActiveSpeaker(peerName);
		});

		this._signalingSocket.on('display-name-changed', (data) =>
		{
			// eslint-disable-next-line no-shadow
			const { peerName, displayName, oldDisplayName } = data;

			// NOTE: Hack, we shouldn't do this, but this is just a demo.
			const peer = this._room.getPeerByName(peerName);

			if (!peer)
			{
				logger.error('peer not found');

				return;
			}

			peer.appData.displayName = displayName;

			this._dispatch(
				stateActions.setPeerDisplayName(displayName, peerName));

			this.notify(`${oldDisplayName} is now ${displayName}`);
		});

		this._signalingSocket.on('profile-picture-changed', (data) =>
		{
			const { peerName, picture } = data;

			this._dispatch(stateActions.setPeerPicture(peerName, picture));
		});

		// This means: server wants to change MY user information
		this._signalingSocket.on('auth', (data) =>
		{
			logger.debug('got auth event from server', data);

			this.changeDisplayName(data.name);

			this.changeProfilePicture(data.picture);
			this._dispatch(stateActions.setPicture(data.picture));
			this._dispatch(stateActions.loggedIn());

			this.notify(`Authenticated successfully: ${data}`);

			this.closeLoginWindow();
		});

		this._signalingSocket.on('raisehand-message', (data) =>
		{
			const { peerName, raiseHandState } = data;

			logger.debug('Got raiseHandState from "%s"', peerName);

			this._dispatch(
				stateActions.setPeerRaiseHandState(peerName, raiseHandState));
		});

		this._signalingSocket.on('chat-message-receive', (data) =>
		{
			const { peerName, chatMessage } = data;

			logger.debug('Got chat from "%s"', peerName);

			this._dispatch(
				stateActions.addResponseMessage({ ...chatMessage, peerName }));
		});

		this._signalingSocket.on('file-receive', (data) =>
		{
			const payload = data.file;

			this._dispatch(stateActions.addFile(payload));

			this.notify(`${payload.name} shared a file`);
		});
	}

	async _joinRoom({ displayName, device })
	{
		logger.debug('_joinRoom()');

		// NOTE: We allow rejoining (room.join()) the same mediasoup Room when
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

			this.sendRequest('mediasoup-request', request)
				.then(callback)
				.catch(errback);
		});

		this._room.on('notify', (notification) =>
		{
			logger.debug(
				'sending mediasoup notification [method:%s]:%o',
				notification.method, notification);

			this.sendRequest('mediasoup-notification', notification)
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

		try
		{
			await this._room.join(this._peerName, { displayName, device });

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

			// Don't produce if explicitely requested to not to do it.
			if (this._produce)
			{
				if (this._room.canSend('audio'))
					await this._setMicProducer();

				// Add our webcam (unless the cookie says no).
				if (this._room.canSend('video'))
				{
					const devicesCookie = cookiesManager.getDevices();

					if (!devicesCookie || devicesCookie.webcamEnabled)
						await this.enableWebcam();
				}
			}

			this._dispatch(stateActions.setRoomState('connected'));

			// Clean all the existing notifcations.
			this._dispatch(stateActions.removeAllNotifications());

			this.getServerHistory();

			this.notify('You are in the room');

			this._spotlights.on('spotlights-updated', (spotlights) =>
			{
				this._dispatch(stateActions.setSpotlights(spotlights));
				this.updateSpotlights(spotlights);
			});

			const peers = this._room.peers;

			for (const peer of peers)
			{
				this._handlePeer(peer, { notify: false });
			}

			this._spotlights.start();
		}
		catch (error)
		{
			logger.error('_joinRoom() failed:%o', error);

			this.notify(`Could not join the room: ${error.toString()}`);

			this.close();
		}
	}

	async _setMicProducer()
	{
		if (!this._room.canSend('audio'))
			throw new Error('cannot send audio');

		if (this._micProducer)
			throw new Error('mic Producer already exists');

		let producer;

		try
		{
			logger.debug('_setMicProducer() | calling _updateAudioDevices()');

			await this._updateAudioDevices();

			logger.debug('_setMicProducer() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			const track = stream.getAudioTracks()[0];

			producer = this._room.createProducer(track, null, { source: 'mic' });

			// No need to keep original track.
			track.stop();

			// Send it.
			await producer.send(this._sendTransport);

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

			const harkStream = new MediaStream;

			harkStream.addTrack(producer.track);
			if (!harkStream.getAudioTracks()[0])
				throw new Error('_setMicProducer(): given stream has no audio track');
			producer.hark = hark(harkStream, { play: false });

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
		}
		catch (error)
		{
			logger.error('_setMicProducer() failed:%o', error);

			this.notify(`Mic producer failed: ${error.name}:${error.message}`);

			if (producer)
				producer.close();

			throw error;
		}
	}

	async _setScreenShareProducer()
	{
		if (!this._room.canSend('video'))
			throw new Error('cannot send screen');

		let producer;

		try
		{
			const available = this._screenSharing.isScreenShareAvailable() &&
				!this._screenSharing.needExtension();

			if (!available)
				throw new Error('screen sharing not available');

			logger.debug('_setScreenShareProducer() | calling getUserMedia()');

			const stream = await this._screenSharing.start({
				width     : 1280,
				height    : 720,
				frameRate : 3
			});

			const track = stream.getVideoTracks()[0];

			producer = this._room.createProducer(
				track, { simulcast: false }, { source: 'screen' });

			// No need to keep original track.
			track.stop();

			// Send it.
			await producer.send(this._sendTransport);

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

			logger.debug('_setScreenShareProducer() succeeded');
		}
		catch (error)
		{
			logger.error('_setScreenShareProducer() failed:%o', error);

			this.notify(`Screen share producer failed: ${error.name}:${error.message}`);

			if (producer)
				producer.close();

			throw error;
		}
	}

	async _setWebcamProducer()
	{
		if (!this._room.canSend('video'))
			throw new Error('cannot send video');

		if (this._webcamProducer)
			throw new Error('webcam Producer already exists');

		let producer;

		try
		{
			const { device } = this._webcam;

			if (!device)
				throw new Error('no webcam devices');

			logger.debug('_setWebcamProducer() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					video :
					{
						deviceId : { exact: device.deviceId },
						...VIDEO_CONSTRAINS
					}
				});

			const track = stream.getVideoTracks()[0];

			producer = this._room.createProducer(
				track, { simulcast: this._useSimulcast }, { source: 'webcam' });

			// No need to keep original track.
			track.stop();

			// Send it.
			await producer.send(this._sendTransport);

			this._webcamProducer = producer;

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

			logger.debug('_setWebcamProducer() succeeded');
		}
		catch (error)
		{
			logger.error('_setWebcamProducer() failed:%o', error);

			this.notify(`Webcam producer failed: ${error.name}:${error.message}`);

			if (producer)
				producer.close();

			throw error;
		}
	}

	async _updateAudioDevices()
	{
		logger.debug('_updateAudioDevices()');

		// Reset the list.
		this._audioDevices = new Map();

		try
		{
			logger.debug('_updateAudioDevices() | calling enumerateDevices()');

			const devices = await navigator.mediaDevices.enumerateDevices();

			for (const device of devices)
			{
				if (device.kind !== 'audioinput')
					continue;

				device.value = device.deviceId;

				this._audioDevices.set(device.deviceId, device);
			}

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
				stateActions.setCanChangeAudioDevice(len >= 2));
			if (len >= 1)
				this._dispatch(
					stateActions.setAudioDevices(this._audioDevices));
		}
		catch (error)
		{
			logger.error('_updateAudioDevices() failed:%o', error);
		}
	}

	async _updateWebcams()
	{
		logger.debug('_updateWebcams()');

		// Reset the list.
		this._webcams = new Map();

		try
		{
			logger.debug('_updateWebcams() | calling enumerateDevices()');

			const devices = await navigator.mediaDevices.enumerateDevices();

			for (const device of devices)
			{
				if (device.kind !== 'videoinput')
					continue;

				device.value = device.deviceId;

				this._webcams.set(device.deviceId, device);
			}

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
				stateActions.setCanChangeWebcam(len >= 2));
			if (len >= 1)
				this._dispatch(
					stateActions.setWebcamDevices(this._webcams));
		}
		catch (error)
		{
			logger.error('_updateWebcams() failed:%o', error);
		}
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
				name           : peer.name,
				displayName    : displayName,
				device         : peer.appData.device,
				raiseHandState : peer.appData.raiseHandState,
				consumers      : []
			}));

		if (notify)
		{
			this.notify(`${displayName} joined the room`);
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
				this.notify(`${peer.appData.displayName} left the room`);
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
			if (consumer.kind === 'video' &&
				!this._spotlights.peerInSpotlights(consumer.peer.name))
			{ // Start paused
				logger.debug(
					'consumer paused by default');
				consumer.pause('not-speaker');
			}

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

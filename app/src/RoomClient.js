import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import WebTorrent from 'webtorrent';
import createTorrent from 'create-torrent';
import saveAs from 'file-saver';
import Logger from './Logger';
import hark from 'hark';
import ScreenShare from './ScreenShare';
import Spotlights from './Spotlights';
import { getSignalingUrl } from './urlFactory';
import * as requestActions from './actions/requestActions';
import * as stateActions from './actions/stateActions';
const {
	turnServers,
	requestTimeout,
	transportOptions,
	lastN,
	mobileLastN
} = window.config;

const logger = new Logger('RoomClient');

const ROOM_OPTIONS =
{
	requestTimeout   : requestTimeout,
	transportOptions : transportOptions,
	turnServers      : turnServers
};

const VIDEO_CONSTRAINS =
{
	'low' :
	{
		width       : { ideal: 320 },
		aspectRatio : 1.334
	},
	'medium' :
	{
		width       : { ideal: 640 },
		aspectRatio : 1.334
	},
	'high' :
	{
		width       : { ideal: 1280 },
		aspectRatio : 1.334
	},
	'veryhigh' :
	{
		width       : { ideal: 1920 },
		aspectRatio : 1.334
	},
	'ultra' :
	{
		width       : { ideal: 3840 },
		aspectRatio : 1.334
	}
};

const VIDEO_ENCODINGS =
[
	{ maxBitrate: 180000, scaleResolutionDownBy: 4 },
	{ maxBitrate: 360000, scaleResolutionDownBy: 2 },
	{ maxBitrate: 1500000, scaleResolutionDownBy: 1 }
];

let store;

export default class RoomClient
{
	/**
	 * @param  {Object} data
	 * @param  {Object} data.store - The Redux store.
	 */
	static init(data)
	{
		store = data.store;
	}

	constructor(
		{ roomId, peerId, accessCode, device, useSimulcast, produce, consume, forceTcp })
	{
		logger.debug(
			'constructor() [roomId: "%s", peerId: "%s", device: "%s", useSimulcast: "%s", produce: "%s", consume: "%s", forceTcp: "%s"]',
			roomId, peerId, device.flag, useSimulcast, produce, consume, forceTcp);

		this._signalingUrl = getSignalingUrl(peerId, roomId);

		// window element to external login site
		this._loginWindow = null;

		// Closed flag.
		this._closed = false;

		// Whether we should produce.
		this._produce = produce;

		// Whether we should consume.
		this._consume = consume;

		// Wheter we force TCP
		this._forceTcp = forceTcp;

		// Torrent support
		this._torrentSupport = WebTorrent.WEBRTC_SUPPORT;

		// Whether simulcast should be used.
		this._useSimulcast = useSimulcast;

		// This device
		this._device = device;

		// My peer name.
		this._peerId = peerId;

		// Access code
		this._accessCode = accessCode;

		// Alert sound
		this._soundAlert = new Audio('/sounds/notify.mp3');

		// Socket.io peer connection
		this._signalingSocket = null;

		// The room ID
		this._roomId = roomId;

		// mediasoup-client Device instance.
		// @type {mediasoupClient.Device}
		this._mediasoupDevice = null;

		this._doneJoining = false;

		// Our WebTorrent client
		this._webTorrent = this._torrentSupport && new WebTorrent({
			tracker : {
				rtcConfig : {
					iceServers : ROOM_OPTIONS.turnServers
				}
			}
		});

		// Max spotlights
		if (device.bowser.ios || device.bowser.mobile || device.bowser.android)
			this._maxSpotlights = mobileLastN;
		else
			this._maxSpotlights = lastN;

		// Manager of spotlight
		this._spotlights = null;

		// Transport for sending.
		this._sendTransport = null;

		// Transport for receiving.
		this._recvTransport = null;

		// Local mic mediasoup Producer.
		this._micProducer = null;

		// Local mic hark
		this._hark = null;

		// Local webcam mediasoup Producer.
		this._webcamProducer = null;

		// Map of webcam MediaDeviceInfos indexed by deviceId.
		// @type {Map<String, MediaDeviceInfos>}
		this._webcams = {};

		this._audioDevices = {};

		// mediasoup Consumers.
		// @type {Map<String, mediasoupClient.Consumer>}
		this._consumers = new Map();

		this._screenSharing = ScreenShare.create(device);

		this._screenSharingProducer = null;

		this._startKeyListener();

		this._startDevicesListener();
	}

	close()
	{
		if (this._closed)
			return;

		this._closed = true;

		logger.debug('close()');

		this._signalingSocket.close();

		// Close mediasoup Transports.
		if (this._sendTransport)
			this._sendTransport.close();

		if (this._recvTransport)
			this._recvTransport.close();

		store.dispatch(stateActions.setRoomState('closed'));
	}

	_startKeyListener()
	{
		// Add keypress event listner on document
		document.addEventListener('keypress', (event) =>
		{
			const key = String.fromCharCode(event.which);

			const source = event.target;

			const exclude = [ 'input', 'textarea' ];

			if (exclude.indexOf(source.tagName.toLowerCase()) === -1)
			{
				logger.debug('keyPress() [key:"%s"]', key);

				switch (key)
				{
					case 'a': // Activate advanced mode
					{
						store.dispatch(stateActions.toggleAdvancedMode());
						store.dispatch(requestActions.notify(
							{
								text : 'Toggled advanced mode.'
							}));
						break;
					}

					case '1': // Set democratic view
					{
						store.dispatch(stateActions.setDisplayMode('democratic'));
						store.dispatch(requestActions.notify(
							{
								text : 'Changed layout to democratic view.'
							}));
						break;
					}

					case '2': // Set filmstrip view
					{
						store.dispatch(stateActions.setDisplayMode('filmstrip'));
						store.dispatch(requestActions.notify(
							{
								text : 'Changed layout to filmstrip view.'
							}));
						break;
					}

					case 'm': // Toggle microphone
					{
						if (this._micProducer)
						{
							if (this._micProducer.paused)
							{
								this._micProducer.resume();

								store.dispatch(requestActions.notify(
									{
										text : 'Unmuted your microphone.'
									}));
							}
							else
							{
								this._micProducer.pause();

								store.dispatch(requestActions.notify(
									{
										text : 'Muted your microphone.'
									}));
							}
						}
						else
						{
							this.enableMic();
						}

						break;
					}

					default:
					{
						break;
					}
				}
			}
		});
	}

	_startDevicesListener()
	{
		navigator.mediaDevices.addEventListener('devicechange', async () =>
		{
			logger.debug('_startDevicesListener() | navigator.mediaDevices.ondevicechange');

			await this._updateAudioDevices();
			await this._updateWebcams();

			store.dispatch(requestActions.notify(
				{
					text : 'Your devices changed, configure your devices in the settings dialog.'
				}));
		});
	}

	login()
	{
		const url = `/auth/login?roomId=${this._roomId}&peerId=${this._peerId}`;

		this._loginWindow = window.open(url, 'loginWindow');
	}

	logout()
	{
		window.location = '/auth/logout';
	}

	receiveFromChildWindow(data)
	{
		logger.debug('receiveFromChildWindow() | [data:"%o"]', data);

		const { displayName, picture } = data;

		if (store.getState().room.joined)
		{
			this.changeDisplayName(displayName);
			this.changeProfilePicture(picture);
		}

		store.dispatch(stateActions.setPicture(picture));
		store.dispatch(stateActions.loggedIn());

		store.dispatch(requestActions.notify(
			{
				text : 'You are logged in.'
			}));
	}

	_soundNotification()
	{
		const alertPromise = this._soundAlert.play();

		if (alertPromise !== undefined)
		{
			alertPromise
				.then()
				.catch((error) =>
				{
					logger.error('_soundAlert.play() | failed: %o', error);
				});
		}
	}

	notify(text)
	{
		store.dispatch(requestActions.notify({ text: text }));
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
				callback(new Error('Request timeout.'));
			},
			ROOM_OPTIONS.requestTimeout
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
				this._signalingSocket.emit(
					'request',
					{ method, data },
					this.timeoutCallback((err, response) =>
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
			}
		});
	}

	async changeDisplayName(displayName)
	{
		logger.debug('changeDisplayName() [displayName:"%s"]', displayName);

		try
		{
			await this.sendRequest('changeDisplayName', { displayName });

			store.dispatch(stateActions.setDisplayName(displayName));

			store.dispatch(requestActions.notify(
				{
					text : `Your display name changed to ${displayName}.`
				}));
		}
		catch (error)
		{
			logger.error('changeDisplayName() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'An error occured while changing your display name.'
				}));

			// We need to refresh the component for it to render the previous
			// displayName again.
			store.dispatch(stateActions.setDisplayName());
		}
	}

	async changeProfilePicture(picture)
	{
		logger.debug('changeProfilePicture() [picture: "%s"]', picture);

		try
		{
			await this.sendRequest('changeProfilePicture', { picture });
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
			store.dispatch(
				stateActions.addUserMessage(chatMessage.text));

			await this.sendRequest('chatMessage', { chatMessage });
		}
		catch (error)
		{
			logger.error('sendChatMessage() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to send chat message.'
				}));
		}
	}

	saveFile(file)
	{
		file.getBlob((err, blob) =>
		{
			if (err)
			{
				return store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : 'Unable to save file.'
					}));
			}

			saveAs(blob, file.name);
		});
	}

	handleDownload(magnetUri)
	{
		store.dispatch(
			stateActions.setFileActive(magnetUri));

		const existingTorrent = this._webTorrent.get(magnetUri);

		if (existingTorrent)
		{
			// Never add duplicate torrents, use the existing one instead.
			return this._handleTorrent(existingTorrent);
		}

		this._webTorrent.add(magnetUri, this._handleTorrent);
	}

	_handleTorrent(torrent)
	{
		// Torrent already done, this can happen if the
		// same file was sent multiple times.
		if (torrent.progress === 1)
		{
			return store.dispatch(
				stateActions.setFileDone(
					torrent.magnetURI,
					torrent.files
				));
		}

		let lastMove = 0;

		torrent.on('download', () =>
		{
			if (Date.now() - lastMove > 1000)
			{
				store.dispatch(
					stateActions.setFileProgress(
						torrent.magnetURI,
						torrent.progress
					));

				lastMove = Date.now();
			}
		});

		torrent.on('done', () => 
		{
			store.dispatch(
				stateActions.setFileDone(
					torrent.magnetURI,
					torrent.files
				));
		});
	}

	async shareFiles(files)
	{
		store.dispatch(requestActions.notify(
			{
				text : 'Starting file share.'
			}));

		createTorrent(files, (err, torrent) =>
		{
			if (err)
			{
				return store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : 'Unable to upload file.'
					}));
			}

			const existingTorrent = this._webTorrent.get(torrent);

			if (existingTorrent)
			{
				return this._sendFile(existingTorrent.magnetURI);
			}

			this._webTorrent.seed(files, (newTorrent) =>
			{
				store.dispatch(requestActions.notify(
					{
						text : 'File successfully shared.'
					}));

				store.dispatch(stateActions.addFile(
					this._peerId,
					newTorrent.magnetURI
				));

				this._sendFile(newTorrent.magnetURI);
			});
		});
	}

	// { file, name, picture }
	async _sendFile(magnetUri)
	{
		logger.debug('sendFile() [magnetUri: %o]', magnetUri);

		try
		{
			await this.sendRequest('sendFile', { magnetUri });
		}
		catch (error)
		{
			logger.error('sendFile() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to share file.'
				}));
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
				lastNHistory,
				locked,
				lobbyPeers,
				accessCode
			} = await this.sendRequest('serverHistory');

			(chatHistory.length > 0) && store.dispatch(
				stateActions.addChatHistory(chatHistory));

			(fileHistory.length > 0) && store.dispatch(
				stateActions.addFileHistory(fileHistory));

			if (lastNHistory.length > 0)
			{
				logger.debug('Got lastNHistory');

				// Remove our self from list
				const index = lastNHistory.indexOf(this._peerId);

				lastNHistory.splice(index, 1);

				this._spotlights.addSpeakerList(lastNHistory);
			}

			locked ? 
				store.dispatch(stateActions.setRoomLocked()) :
				store.dispatch(stateActions.setRoomUnLocked());

			(lobbyPeers.length > 0) && lobbyPeers.forEach((peer) =>
			{
				store.dispatch(
					stateActions.addLobbyPeer(peer.peerId));
				store.dispatch(
					stateActions.setLobbyPeerDisplayName(peer.displayName));
			});

			(accessCode != null) && store.dispatch(
				stateActions.setAccessCode(accessCode));
		}
		catch (error)
		{
			logger.error('getServerHistory() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to retrieve room history.'
				}));
		}
	}

	async muteMic()
	{
		logger.debug('muteMic()');

		this._micProducer.pause();

		try
		{
			await this.sendRequest(
				'pauseProducer', { producerId: this._micProducer.id });

			store.dispatch(
				stateActions.setProducerPaused(this._micProducer.id));
		}
		catch (error)
		{
			logger.error('muteMic() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to access your microphone.'
				}));
		}
	}

	async unmuteMic()
	{
		logger.debug('unmuteMic()');

		if (!this._micProducer)
		{
			this.enableMic();
		}
		else
		{
			this._micProducer.resume();

			try
			{
				await this.sendRequest(
					'resumeProducer', { producerId: this._micProducer.id });
	
				store.dispatch(
					stateActions.setProducerResumed(this._micProducer.id));
			}
			catch (error)
			{
				logger.error('unmuteMic() | failed: %o', error);
	
				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : 'An error occured while accessing your microphone.'
					}));
			}
		}
	}

	// Updated consumers based on spotlights
	async updateSpotlights(spotlights)
	{
		logger.debug('updateSpotlights()');

		try
		{
			for (const consumer of this._consumers.values())
			{
				if (consumer.kind === 'video')
				{
					if (spotlights.indexOf(consumer.appData.peerId) > -1)
					{
						await this._resumeConsumer(consumer);
					}
					else
					{
						await this._pauseConsumer(consumer);
					}
				}
			}
		}
		catch (error)
		{
			logger.error('updateSpotlights() failed: %o', error);
		}
	}

	async changeAudioDevice(deviceId)
	{
		logger.debug('changeAudioDevice() [deviceId: %s]', deviceId);

		store.dispatch(
			stateActions.setAudioInProgress(true));

		try
		{
			const device = this._audioDevices[deviceId];

			if (!device)
				throw new Error('no audio devices');

			logger.debug(
				'changeAudioDevice() | new selected webcam [device:%o]',
				device);
			
			this._micProducer.track.stop();

			logger.debug('changeAudioDevice() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					audio :
					{
						deviceId : { exact: device.deviceId }
					}
				});

			const track = stream.getAudioTracks()[0];

			await this._micProducer.replaceTrack({ track });

			this._micProducer.volume = 0;

			const harkStream = new MediaStream();

			harkStream.addTrack(track);

			if (!harkStream.getAudioTracks()[0])
				throw new Error('changeAudioDevice(): given stream has no audio track');

			if (this._hark != null)
				this._hark.stop();

			this._hark = hark(harkStream, { play: false });

			// eslint-disable-next-line no-unused-vars
			this._hark.on('volume_change', (dBs, threshold) =>
			{
				// The exact formula to convert from dBs (-100..0) to linear (0..1) is:
				//   Math.pow(10, dBs / 20)
				// However it does not produce a visually useful output, so let exagerate
				// it a bit. Also, let convert it from 0..1 to 0..10 and avoid value 1 to
				// minimize component renderings.
				let volume = Math.round(Math.pow(10, dBs / 85) * 10);

				if (volume === 1)
					volume = 0;

				volume = Math.round(volume);

				if (this._micProducer && volume !== this._micProducer.volume)
				{
					this._micProducer.volume = volume;

					store.dispatch(stateActions.setPeerVolume(this._peerId, volume));
				}
			});

			store.dispatch(
				stateActions.setProducerTrack(this._micProducer.id, track));

			store.dispatch(stateActions.setSelectedAudioDevice(deviceId));

			await this._updateAudioDevices();
		}
		catch (error)
		{
			logger.error('changeAudioDevice() failed: %o', error);
		}

		store.dispatch(
			stateActions.setAudioInProgress(false));
	}

	async changeVideoResolution(resolution)
	{
		logger.debug('changeVideoResolution() [resolution: %s]', resolution);

		store.dispatch(
			stateActions.setWebcamInProgress(true));

		try
		{
			const deviceId = await this._getWebcamDeviceId();

			const device = this._webcams[deviceId];

			if (!device)
				throw new Error('no webcam devices');

			this._webcamProducer.track.stop();

			logger.debug('changeVideoResolution() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					video :
					{
						deviceId : { exact: device.deviceId },
						...VIDEO_CONSTRAINS[resolution]
					}
				});

			const track = stream.getVideoTracks()[0];

			await this._webcamProducer.replaceTrack({ track });

			store.dispatch(
				stateActions.setProducerTrack(this._webcamProducer.id, track));

			store.dispatch(stateActions.setSelectedWebcamDevice(deviceId));
			store.dispatch(stateActions.setVideoResolution(resolution));

			await this._updateWebcams();
		}
		catch (error)
		{
			logger.error('changeVideoResolution() failed: %o', error);
		}

		store.dispatch(
			stateActions.setWebcamInProgress(false));
	}

	async changeWebcam(deviceId)
	{
		logger.debug('changeWebcam() [deviceId: %s]', deviceId);

		store.dispatch(
			stateActions.setWebcamInProgress(true));

		try
		{
			const device = this._webcams[deviceId];
			const resolution = store.getState().settings.resolution;

			if (!device)
				throw new Error('no webcam devices');
			
			logger.debug(
				'changeWebcam() | new selected webcam [device:%o]',
				device);

			this._webcamProducer.track.stop();

			logger.debug('changeWebcam() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					video :
					{
						deviceId : { exact: device.deviceId },
						...VIDEO_CONSTRAINS[resolution]
					}
				});

			const track = stream.getVideoTracks()[0];

			await this._webcamProducer.replaceTrack({ track });

			store.dispatch(
				stateActions.setProducerTrack(this._webcamProducer.id, track));

			store.dispatch(stateActions.setSelectedWebcamDevice(deviceId));

			await this._updateWebcams();
		}
		catch (error)
		{
			logger.error('changeWebcam() failed: %o', error);
		}

		store.dispatch(
			stateActions.setWebcamInProgress(false));
	}

	setSelectedPeer(peerId)
	{
		logger.debug('setSelectedPeer() [peerId:"%s"]', peerId);

		this._spotlights.setPeerSpotlight(peerId);

		store.dispatch(
			stateActions.setSelectedPeer(peerId));
	}

	async promoteLobbyPeer(peerId)
	{
		logger.debug('promoteLobbyPeer() [peerId:"%s"]', peerId);

		store.dispatch(
			stateActions.setLobbyPeerPromotionInProgress(peerId, true));

		try
		{
			await this.sendRequest('promotePeer', { peerId });
		}
		catch (error)
		{
			logger.error('promoteLobbyPeer() failed: %o', error);
		}

		store.dispatch(
			stateActions.setLobbyPeerPromotionInProgress(peerId, false));
	}

	// type: mic/webcam/screen
	// mute: true/false
	async modifyPeerConsumer(peerId, type, mute)
	{
		logger.debug(
			'modifyPeerConsumer() [peerId:"%s", type:"%s"]',
			peerId,
			type
		);

		if (type === 'mic')
			store.dispatch(
				stateActions.setPeerAudioInProgress(peerId, true));
		else if (type === 'webcam')
			store.dispatch(
				stateActions.setPeerVideoInProgress(peerId, true));
		else if (type === 'screen')
			store.dispatch(
				stateActions.setPeerScreenInProgress(peerId, true));

		try
		{
			for (const consumer of this._consumers.values())
			{
				if (consumer.appData.peerId === peerId && consumer.appData.source === type)
				{
					if (mute)
					{
						await this._pauseConsumer(consumer);
					}
					else
						await this._resumeConsumer(consumer);
				}
			}
		}
		catch (error)
		{
			logger.error('modifyPeerConsumer() failed: %o', error);
		}

		if (type === 'mic')
			store.dispatch(
				stateActions.setPeerAudioInProgress(peerId, false));
		else if (type === 'webcam')
			store.dispatch(
				stateActions.setPeerVideoInProgress(peerId, false));
		else if (type === 'screen')
			store.dispatch(
				stateActions.setPeerScreenInProgress(peerId, false));
	}

	async _pauseConsumer(consumer)
	{
		logger.debug('_pauseConsumer() [consumer: %o]', consumer);

		if (consumer.paused || consumer.closed)
			return;

		try
		{
			await this.sendRequest('pauseConsumer', { consumerId: consumer.id });

			consumer.pause();

			store.dispatch(
				stateActions.setConsumerPaused(consumer.id, 'local'));
		}
		catch (error)
		{
			logger.error('_pauseConsumer() | failed:%o', error);
		}
	}

	async _resumeConsumer(consumer)
	{
		logger.debug('_resumeConsumer() [consumer: %o]', consumer);

		if (!consumer.paused || consumer.closed)
			return;

		try
		{
			await this.sendRequest('resumeConsumer', { consumerId: consumer.id });

			consumer.resume();

			store.dispatch(
				stateActions.setConsumerResumed(consumer.id, 'local'));
		}
		catch (error)
		{
			logger.error('_resumeConsumer() | failed:%o', error);
		}
	}

	async sendRaiseHandState(state)
	{
		logger.debug('sendRaiseHandState: ', state);

		store.dispatch(
			stateActions.setMyRaiseHandStateInProgress(true));

		try
		{
			await this.sendRequest('raiseHand', { raiseHandState: state });

			store.dispatch(
				stateActions.setMyRaiseHandState(state));
		}
		catch (error)
		{
			logger.error('sendRaiseHandState() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : `An error occured while ${state ? 'raising' : 'lowering'} hand.`
				}));

			// We need to refresh the component for it to render changed state
			store.dispatch(stateActions.setMyRaiseHandState(!state));
		}

		store.dispatch(
			stateActions.setMyRaiseHandStateInProgress(false));
	}

	async join({ joinVideo })
	{
		this._signalingSocket = io(this._signalingUrl);

		this._spotlights = new Spotlights(this._maxSpotlights, this._signalingSocket);

		store.dispatch(stateActions.toggleJoined());
		store.dispatch(stateActions.setRoomState('connecting'));

		this._signalingSocket.on('connect', () =>
		{
			logger.debug('signaling Peer "connect" event');
		});

		this._signalingSocket.on('disconnect', () =>
		{
			logger.warn('signaling Peer "disconnect" event');

			store.dispatch(requestActions.notify(
				{
					text : 'You are disconnected.'
				}));

			// Close mediasoup Transports.
			if (this._sendTransport)
			{
				this._sendTransport.close();
				this._sendTransport = null;
			}

			if (this._recvTransport)
			{
				this._recvTransport.close();
				this._recvTransport = null;
			}

			store.dispatch(stateActions.setRoomState('closed'));
		});

		this._signalingSocket.on('close', () =>
		{
			if (this._closed)
				return;

			logger.warn('signaling Peer "close" event');

			this.close();
		});

		this._signalingSocket.on('request', async (request, cb) =>
		{
			logger.debug(
				'socket "request" event [method:%s, data:%o]',
				request.method, request.data);

			switch (request.method)
			{
				case 'newConsumer':
				{
					const {
						peerId,
						producerId,
						id,
						kind,
						rtpParameters,
						type,
						appData,
						producerPaused
					} = request.data;

					let codecOptions;

					if (kind === 'audio')
					{
						codecOptions =
						{
							opusStereo : 1
						};
					}

					const consumer = await this._recvTransport.consume(
						{
							id,
							producerId,
							kind,
							rtpParameters,
							codecOptions,
							appData : { ...appData, peerId } // Trick.
						});

					// Store in the map.
					this._consumers.set(consumer.id, consumer);

					consumer.on('transportclose', () =>
					{
						this._consumers.delete(consumer.id);
					});

					const { spatialLayers, temporalLayers } =
						mediasoupClient.parseScalabilityMode(
							consumer.rtpParameters.encodings[0].scalabilityMode);

					store.dispatch(stateActions.addConsumer(
						{
							id                     : consumer.id,
							peerId                 : peerId,
							kind                   : kind,
							type                   : type,
							locallyPaused          : false,
							remotelyPaused         : producerPaused,
							rtpParameters          : consumer.rtpParameters,
							source                 : consumer.appData.source,
							spatialLayers          : spatialLayers,
							temporalLayers         : temporalLayers,
							preferredSpatialLayer  : spatialLayers - 1,
							preferredTemporalLayer : temporalLayers - 1,
							codec                  : consumer.rtpParameters.codecs[0].mimeType.split('/')[1],
							track                  : consumer.track
						},
						peerId));

					// We are ready. Answer the request so the server will
					// resume this Consumer (which was paused for now).
					cb(null);

					if (kind === 'audio')
					{
						consumer.volume = 0;

						const stream = new MediaStream();

						stream.addTrack(consumer.track);

						if (!stream.getAudioTracks()[0])
							throw new Error('request.newConsumer | given stream has no audio track');

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

							volume = Math.round(volume);

							if (consumer && volume !== consumer.volume)
							{
								consumer.volume = volume;

								store.dispatch(stateActions.setPeerVolume(peerId, volume));
							}
						});
					}

					break;
				}

				default:
				{
					logger.error('unknown request.method "%s"', request.method);

					cb(500, `unknown request.method "${request.method}"`);
				}
			}
		});

		this._signalingSocket.on('notification', async (notification) =>
		{
			logger.debug(
				'socket "notification" event [method:%s, data:%o]',
				notification.method, notification.data);

			switch (notification.method)
			{
				case 'enteredLobby':
				{
					const { displayName } = store.getState().settings;

					await this.sendRequest('changeDisplayName', { displayName });
					break;
				}

				case 'roomReady':
				{
					await this._joinRoom({ joinVideo });

					break;
				}

				case 'roomLocked':
				{
					store.dispatch(stateActions.setRoomLockedOut());

					break;
				}

				case 'lockRoom':
				{
					store.dispatch(
						stateActions.setRoomLocked());

					store.dispatch(requestActions.notify(
						{
							text : 'Room is now locked.'
						}));

					break;
				}

				case 'unlockRoom':
				{
					store.dispatch(
						stateActions.setRoomUnLocked());
					
					store.dispatch(requestActions.notify(
						{
							text : 'Room is now unlocked.'
						}));

					break;
				}

				case 'parkedPeer':
				{
					const { peerId } = notification.data;

					store.dispatch(
						stateActions.addLobbyPeer(peerId));

					store.dispatch(requestActions.notify(
						{
							text : 'New participant entered the lobby.'
						}));

					break;
				}

				case 'lobbyPeerClosed':
				{
					const { peerId } = notification.data;

					store.dispatch(
						stateActions.removeLobbyPeer(peerId));

					store.dispatch(requestActions.notify(
						{
							text : 'Participant in lobby left.'
						}));

					break;
				}

				case 'promotedPeer':
				{
					const { peerId } = notification.data;

					store.dispatch(
						stateActions.removeLobbyPeer(peerId));

					break;
				}

				case 'lobbyPeerDisplayNameChanged':
				{
					const { peerId, displayName } = notification.data;

					store.dispatch(
						stateActions.setLobbyPeerDisplayName(displayName, peerId));

					store.dispatch(requestActions.notify(
						{
							text : `Participant in lobby changed name to ${displayName}.`
						}));

					break;
				}

				case 'setAccessCode':
				{
					const { accessCode } = notification.data;

					store.dispatch(
						stateActions.setAccessCode(accessCode));
					
					store.dispatch(requestActions.notify(
						{
							text : 'Access code for room updated'
						}));

					break;
				}

				case 'setJoinByAccessCode':
				{
					const { joinByAccessCode } = notification.data;
					
					store.dispatch(
						stateActions.setJoinByAccessCode(joinByAccessCode));
					
					if (joinByAccessCode) 
					{
						store.dispatch(requestActions.notify(
							{
								text : 'Access code for room is now activated'
							}));
					}
					else 
					{
						store.dispatch(requestActions.notify(
							{
								text : 'Access code for room is now deactivated'
							}));
					}

					break;
				}

				case 'activeSpeaker':
				{
					const { peerId } = notification.data;

					store.dispatch(
						stateActions.setRoomActiveSpeaker(peerId));
					
					if (peerId && peerId !== this._peerId)
						this._spotlights.handleActiveSpeaker(peerId);

					break;
				}

				case 'changeDisplayName':
				{
					const { peerId, displayName, oldDisplayName } = notification.data;

					store.dispatch(
						stateActions.setPeerDisplayName(displayName, peerId));

					store.dispatch(requestActions.notify(
						{
							text : `${oldDisplayName} is now ${displayName}`
						}));

					break;
				}

				case 'changeProfilePicture':
				{
					const { peerId, picture } = notification.data;

					store.dispatch(stateActions.setPeerPicture(peerId, picture));

					break;
				}

				case 'chatMessage':
				{
					const { peerId, chatMessage } = notification.data;

					store.dispatch(
						stateActions.addResponseMessage({ ...chatMessage, peerId }));

					if (
						!store.getState().toolarea.toolAreaOpen ||
						(store.getState().toolarea.toolAreaOpen &&
						store.getState().toolarea.currentToolTab !== 'chat')
					) // Make sound
					{
						this._soundNotification();
					}

					break;
				}

				case 'sendFile':
				{
					const { peerId, magnetUri } = notification.data;

					store.dispatch(stateActions.addFile(peerId, magnetUri));

					store.dispatch(requestActions.notify(
						{
							text : 'New file available.'
						}));

					if (
						!store.getState().toolarea.toolAreaOpen ||
						(store.getState().toolarea.toolAreaOpen &&
						store.getState().toolarea.currentToolTab !== 'files')
					) // Make sound
					{
						this._soundNotification();
					}

					break;
				}

				case 'producerScore':
				{
					const { producerId, score } = notification.data;

					store.dispatch(
						stateActions.setProducerScore(producerId, score));

					break;
				}

				case 'newPeer':
				{
					const { id, displayName, picture, device } = notification.data;

					store.dispatch(
						stateActions.addPeer({ id, displayName, picture, device, consumers: [] }));

					store.dispatch(requestActions.notify(
						{
							text : `${displayName} joined the room.`
						}));

					break;
				}

				case 'peerClosed':
				{
					const { peerId } = notification.data;

					store.dispatch(
						stateActions.removePeer(peerId));

					break;
				}

				case 'consumerClosed':
				{
					const { consumerId } = notification.data;
					const consumer = this._consumers.get(consumerId);

					if (!consumer)
						break;

					consumer.close();

					if (consumer.hark != null)
						consumer.hark.stop();

					this._consumers.delete(consumerId);

					const { peerId } = consumer.appData;

					store.dispatch(
						stateActions.removeConsumer(consumerId, peerId));

					break;
				}

				case 'consumerPaused':
				{
					const { consumerId } = notification.data;
					const consumer = this._consumers.get(consumerId);

					if (!consumer)
						break;

					store.dispatch(
						stateActions.setConsumerPaused(consumerId, 'remote'));

					break;
				}

				case 'consumerResumed':
				{
					const { consumerId } = notification.data;
					const consumer = this._consumers.get(consumerId);

					if (!consumer)
						break;

					store.dispatch(
						stateActions.setConsumerResumed(consumerId, 'remote'));

					break;
				}

				case 'consumerLayersChanged':
				{
					const { consumerId, spatialLayer, temporalLayer } = notification.data;
					const consumer = this._consumers.get(consumerId);

					if (!consumer)
						break;

					store.dispatch(stateActions.setConsumerCurrentLayers(
						consumerId, spatialLayer, temporalLayer));

					break;
				}

				case 'consumerScore':
				{
					const { consumerId, score } = notification.data;

					store.dispatch(
						stateActions.setConsumerScore(consumerId, score));

					break;
				}

				default:
				{
					logger.error(
						'unknown notification.method "%s"', notification.method);
				}
			}
		});
	}

	async _joinRoom({ joinVideo })
	{
		logger.debug('_joinRoom()');

		const {
			displayName,
			picture
		} = store.getState().settings;

		try
		{
			this._mediasoupDevice = new mediasoupClient.Device();

			const routerRtpCapabilities =
				await this.sendRequest('getRouterRtpCapabilities');

			await this._mediasoupDevice.load({ routerRtpCapabilities });

			if (this._produce)
			{
				const transportInfo = await this.sendRequest(
					'createWebRtcTransport',
					{
						forceTcp  : this._forceTcp,
						producing : true,
						consuming : false
					});

				const {
					id,
					iceParameters,
					iceCandidates,
					dtlsParameters
				} = transportInfo;

				this._sendTransport = this._mediasoupDevice.createSendTransport(
					{
						id,
						iceParameters,
						iceCandidates,
						dtlsParameters
					});

				this._sendTransport.on(
					'connect', ({ dtlsParameters }, callback, errback) => // eslint-disable-line no-shadow
					{
						this.sendRequest(
							'connectWebRtcTransport',
							{
								transportId : this._sendTransport.id,
								dtlsParameters
							})
							.then(callback)
							.catch(errback);
					});

				this._sendTransport.on(
					'produce', ({ kind, rtpParameters, appData }, callback, errback) =>
					{
						this.sendRequest(
							'produce',
							{
								transportId : this._sendTransport.id,
								kind,
								rtpParameters,
								appData
							})
							.then(callback)
							.catch(errback);
					});
			}

			if (this._consume)
			{
				const transportInfo = await this.sendRequest(
					'createWebRtcTransport',
					{
						forceTcp  : this._forceTcp,
						producing : false,
						consuming : true
					});

				const {
					id,
					iceParameters,
					iceCandidates,
					dtlsParameters
				} = transportInfo;

				this._recvTransport = this._mediasoupDevice.createRecvTransport(
					{
						id,
						iceParameters,
						iceCandidates,
						dtlsParameters
					});

				this._recvTransport.on(
					'connect', ({ dtlsParameters }, callback, errback) => // eslint-disable-line no-shadow
					{
						this.sendRequest(
							'connectWebRtcTransport',
							{
								transportId : this._recvTransport.id,
								dtlsParameters
							})
							.then(callback)
							.catch(errback);
					});
			}

			// Set our media capabilities.
			store.dispatch(stateActions.setMediaCapabilities(
				{
					canSendMic     : this._mediasoupDevice.canProduce('audio'),
					canSendWebcam  : this._mediasoupDevice.canProduce('video'),
					canShareScreen : this._mediasoupDevice.canProduce('video') &&
						this._screenSharing.isScreenShareAvailable(),
					canShareFiles : this._torrentSupport
				}));

			const { peers } = await this.sendRequest(
				'join',
				{
					displayName     : displayName,
					picture         : picture,
					device          : this._device,
					rtpCapabilities : this._consume
						? this._mediasoupDevice.rtpCapabilities
						: undefined
				});
			
			for (const peer of peers)
			{
				store.dispatch(
					stateActions.addPeer({ ...peer, consumers: [] }));
			}

			this._spotlights.addPeers(peers);

			this._spotlights.on('spotlights-updated', (spotlights) =>
			{
				store.dispatch(stateActions.setSpotlights(spotlights));
				this.updateSpotlights(spotlights);
			});

			// Don't produce if explicitely requested to not to do it.
			if (this._produce)
			{
				if (this._mediasoupDevice.canProduce('audio'))
					this.enableMic();

				if (joinVideo && this._mediasoupDevice.canProduce('video'))
					this.enableWebcam();
			}

			store.dispatch(stateActions.setRoomState('connected'));

			// Clean all the existing notifcations.
			store.dispatch(stateActions.removeAllNotifications());

			this.getServerHistory();

			store.dispatch(requestActions.notify(
				{
					text : 'You have joined the room.'
				}));

			this._spotlights.start();
		}
		catch (error)
		{
			logger.error('_joinRoom() failed:%o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to join the room.'
				}));

			this.close();
		}
	}

	async lockRoom()
	{
		logger.debug('lockRoom()');

		try
		{
			await this.sendRequest('lockRoom');

			store.dispatch(
				stateActions.setRoomLocked());

			store.dispatch(requestActions.notify(
				{
					text : 'You locked the room.'
				}));
		}
		catch (error)
		{
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to lock the room.'
				}));

			logger.error('lockRoom() | failed: %o', error);
		}
	}

	async unlockRoom()
	{
		logger.debug('unlockRoom()');

		try
		{
			await this.sendRequest('unlockRoom');

			store.dispatch(
				stateActions.setRoomUnLocked());

			store.dispatch(requestActions.notify(
				{
					text : 'You unlocked the room.'
				}));
		}
		catch (error)
		{
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to unlock the room.'
				}));

			logger.error('unlockRoom() | failed: %o', error);
		}
	}

	async setAccessCode(code)
	{
		logger.debug('setAccessCode()');

		try
		{
			await this.sendRequest('setAccessCode', { accessCode: code });

			store.dispatch(
				stateActions.setAccessCode(code));

			store.dispatch(requestActions.notify(
				{
					text : 'Access code saved.'
				}));
		}
		catch (error)
		{
			logger.error('setAccessCode() | failed: %o', error);
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to set access code.'
				}));
		}
	}

	async setJoinByAccessCode(value)
	{
		logger.debug('setJoinByAccessCode()');

		try
		{
			await this.sendRequest('setJoinByAccessCode', { joinByAccessCode: value });

			store.dispatch(
				stateActions.setJoinByAccessCode(value));

			store.dispatch(requestActions.notify(
				{
					text : `You switched Join by access-code to ${value}`
				}));
		}
		catch (error)
		{
			logger.error('setAccessCode() | failed: %o', error);
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to set join by access code.'
				}));
		}
	}

	async enableMic()
	{
		if (this._micProducer)
			return;

		if (!this._mediasoupDevice.canProduce('audio'))
		{
			logger.error('enableMic() | cannot produce audio');

			return;
		}

		let track;

		store.dispatch(
			stateActions.setAudioInProgress(true));

		try
		{
			const deviceId = await this._getAudioDeviceId();

			const device = this._audioDevices[deviceId];

			if (!device)
				throw new Error('no audio devices');
			
			logger.debug(
				'enableMic() | new selected audio device [device:%o]',
				device);

			logger.debug('enableMic() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					audio : {
						deviceId : { exact: deviceId }
					}
				}
			);

			track = stream.getAudioTracks()[0];

			this._micProducer = await this._sendTransport.produce(
				{
					track,
					codecOptions :
					{
						opusStereo : 1,
						opusDtx    : 1
					},
					appData : 
					{ source: 'mic' }
				});

			store.dispatch(stateActions.addProducer(
				{
					id            : this._micProducer.id,
					source        : 'mic',
					paused        : this._micProducer.paused,
					track         : this._micProducer.track,
					rtpParameters : this._micProducer.rtpParameters,
					codec         : this._micProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
				}));

			store.dispatch(stateActions.setSelectedAudioDevice(deviceId));

			await this._updateAudioDevices();

			this._micProducer.on('transportclose', () =>
			{
				this._micProducer = null;
			});

			this._micProducer.on('trackended', () =>
			{
				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : 'Microphone disconnected!'
					}));

				this.disableMic()
					.catch(() => {});
			});

			this._micProducer.volume = 0;

			const harkStream = new MediaStream();

			harkStream.addTrack(track);

			if (!harkStream.getAudioTracks()[0])
				throw new Error('enableMic(): given stream has no audio track');

			if (this._hark != null)
				this._hark.stop();

			this._hark = hark(harkStream, { play: false });

			// eslint-disable-next-line no-unused-vars
			this._hark.on('volume_change', (dBs, threshold) =>
			{
				// The exact formula to convert from dBs (-100..0) to linear (0..1) is:
				//   Math.pow(10, dBs / 20)
				// However it does not produce a visually useful output, so let exagerate
				// it a bit. Also, let convert it from 0..1 to 0..10 and avoid value 1 to
				// minimize component renderings.
				let volume = Math.round(Math.pow(10, dBs / 85) * 10);

				if (volume === 1)
					volume = 0;

				volume = Math.round(volume);

				if (this._micProducer && volume !== this._micProducer.volume)
				{
					this._micProducer.volume = volume;

					store.dispatch(stateActions.setPeerVolume(this._peerId, volume));
				}
			});
		}
		catch (error)
		{
			logger.error('enableMic() failed:%o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'An error occured while accessing your microphone.'
				}));

			if (track)
				track.stop();

		}

		store.dispatch(
			stateActions.setAudioInProgress(false));
	}

	async disableMic()
	{
		logger.debug('disableMic()');

		if (!this._micProducer)
			return;

		store.dispatch(stateActions.setAudioInProgress(true));

		this._micProducer.close();

		store.dispatch(
			stateActions.removeProducer(this._micProducer.id));

		try
		{
			await this.sendRequest(
				'closeProducer', { producerId: this._micProducer.id });
		}
		catch (error)
		{
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : `Error closing server-side mic Producer: ${error}`
				}));
		}

		this._micProducer = null;

		store.dispatch(stateActions.setAudioInProgress(false));
	}

	async enableScreenSharing()
	{
		if (this._screenSharingProducer)
			return;

		if (!this._mediasoupDevice.canProduce('video'))
		{
			logger.error('enableScreenSharing() | cannot produce video');

			return;
		}

		let track;

		store.dispatch(stateActions.setScreenShareInProgress(true));

		try
		{
			const available = this._screenSharing.isScreenShareAvailable();

			if (!available)
				throw new Error('screen sharing not available');

			logger.debug('enableScreenSharing() | calling getUserMedia()');

			const stream = await this._screenSharing.start({
				width     : 1280,
				height    : 720,
				frameRate : 3
			});

			track = stream.getVideoTracks()[0];

			if (this._useSimulcast)
			{
				this._screenSharingProducer = await this._sendTransport.produce(
					{
						track,
						encodings    : VIDEO_ENCODINGS,
						codecOptions :
						{
							videoGoogleStartBitrate : 1000
						},
						appData : 
						{
							source : 'screen'
						}
					});
			}
			else
			{
				this._screenSharingProducer = await this._sendTransport.produce({
					track,
					appData : 
					{
						source : 'screen'
					}
				});
			}

			store.dispatch(stateActions.addProducer(
				{
					id            : this._screenSharingProducer.id,
					deviceLabel   : 'screen',
					source        : 'screen',
					paused        : this._screenSharingProducer.paused,
					track         : this._screenSharingProducer.track,
					rtpParameters : this._screenSharingProducer.rtpParameters,
					codec         : this._screenSharingProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
				}));

			this._screenSharingProducer.on('transportclose', () =>
			{
				this._screenSharingProducer = null;
			});

			this._screenSharingProducer.on('trackended', () =>
			{
				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : 'Screen sharing disconnected!'
					}));

				this.disableScreenSharing()
					.catch(() => {});
			});

			logger.debug('enableScreenSharing() succeeded');
		}
		catch (error)
		{
			logger.error('enableScreenSharing() failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'An error occured while accessing your camera.'
				}));

			if (track)
				track.stop();
		}

		store.dispatch(stateActions.setScreenShareInProgress(false));
	}

	async disableScreenSharing()
	{
		logger.debug('disableScreenSharing()');

		if (!this._screenSharingProducer)
			return;

		store.dispatch(stateActions.setScreenShareInProgress(true));

		this._screenSharingProducer.close();

		store.dispatch(
			stateActions.removeProducer(this._screenSharingProducer.id));

		try
		{
			await this.sendRequest(
				'closeProducer', { producerId: this._screenSharingProducer.id });
		}
		catch (error)
		{
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : `Error closing server-side screen Producer: ${error}`
				}));
		}

		this._screenSharingProducer = null;

		store.dispatch(stateActions.setScreenShareInProgress(false));
	}

	async enableWebcam()
	{

		if (this._webcamProducer)
			return;

		if (!this._mediasoupDevice.canProduce('video'))
		{
			logger.error('enableWebcam() | cannot produce video');

			return;
		}

		let track;

		store.dispatch(
			stateActions.setWebcamInProgress(true));

		try
		{
			const deviceId = await this._getWebcamDeviceId();

			const device = this._webcams[deviceId];
			const resolution = store.getState().settings.resolution;

			if (!device)
				throw new Error('no webcam devices');
			
			logger.debug(
				'_setWebcamProducer() | new selected webcam [device:%o]',
				device);

			logger.debug('_setWebcamProducer() | calling getUserMedia()');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					video :
					{
						deviceId : { exact: deviceId },
						...VIDEO_CONSTRAINS[resolution]
					}
				});

			track = stream.getVideoTracks()[0];

			if (this._useSimulcast)
			{
				this._webcamProducer = await this._sendTransport.produce(
					{
						track,
						encodings    : VIDEO_ENCODINGS,
						codecOptions :
						{
							videoGoogleStartBitrate : 1000
						},
						appData : 
						{
							source : 'webcam'
						}
					});
			}
			else
			{
				this._webcamProducer = await this._sendTransport.produce({
					track,
					appData : 
					{
						source : 'webcam'
					}
				});
			}

			store.dispatch(stateActions.addProducer(
				{
					id            : this._webcamProducer.id,
					deviceLabel   : device.label,
					source        : 'webcam',
					paused        : this._webcamProducer.paused,
					track         : this._webcamProducer.track,
					rtpParameters : this._webcamProducer.rtpParameters,
					codec         : this._webcamProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
				}));

			store.dispatch(stateActions.setSelectedWebcamDevice(deviceId));

			await this._updateWebcams();

			this._webcamProducer.on('transportclose', () =>
			{
				this._webcamProducer = null;
			});

			this._webcamProducer.on('trackended', () =>
			{
				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : 'Webcam disconnected!'
					}));

				this.disableWebcam()
					.catch(() => {});
			});

			logger.debug('_setWebcamProducer() succeeded');
		}
		catch (error)
		{
			logger.error('_setWebcamProducer() failed:%o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'An error occured while accessing your camera.'
				}));

			if (track)
				track.stop();
		}

		store.dispatch(
			stateActions.setWebcamInProgress(false));
	}

	async disableWebcam()
	{
		logger.debug('disableWebcam()');

		if (!this._webcamProducer)
			return;

		store.dispatch(stateActions.setWebcamInProgress(true));

		this._webcamProducer.close();

		store.dispatch(
			stateActions.removeProducer(this._webcamProducer.id));

		try
		{
			await this.sendRequest(
				'closeProducer', { producerId: this._webcamProducer.id });
		}
		catch (error)
		{
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : `Error closing server-side webcam Producer: ${error}`
				}));
		}

		this._webcamProducer = null;

		store.dispatch(stateActions.setWebcamInProgress(false));
	}

	async _updateAudioDevices()
	{
		logger.debug('_updateAudioDevices()');

		// Reset the list.
		this._audioDevices = {};

		try
		{
			logger.debug('_updateAudioDevices() | calling enumerateDevices()');

			const devices = await navigator.mediaDevices.enumerateDevices();

			for (const device of devices)
			{
				if (device.kind !== 'audioinput')
					continue;

				this._audioDevices[device.deviceId] = device;
			}

			store.dispatch(
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
		this._webcams = {};

		try
		{
			logger.debug('_updateWebcams() | calling enumerateDevices()');

			const devices = await navigator.mediaDevices.enumerateDevices();

			for (const device of devices)
			{
				if (device.kind !== 'videoinput')
					continue;

				this._webcams[device.deviceId] = device;
			}

			store.dispatch(
				stateActions.setWebcamDevices(this._webcams));
		}
		catch (error)
		{
			logger.error('_updateWebcams() failed:%o', error);
		}
	}

	async _getAudioDeviceId()
	{
		logger.debug('_getAudioDeviceId()');

		try
		{
			logger.debug('_getAudioDeviceId() | calling _updateWebcams()');

			await this._updateAudioDevices();

			const { selectedAudioDevice } = store.getState().settings;

			if (selectedAudioDevice && this._audioDevices[selectedAudioDevice])
				return selectedAudioDevice;
			else
			{
				const audioDevices = Object.values(this._audioDevices);

				return audioDevices[0] ? audioDevices[0].deviceId : null;
			}
		}
		catch (error)
		{
			logger.error('_getAudioDeviceId() failed:%o', error);
		}
	}

	async _getWebcamDeviceId()
	{
		logger.debug('_getWebcamDeviceId()');

		try
		{
			logger.debug('_getWebcamDeviceId() | calling _updateWebcams()');

			await this._updateWebcams();

			const { selectedWebcam } = store.getState().settings;

			if (selectedWebcam && this._webcams[selectedWebcam])
				return selectedWebcam;
			else
			{
				const webcams = Object.values(this._webcams);

				return webcams[0] ? webcams[0].deviceId : null;
			}
		}
		catch (error)
		{
			logger.error('_getWebcamDeviceId() failed:%o', error);
		}
	}
}

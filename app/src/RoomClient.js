import Logger from './Logger';
import hark from 'hark';
import { getSignalingUrl } from './urlFactory';
import * as requestActions from './actions/requestActions';
import * as meActions from './actions/meActions';
import * as roomActions from './actions/roomActions';
import * as peerActions from './actions/peerActions';
import * as peerVolumeActions from './actions/peerVolumeActions';
import * as settingsActions from './actions/settingsActions';
import * as chatActions from './actions/chatActions';
import * as fileActions from './actions/fileActions';
import * as lobbyPeerActions from './actions/lobbyPeerActions';
import * as consumerActions from './actions/consumerActions';
import * as producerActions from './actions/producerActions';
import * as notificationActions from './actions/notificationActions';

let createTorrent;

let WebTorrent;

let saveAs;

let mediasoupClient;

let io;

let ScreenShare;

let Spotlights;

let turnServers,
	requestTimeout,
	transportOptions,
	lastN,
	mobileLastN,
	defaultResolution;

if (process.env.NODE_ENV !== 'test')
{
	({
		turnServers,
		requestTimeout,
		transportOptions,
		lastN,
		mobileLastN,
		defaultResolution
	} = window.config);
}

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

const PC_PROPRIETARY_CONSTRAINTS =
{
	optional : [ { googDscp: true } ]
};

const VIDEO_SIMULCAST_ENCODINGS =
[
	{ scaleResolutionDownBy: 4 },
	{ scaleResolutionDownBy: 2 },
	{ scaleResolutionDownBy: 1 }
];

// Used for VP9 webcam video.
const VIDEO_KSVC_ENCODINGS =
[
	{ scalabilityMode: 'S3T3_KEY' }
];

// Used for VP9 desktop sharing.
const VIDEO_SVC_ENCODINGS =
[
	{ scalabilityMode: 'S3T3', dtx: true }
];

let store;

let intl;

export default class RoomClient
{
	/**
	 * @param  {Object} data
	 * @param  {Object} data.store - The Redux store.
	 * @param  {Object} data.intl - react-intl object
	 */
	static init(data)
	{
		store = data.store;
		intl = data.intl;
	}

	constructor(
		{ peerId, accessCode, device, useSimulcast, useSharingSimulcast, produce, forceTcp, displayName, muted } = {})
	{
		if (!peerId)
			throw new Error('Missing peerId');
		else if (!device)
			throw new Error('Missing device');

		logger.debug(
			'constructor() [peerId: "%s", device: "%s", useSimulcast: "%s", produce: "%s", forceTcp: "%s", displayName ""]',
			peerId, device.flag, useSimulcast, produce, forceTcp, displayName);

		this._signalingUrl = null;

		// Closed flag.
		this._closed = false;

		// Whether we should produce.
		this._produce = produce;

		// Wheter we force TCP
		this._forceTcp = forceTcp;

		// Use displayName
		if (displayName)
			store.dispatch(settingsActions.setDisplayName(displayName));

		// Torrent support
		this._torrentSupport = null;

		// Whether simulcast should be used.
		this._useSimulcast = useSimulcast;

		if ('simulcast' in window.config)
			this._useSimulcast = window.config.simulcast;

		// Whether simulcast should be used for sharing
		this._useSharingSimulcast = useSharingSimulcast;

		if ('simulcastSharing' in window.config)
			this._useSharingSimulcast = window.config.simulcastSharing;

		this._muted = muted;

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
		this._roomId = null;

		// mediasoup-client Device instance.
		// @type {mediasoupClient.Device}
		this._mediasoupDevice = null;

		// Our WebTorrent client
		this._webTorrent = null;

		if (defaultResolution)
			store.dispatch(settingsActions.setVideoResolution(defaultResolution));

		// Max spotlights
		if (device.bowser.getPlatformType() === 'desktop')
			this._maxSpotlights = lastN;
		else
			this._maxSpotlights = mobileLastN;

		store.dispatch(
			settingsActions.setLastN(this._maxSpotlights));

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

		this._screenSharing = null;

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

		store.dispatch(roomActions.setRoomState('closed'));

		window.location = '/';
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
						store.dispatch(settingsActions.toggleAdvancedMode());
						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.toggleAdvancedMode',
									defaultMessage : 'Toggled advanced mode'
								})
							}));
						break;
					}

					case '1': // Set democratic view
					{
						store.dispatch(roomActions.setDisplayMode('democratic'));
						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.setDemocraticView',
									defaultMessage : 'Changed layout to democratic view'
								})
							}));
						break;
					}

					case '2': // Set filmstrip view
					{
						store.dispatch(roomActions.setDisplayMode('filmstrip'));
						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.setFilmStripView',
									defaultMessage : 'Changed layout to filmstrip view'
								})
							}));
						break;
					}

					case ' ':
					case 'm': // Toggle microphone
					{
						if (this._micProducer)
						{
							if (!this._micProducer.paused)
							{
								this.muteMic();

								store.dispatch(requestActions.notify(
									{
										text : intl.formatMessage({
											id             : 'devices.microPhoneMute',
											defaultMessage : 'Muted your microphone'
										})
									}));
							}
							else
							{
								this.unmuteMic();

								store.dispatch(requestActions.notify(
									{
										text : intl.formatMessage({
											id             : 'devices.microPhoneUnMute',
											defaultMessage : 'Unmuted your microphone'
										})
									}));
							}
						}
						else
						{
							this.enableMic();

							store.dispatch(requestActions.notify(
								{
									text : intl.formatMessage({
										id             : 'devices.microphoneEnable',
										defaultMessage : 'Enabled your microphone'
									})
								}));
						}

						break;
					}

					case 'v': // Toggle video
					{
						if (this._webcamProducer)
							this.disableWebcam();
						else
							this.enableWebcam();

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
					text : intl.formatMessage({
						id             : 'devices.devicesChanged',
						defaultMessage : 'Your devices changed, configure your devices in the settings dialog'
					})
				}));
		});
	}

	login()
	{
		const url = `/auth/login?id=${this._peerId}`;

		window.open(url, 'loginWindow');
	}

	logout()
	{
		window.open('/auth/logout', 'logoutWindow');
	}

	receiveLoginChildWindow(data)
	{
		logger.debug('receiveFromChildWindow() | [data:"%o"]', data);

		const { displayName, picture } = data;

		if (store.getState().room.state === 'connected')
		{
			this.changeDisplayName(displayName);
			this.changePicture(picture);
		}
		else
		{
			store.dispatch(settingsActions.setDisplayName(displayName));
			store.dispatch(meActions.setPicture(picture));
		}

		store.dispatch(meActions.loggedIn(true));

		store.dispatch(requestActions.notify(
			{
				text : intl.formatMessage({
					id             : 'room.loggedIn',
					defaultMessage : 'You are logged in'
				})
			}));
	}

	receiveLogoutChildWindow()
	{
		logger.debug('receiveLogoutChildWindow()');

		store.dispatch(meActions.loggedIn(false));

		store.dispatch(requestActions.notify(
			{
				text : intl.formatMessage({
					id             : 'room.loggedOut',
					defaultMessage : 'You are logged out'
				})
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

		if (!displayName)
			displayName = 'Guest';

		store.dispatch(
			meActions.setDisplayNameInProgress(true));

		try
		{
			await this.sendRequest('changeDisplayName', { displayName });

			store.dispatch(settingsActions.setDisplayName(displayName));

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'room.changedDisplayName',
						defaultMessage : 'Your display name changed to {displayName}'
					}, {
						displayName
					})
				}));
		}
		catch (error)
		{
			logger.error('changeDisplayName() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.changeDisplayNameError',
						defaultMessage : 'An error occured while changing your display name'
					})
				}));
		}

		store.dispatch(
			meActions.setDisplayNameInProgress(false));
	}

	async changePicture(picture)
	{
		logger.debug('changePicture() [picture: "%s"]', picture);

		try
		{
			await this.sendRequest('changePicture', { picture });
		}
		catch (error)
		{
			logger.error('changePicture() | failed: %o', error);
		}
	}

	async sendChatMessage(chatMessage)
	{
		logger.debug('sendChatMessage() [chatMessage:"%s"]', chatMessage);

		try
		{
			store.dispatch(
				chatActions.addUserMessage(chatMessage.text));

			await this.sendRequest('chatMessage', { chatMessage });
		}
		catch (error)
		{
			logger.error('sendChatMessage() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.chatError',
						defaultMessage : 'Unable to send chat message'
					})
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
						text : intl.formatMessage({
							id             : 'filesharing.saveFileError',
							defaultMessage : 'Unable to save file'
						})
					}));
			}

			saveAs(blob, file.name);
		});
	}

	handleDownload(magnetUri)
	{
		store.dispatch(
			fileActions.setFileActive(magnetUri));

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
				fileActions.setFileDone(
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
					fileActions.setFileProgress(
						torrent.magnetURI,
						torrent.progress
					));

				lastMove = Date.now();
			}
		});

		torrent.on('done', () => 
		{
			store.dispatch(
				fileActions.setFileDone(
					torrent.magnetURI,
					torrent.files
				));
		});
	}

	async shareFiles(files)
	{
		store.dispatch(requestActions.notify(
			{
				text : intl.formatMessage({
					id             : 'filesharing.startingFileShare',
					defaultMessage : 'Attempting to share file'
				})
			}));

		createTorrent(files, (err, torrent) =>
		{
			if (err)
			{
				return store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : intl.formatMessage({
							id             : 'filesharing.unableToShare',
							defaultMessage : 'Unable to share file'
						})
					}));
			}

			const existingTorrent = this._webTorrent.get(torrent);

			if (existingTorrent)
			{
				return this._sendFile(existingTorrent.magnetURI);
			}

			this._webTorrent.seed(
				files,
				{ announceList: [ [ 'wss://tracker.lab.vvc.niif.hu:443' ] ] },
				(newTorrent) =>
				{
					store.dispatch(requestActions.notify(
						{
							text : intl.formatMessage({
								id             : 'filesharing.successfulFileShare',
								defaultMessage : 'File successfully shared'
							})
						}));

					store.dispatch(fileActions.addFile(
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
					text : intl.formatMessage({
						id             : 'filesharing.unableToShare',
						defaultMessage : 'Unable to share file'
					})
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
				chatActions.addChatHistory(chatHistory));

			(fileHistory.length > 0) && store.dispatch(
				fileActions.addFileHistory(fileHistory));

			if (lastNHistory.length > 0)
			{
				logger.debug('Got lastNHistory');

				// Remove our self from list
				const index = lastNHistory.indexOf(this._peerId);

				lastNHistory.splice(index, 1);

				this._spotlights.addSpeakerList(lastNHistory);
			}

			locked ? 
				store.dispatch(roomActions.setRoomLocked()) :
				store.dispatch(roomActions.setRoomUnLocked());

			(lobbyPeers.length > 0) && lobbyPeers.forEach((peer) =>
			{
				store.dispatch(
					lobbyPeerActions.addLobbyPeer(peer.peerId));
				store.dispatch(
					lobbyPeerActions.setLobbyPeerDisplayName(peer.displayName));
				store.dispatch(
					lobbyPeerActions.setLobbyPeerPicture(peer.picture));
			});

			(accessCode != null) && store.dispatch(
				roomActions.setAccessCode(accessCode));
		}
		catch (error)
		{
			logger.error('getServerHistory() | failed: %o', error);
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
				producerActions.setProducerPaused(this._micProducer.id));
		}
		catch (error)
		{
			logger.error('muteMic() | failed: %o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.microphoneMuteError',
						defaultMessage : 'Unable to mute your microphone'
					})
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
					producerActions.setProducerResumed(this._micProducer.id));
			}
			catch (error)
			{
				logger.error('unmuteMic() | failed: %o', error);

				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : intl.formatMessage({
							id             : 'devices.microphoneUnMuteError',
							defaultMessage : 'Unable to unmute your microphone'
						})
					}));
			}
		}
	}

	changeMaxSpotlights(maxSpotlights)
	{
		this._spotlights.maxSpotlights = maxSpotlights;

		store.dispatch(
			settingsActions.setLastN(maxSpotlights));
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

	async getAudioTrack()
	{
		await navigator.mediaDevices.getUserMedia(
			{
				audio : true, video : false 
			});
	}

	async getVideoTrack()
	{
		await navigator.mediaDevices.getUserMedia(
			{
				audio : false, video : true 
			});
	}

	async changeAudioDevice(deviceId)
	{
		logger.debug('changeAudioDevice() [deviceId: %s]', deviceId);

		store.dispatch(
			meActions.setAudioInProgress(true));

		try
		{
			const device = this._audioDevices[deviceId];

			if (!device)
				throw new Error('no audio devices');

			logger.debug(
				'changeAudioDevice() | new selected webcam [device:%o]',
				device);

			if (this._micProducer && this._micProducer.track)
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

			if (this._micProducer)
				await this._micProducer.replaceTrack({ track });

			if (this._micProducer)
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

					store.dispatch(peerVolumeActions.setPeerVolume(this._peerId, volume));
				}
			});
			if (this._micProducer && this._micProducer.id)
				store.dispatch(
					producerActions.setProducerTrack(this._micProducer.id, track));

			store.dispatch(settingsActions.setSelectedAudioDevice(deviceId));

			await this._updateAudioDevices();
		}
		catch (error)
		{
			logger.error('changeAudioDevice() failed: %o', error);
		}

		store.dispatch(
			meActions.setAudioInProgress(false));
	}

	async changeVideoResolution(resolution)
	{
		logger.debug('changeVideoResolution() [resolution: %s]', resolution);

		store.dispatch(
			meActions.setWebcamInProgress(true));

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
				producerActions.setProducerTrack(this._webcamProducer.id, track));

			store.dispatch(settingsActions.setSelectedWebcamDevice(deviceId));
			store.dispatch(settingsActions.setVideoResolution(resolution));

			await this._updateWebcams();
		}
		catch (error)
		{
			logger.error('changeVideoResolution() failed: %o', error);
		}

		store.dispatch(
			meActions.setWebcamInProgress(false));
	}

	async changeWebcam(deviceId)
	{
		logger.debug('changeWebcam() [deviceId: %s]', deviceId);

		store.dispatch(
			meActions.setWebcamInProgress(true));

		try
		{
			const device = this._webcams[deviceId];
			const resolution = store.getState().settings.resolution;

			if (!device)
				throw new Error('no webcam devices');
			
			logger.debug(
				'changeWebcam() | new selected webcam [device:%o]',
				device);
			if (this._webcamProducer && this._webcamProducer.track)
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
			if (stream){
				const track = stream.getVideoTracks()[0];
				if (track) {
					await this._webcamProducer.replaceTrack({ track });
	
					store.dispatch(
						producerActions.setProducerTrack(this._webcamProducer.id, track));
							
				} else {
					logger.warn('getVideoTracks Error: First Video Track is null')
				}
	
			} else {
				logger.warn ('getUserMedia Error: Stream is null!') 
			}
			store.dispatch(settingsActions.setSelectedWebcamDevice(deviceId));

			await this._updateWebcams();
		}
		catch (error)
		{
			logger.error('changeWebcam() failed: %o', error);
		}

		store.dispatch(
			meActions.setWebcamInProgress(false));
	}

	setSelectedPeer(peerId)
	{
		logger.debug('setSelectedPeer() [peerId:"%s"]', peerId);

		this._spotlights.setPeerSpotlight(peerId);

		store.dispatch(
			roomActions.setSelectedPeer(peerId));
	}

	async promoteLobbyPeer(peerId)
	{
		logger.debug('promoteLobbyPeer() [peerId:"%s"]', peerId);

		store.dispatch(
			lobbyPeerActions.setLobbyPeerPromotionInProgress(peerId, true));

		try
		{
			await this.sendRequest('promotePeer', { peerId });
		}
		catch (error)
		{
			logger.error('promoteLobbyPeer() failed: %o', error);
		}

		store.dispatch(
			lobbyPeerActions.setLobbyPeerPromotionInProgress(peerId, false));
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
				peerActions.setPeerAudioInProgress(peerId, true));
		else if (type === 'webcam')
			store.dispatch(
				peerActions.setPeerVideoInProgress(peerId, true));
		else if (type === 'screen')
			store.dispatch(
				peerActions.setPeerScreenInProgress(peerId, true));

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
				peerActions.setPeerAudioInProgress(peerId, false));
		else if (type === 'webcam')
			store.dispatch(
				peerActions.setPeerVideoInProgress(peerId, false));
		else if (type === 'screen')
			store.dispatch(
				peerActions.setPeerScreenInProgress(peerId, false));
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
				consumerActions.setConsumerPaused(consumer.id, 'local'));
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
				consumerActions.setConsumerResumed(consumer.id, 'local'));
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
			meActions.setMyRaiseHandStateInProgress(true));

		try
		{
			await this.sendRequest('raiseHand', { raiseHandState: state });

			store.dispatch(
				meActions.setMyRaiseHandState(state));
		}
		catch (error)
		{
			logger.error('sendRaiseHandState() | failed: %o', error);

			// We need to refresh the component for it to render changed state
			store.dispatch(meActions.setMyRaiseHandState(!state));
		}

		store.dispatch(
			meActions.setMyRaiseHandStateInProgress(false));
	}

	async setMaxSendingSpatialLayer(spatialLayer)
	{
		logger.debug('setMaxSendingSpatialLayer() [spatialLayer:%s]', spatialLayer);

		try
		{
			if (this._webcamProducer)
				await this._webcamProducer.setMaxSpatialLayer(spatialLayer);
			if (this._screenSharingProducer)
				await this._screenSharingProducer.setMaxSpatialLayer(spatialLayer);
		}
		catch (error)
		{
			logger.error('setMaxSendingSpatialLayer() | failed:"%o"', error);
		}
	}

	async setConsumerPreferredLayers(consumerId, spatialLayer, temporalLayer)
	{
		logger.debug(
			'setConsumerPreferredLayers() [consumerId:%s, spatialLayer:%s, temporalLayer:%s]',
			consumerId, spatialLayer, temporalLayer);

		try
		{
			await this.sendRequest(
				'setConsumerPreferedLayers', { consumerId, spatialLayer, temporalLayer });

			store.dispatch(consumerActions.setConsumerPreferredLayers(
				consumerId, spatialLayer, temporalLayer));
		}
		catch (error)
		{
			logger.error('setConsumerPreferredLayers() | failed:"%o"', error);
		}
	}

	async setConsumerPriority(consumerId, priority)
	{
		logger.debug(
			'setConsumerPriority() [consumerId:%s, priority:%d]',
			consumerId, priority);

		try
		{
			await this.sendRequest('setConsumerPriority', { consumerId, priority });

			store.dispatch(consumerActions.setConsumerPriority(consumerId, priority));
		}
		catch (error)
		{
			logger.error('setConsumerPriority() | failed:%o', error);
		}
	}

	async requestConsumerKeyFrame(consumerId)
	{
		logger.debug('requestConsumerKeyFrame() [consumerId:%s]', consumerId);

		try
		{
			await this.sendRequest('requestConsumerKeyFrame', { consumerId });
		}
		catch (error)
		{
			logger.error('requestConsumerKeyFrame() | failed:%o', error);
		}
	}

	async _loadDynamicImports()
	{
		({ default: createTorrent } = await import(

			/* webpackPrefetch: true */
			/* webpackChunkName: "createtorrent" */
			'create-torrent'
		));

		({ default: WebTorrent } = await import(

			/* webpackPrefetch: true */
			/* webpackChunkName: "webtorrent" */
			'webtorrent'
		));

		({ default: saveAs } = await import(

			/* webpackPrefetch: true */
			/* webpackChunkName: "file-saver" */
			'file-saver'
		));

		({ default: ScreenShare } = await import(

			/* webpackPrefetch: true */
			/* webpackChunkName: "screensharing" */
			'./ScreenShare'
		));

		({ default: Spotlights } = await import(

			/* webpackPrefetch: true */
			/* webpackChunkName: "spotlights" */
			'./Spotlights'
		));

		mediasoupClient = await import(

			/* webpackPrefetch: true */
			/* webpackChunkName: "mediasoup" */
			'mediasoup-client'
		);

		({ default: io } = await import(

			/* webpackPrefetch: true */
			/* webpackChunkName: "socket.io" */
			'socket.io-client'
		));
	}

	async join({ roomId, joinVideo })
	{
		await this._loadDynamicImports();

		this._roomId = roomId;

		store.dispatch(roomActions.setRoomName(roomId));

		this._signalingUrl = getSignalingUrl(this._peerId, roomId);

		this._torrentSupport = WebTorrent.WEBRTC_SUPPORT;

		this._webTorrent = this._torrentSupport && new WebTorrent({
			tracker : {
				rtcConfig : {
					iceServers : ROOM_OPTIONS.turnServers
				}
			}
		});

		this._webTorrent.on('error', (error) =>
		{
			logger.error('Filesharing [error:"%o"]', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({ id: 'filesharing.error', defaultMessage: 'There was a filesharing error' })
				}));
		});

		this._screenSharing = ScreenShare.create(this._device);

		this._signalingSocket = io(this._signalingUrl);

		this._spotlights = new Spotlights(this._maxSpotlights, this._signalingSocket);

		store.dispatch(roomActions.setRoomState('connecting'));

		this._signalingSocket.on('connect', () =>
		{
			logger.debug('signaling Peer "connect" event');
		});

		this._signalingSocket.on('disconnect', (reason) =>
		{
			logger.warn('signaling Peer "disconnect" event [reason:"%s"]', reason);

			if (this._closed)
				return;

			if (reason === 'io server disconnect')
			{
				store.dispatch(requestActions.notify(
					{
						text : intl.formatMessage({
							id             : 'socket.disconnected',
							defaultMessage : 'You are disconnected'
						})
					}));

				this.close();
			}

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'socket.reconnecting',
						defaultMessage : 'You are disconnected, attempting to reconnect'
					})
				}));

			store.dispatch(roomActions.setRoomState('connecting'));
		});

		this._signalingSocket.on('reconnect_failed', () =>
		{
			logger.warn('signaling Peer "reconnect_failed" event');

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'socket.disconnected',
						defaultMessage : 'You are disconnected'
					})
				}));

			this.close();
		});

		this._signalingSocket.on('reconnect', (attemptNumber) =>
		{
			logger.debug('signaling Peer "reconnect" event [attempts:"%s"]', attemptNumber);

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'socket.reconnected',
						defaultMessage : 'You are reconnected'
					})
				}));

			store.dispatch(roomActions.setRoomState('connected'));
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

					store.dispatch(consumerActions.addConsumer(
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
							priority               : 1,
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

								store.dispatch(peerVolumeActions.setPeerVolume(peerId, volume));
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

			try
			{
				switch (notification.method)
				{
					case 'enteredLobby':
					{
						store.dispatch(roomActions.setInLobby(true));

						const { displayName } = store.getState().settings;
						const { picture } = store.getState().me;
	
						await this.sendRequest('changeDisplayName', { displayName });
						await this.sendRequest('changePicture', { picture });
						break;
					}

					case 'signInRequired':
					{
						store.dispatch(roomActions.setSignInRequired(true));
	
						break;
					}
						
					case 'roomReady':
					{
						store.dispatch(roomActions.toggleJoined());
						store.dispatch(roomActions.setInLobby(false));
	
						await this._joinRoom({ joinVideo });
	
						break;
					}
	
					case 'lockRoom':
					{
						store.dispatch(
							roomActions.setRoomLocked());
	
						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.locked',
									defaultMessage : 'Room is now locked'
								})
							}));
	
						break;
					}
	
					case 'unlockRoom':
					{
						store.dispatch(
							roomActions.setRoomUnLocked());
						
						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.unlocked',
									defaultMessage : 'Room is now unlocked'
								})
							}));
	
						break;
					}
	
					case 'parkedPeer':
					{
						const { peerId } = notification.data;
	
						store.dispatch(
							lobbyPeerActions.addLobbyPeer(peerId));
						store.dispatch(
							roomActions.setToolbarsVisible(true));
	
						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.newLobbyPeer',
									defaultMessage : 'New participant entered the lobby'
								})
							}));
	
						break;
					}
	
					case 'lobby:peerClosed':
					{
						const { peerId } = notification.data;
	
						store.dispatch(
							lobbyPeerActions.removeLobbyPeer(peerId));
	
						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.lobbyPeerLeft',
									defaultMessage : 'Participant in lobby left'
								})
							}));
	
						break;
					}
	
					case 'lobby:promotedPeer':
					{
						const { peerId } = notification.data;

						store.dispatch(
							lobbyPeerActions.removeLobbyPeer(peerId));

						break;
					}
	
					case 'lobby:changeDisplayName':
					{
						const { peerId, displayName } = notification.data;

						store.dispatch(
							lobbyPeerActions.setLobbyPeerDisplayName(displayName, peerId));

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.lobbyPeerChangedDisplayName',
									defaultMessage : 'Participant in lobby changed name to {displayName}'
								}, {
									displayName
								})
							}));

						break;
					}
					
					case 'lobby:changePicture':
					{
						const { peerId, picture } = notification.data;
	
						store.dispatch(
							lobbyPeerActions.setLobbyPeerPicture(picture, peerId));

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.lobbyPeerChangedPicture',
									defaultMessage : 'Participant in lobby changed picture'
								})
							}));

						break;
					}

					case 'setAccessCode':
					{
						const { accessCode } = notification.data;
	
						store.dispatch(
							roomActions.setAccessCode(accessCode));

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.setAccessCode',
									defaultMessage : 'Access code for room updated'
								})
							}));

						break;
					}
	
					case 'setJoinByAccessCode':
					{
						const { joinByAccessCode } = notification.data;
						
						store.dispatch(
							roomActions.setJoinByAccessCode(joinByAccessCode));
						
						if (joinByAccessCode)
						{
							store.dispatch(requestActions.notify(
								{
									text : intl.formatMessage({
										id             : 'room.accessCodeOn',
										defaultMessage : 'Access code for room is now activated'
									})
								}));
						}
						else 
						{
							store.dispatch(requestActions.notify(
								{
									text : intl.formatMessage({
										id             : 'room.accessCodeOff',
										defaultMessage : 'Access code for room is now deactivated'
									})
								}));
						}

						break;
					}
	
					case 'activeSpeaker':
					{
						const { peerId } = notification.data;
	
						store.dispatch(
							roomActions.setRoomActiveSpeaker(peerId));

						if (peerId && peerId !== this._peerId)
							this._spotlights.handleActiveSpeaker(peerId);
	
						break;
					}
	
					case 'changeDisplayName':
					{
						const { peerId, displayName, oldDisplayName } = notification.data;

						store.dispatch(
							peerActions.setPeerDisplayName(displayName, peerId));

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.peerChangedDisplayName',
									defaultMessage : '{oldDisplayName} is now {displayName}'
								}, {
									oldDisplayName,
									displayName
								})
							}));

						break;
					}

					case 'changePicture':
					{
						const { peerId, picture } = notification.data;

						store.dispatch(peerActions.setPeerPicture(peerId, picture));

						break;
					}

					case 'chatMessage':
					{
						const { peerId, chatMessage } = notification.data;

						store.dispatch(
							chatActions.addResponseMessage({ ...chatMessage, peerId }));

						if (
							!store.getState().toolarea.toolAreaOpen ||
							(store.getState().toolarea.toolAreaOpen &&
							store.getState().toolarea.currentToolTab !== 'chat')
						) // Make sound
						{
							store.dispatch(
								roomActions.setToolbarsVisible(true));
							this._soundNotification();
						}

						break;
					}

					case 'sendFile':
					{
						const { peerId, magnetUri } = notification.data;

						store.dispatch(fileActions.addFile(peerId, magnetUri));

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.newFile',
									defaultMessage : 'New file available'
								})
							}));

						if (
							!store.getState().toolarea.toolAreaOpen ||
							(store.getState().toolarea.toolAreaOpen &&
							store.getState().toolarea.currentToolTab !== 'files')
						) // Make sound
						{
							store.dispatch(
								roomActions.setToolbarsVisible(true));
							this._soundNotification();
						}

						break;
					}

					case 'producerScore':
					{
						const { producerId, score } = notification.data;

						store.dispatch(
							producerActions.setProducerScore(producerId, score));

						break;
					}

					case 'newPeer':
					{
						const { id, displayName, picture } = notification.data;

						store.dispatch(
							peerActions.addPeer({ id, displayName, picture, consumers: [] }));

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.newPeer',
									defaultMessage : '{displayName} joined the room'
								}, {
									displayName
								})
							}));

						break;
					}

					case 'peerClosed':
					{
						const { peerId } = notification.data;

						store.dispatch(
							peerActions.removePeer(peerId));

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
							consumerActions.removeConsumer(consumerId, peerId));
	
						break;
					}
	
					case 'consumerPaused':
					{
						const { consumerId } = notification.data;
						const consumer = this._consumers.get(consumerId);
	
						if (!consumer)
							break;
	
						store.dispatch(
							consumerActions.setConsumerPaused(consumerId, 'remote'));

						break;
					}
	
					case 'consumerResumed':
					{
						const { consumerId } = notification.data;
						const consumer = this._consumers.get(consumerId);
	
						if (!consumer)
							break;
	
						store.dispatch(
							consumerActions.setConsumerResumed(consumerId, 'remote'));
	
						break;
					}
	
					case 'consumerLayersChanged':
					{
						const { consumerId, spatialLayer, temporalLayer } = notification.data;
						const consumer = this._consumers.get(consumerId);
	
						if (!consumer)
							break;
	
						store.dispatch(consumerActions.setConsumerCurrentLayers(
							consumerId, spatialLayer, temporalLayer));
	
						break;
					}
	
					case 'consumerScore':
					{
						const { consumerId, score } = notification.data;
	
						store.dispatch(
							consumerActions.setConsumerScore(consumerId, score));
	
						break;
					}
	
					default:
					{
						logger.error(
							'unknown notification.method "%s"', notification.method);
					}
				}
			}
			catch (error)
			{
				logger.error('error on socket "notification" event failed:"%o"', error);

				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : intl.formatMessage({
							id             : 'socket.requestError',
							defaultMessage : 'Error on server request'
						})
					}));
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
			this._torrentSupport = WebTorrent.WEBRTC_SUPPORT;

			this._webTorrent = this._torrentSupport && new WebTorrent({
				tracker : {
					rtcConfig : {
						iceServers : this._turnServers
					}
				}
			});

			this._webTorrent.on('error', (error) =>
			{
				logger.error('Filesharing [error:"%o"]', error);
	
				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : intl.formatMessage({
							id             : 'filesharing.error',
							defaultMessage : 'There was a filesharing error'
						})
					}));
			});

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
						dtlsParameters,
						iceServers             : ROOM_OPTIONS.turnServers,
						proprietaryConstraints : PC_PROPRIETARY_CONSTRAINTS
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
					'produce', async ({ kind, rtpParameters, appData }, callback, errback) =>
					{
						try
						{
							// eslint-disable-next-line no-shadow
							const { id } = await this.sendRequest(
								'produce',
								{
									transportId : this._sendTransport.id,
									kind,
									rtpParameters,
									appData
								});

							callback({ id });
						}
						catch (error)
						{
							errback(error);
						}
					});
			}

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
					dtlsParameters,
					iceServers : ROOM_OPTIONS.turnServers
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

			// Set our media capabilities.
			store.dispatch(meActions.setMediaCapabilities(
				{
					canSendMic     : this._mediasoupDevice.canProduce('audio'),
					canSendWebcam  : this._mediasoupDevice.canProduce('video'),
					canShareScreen : this._mediasoupDevice.canProduce('video') &&
						this._screenSharing.isScreenShareAvailable(),
					canShareFiles : this._torrentSupport
				}));

			const { peers, authenticated } = await this.sendRequest(
				'join',
				{
					displayName     : displayName,
					picture         : picture,
					rtpCapabilities : this._mediasoupDevice.rtpCapabilities
				});

			store.dispatch(meActions.loggedIn(authenticated));

			logger.debug('_joinRoom() joined, got peers [peers:"%o"]', peers);

			for (const peer of peers)
			{
				store.dispatch(
					peerActions.addPeer({ ...peer, consumers: [] }));
			}

			this._spotlights.addPeers(peers);

			this._spotlights.on('spotlights-updated', (spotlights) =>
			{
				store.dispatch(roomActions.setSpotlights(spotlights));
				this.updateSpotlights(spotlights);
			});

			// Don't produce if explicitely requested to not to do it.
			if (this._produce)
			{
				if (this._mediasoupDevice.canProduce('audio'))
					if (!this._muted)
						this.enableMic();

				if (joinVideo && this._mediasoupDevice.canProduce('video'))
					this.enableWebcam();
			}

			store.dispatch(roomActions.setRoomState('connected'));

			// Clean all the existing notifcations.
			store.dispatch(notificationActions.removeAllNotifications());

			this.getServerHistory();

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'room.joined',
						defaultMessage : 'You have joined the room'
					})
				}));

			this._spotlights.start();
		}
		catch (error)
		{
			logger.error('_joinRoom() failed:"%o"', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.cantJoin',
						defaultMessage : 'Unable to join the room'
					})
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
				roomActions.setRoomLocked());

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'room.youLocked',
						defaultMessage : 'You locked the room'
					})
				}));
		}
		catch (error)
		{
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.cantLock',
						defaultMessage : 'Unable to lock the room'
					})
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
				roomActions.setRoomUnLocked());

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'room.youUnLocked',
						defaultMessage : 'You unlocked the room'
					})
				}));
		}
		catch (error)
		{
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.cantUnLock',
						defaultMessage : 'Unable to unlock the room'
					})
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
				roomActions.setAccessCode(code));

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
				roomActions.setJoinByAccessCode(value));

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

		if (this._mediasoupDevice && !this._mediasoupDevice.canProduce('audio'))
		{
			logger.error('enableMic() | cannot produce audio');

			return;
		}

		let track;

		store.dispatch(
			meActions.setAudioInProgress(true));

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

			store.dispatch(producerActions.addProducer(
				{
					id            : this._micProducer.id,
					source        : 'mic',
					paused        : this._micProducer.paused,
					track         : this._micProducer.track,
					rtpParameters : this._micProducer.rtpParameters,
					codec         : this._micProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
				}));

			store.dispatch(settingsActions.setSelectedAudioDevice(deviceId));

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
						text : intl.formatMessage({
							id             : 'devices.microphoneDisconnected',
							defaultMessage : 'Microphone disconnected'
						})
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

					store.dispatch(peerVolumeActions.setPeerVolume(this._peerId, volume));
				}
			});
		}
		catch (error)
		{
			logger.error('enableMic() failed:%o', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.microphoneError',
						defaultMessage : 'An error occured while accessing your microphone'
					})
				}));

			if (track)
				track.stop();

		}

		store.dispatch(
			meActions.setAudioInProgress(false));
	}

	async disableMic()
	{
		logger.debug('disableMic()');

		if (!this._micProducer)
			return;

		store.dispatch(meActions.setAudioInProgress(true));

		this._micProducer.close();

		store.dispatch(
			producerActions.removeProducer(this._micProducer.id));

		try
		{
			await this.sendRequest(
				'closeProducer', { producerId: this._micProducer.id });
		}
		catch (error)
		{
			logger.error('disableMic() [error:"%o"]', error);
		}

		this._micProducer = null;

		store.dispatch(meActions.setAudioInProgress(false));
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

		store.dispatch(meActions.setScreenShareInProgress(true));

		try
		{
			const available = this._screenSharing.isScreenShareAvailable();

			if (!available)
				throw new Error('screen sharing not available');

			logger.debug('enableScreenSharing() | calling getUserMedia()');

			const stream = await this._screenSharing.start({
				width     : 1920,
				height    : 1080,
				frameRate : 5
			});

			track = stream.getVideoTracks()[0];

			if (this._useSharingSimulcast)
			{
				// If VP9 is the only available video codec then use SVC.
				const firstVideoCodec = this._mediasoupDevice
					.rtpCapabilities
					.codecs
					.find((c) => c.kind === 'video');

				let encodings;

				if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9')
				{
					encodings = VIDEO_SVC_ENCODINGS;
				}
				else
				{
					if ('simulcastEncodings' in window.config)
					{
						encodings = window.config.simulcastEncodings
							.map((encoding) => ({ ...encoding, dtx: true }));
					}
					else
					{
						encodings = VIDEO_SIMULCAST_ENCODINGS
							.map((encoding) => ({ ...encoding, dtx: true }));
					}
				}

				this._screenSharingProducer = await this._sendTransport.produce(
					{
						track,
						encodings,
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

			store.dispatch(producerActions.addProducer(
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
						text : intl.formatMessage({
							id             : 'devices.screenSharingDisconnected',
							defaultMessage : 'Screen sharing disconnected'
						})
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
					text : intl.formatMessage({
						id             : 'devices.screenSharingError',
						defaultMessage : 'An error occured while accessing your screen'
					})
				}));

			if (track)
				track.stop();
		}

		store.dispatch(meActions.setScreenShareInProgress(false));
	}

	async disableScreenSharing()
	{
		logger.debug('disableScreenSharing()');

		if (!this._screenSharingProducer)
			return;

		store.dispatch(meActions.setScreenShareInProgress(true));

		this._screenSharingProducer.close();

		store.dispatch(
			producerActions.removeProducer(this._screenSharingProducer.id));

		try
		{
			await this.sendRequest(
				'closeProducer', { producerId: this._screenSharingProducer.id });
		}
		catch (error)
		{
			logger.error('disableScreenSharing() [error:"%o"]', error);
		}

		this._screenSharingProducer = null;

		store.dispatch(meActions.setScreenShareInProgress(false));
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
			meActions.setWebcamInProgress(true));

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
				// If VP9 is the only available video codec then use SVC.
				const firstVideoCodec = this._mediasoupDevice
					.rtpCapabilities
					.codecs
					.find((c) => c.kind === 'video');

				let encodings;

				if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9')
					encodings = VIDEO_KSVC_ENCODINGS;
				else
				{
					if ('simulcastEncodings' in window.config)
						encodings = window.config.simulcastEncodings;
					else
						encodings = VIDEO_SIMULCAST_ENCODINGS;
				}

				this._webcamProducer = await this._sendTransport.produce(
					{
						track,
						encodings,
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

			store.dispatch(producerActions.addProducer(
				{
					id            : this._webcamProducer.id,
					deviceLabel   : device.label,
					source        : 'webcam',
					paused        : this._webcamProducer.paused,
					track         : this._webcamProducer.track,
					rtpParameters : this._webcamProducer.rtpParameters,
					codec         : this._webcamProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
				}));

			store.dispatch(settingsActions.setSelectedWebcamDevice(deviceId));

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
						text : intl.formatMessage({
							id             : 'devices.cameraDisconnected',
							defaultMessage : 'Camera disconnected'
						})
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
					text : intl.formatMessage({
						id             : 'devices.cameraError',
						defaultMessage : 'An error occured while accessing your camera'
					})
				}));

			if (track)
				track.stop();
		}

		store.dispatch(
			meActions.setWebcamInProgress(false));
	}

	async disableWebcam()
	{
		logger.debug('disableWebcam()');

		if (!this._webcamProducer)
			return;

		store.dispatch(meActions.setWebcamInProgress(true));

		this._webcamProducer.close();

		store.dispatch(
			producerActions.removeProducer(this._webcamProducer.id));

		try
		{
			await this.sendRequest(
				'closeProducer', { producerId: this._webcamProducer.id });
		}
		catch (error)
		{
			logger.error('disableWebcam() [error:"%o"]', error);
		}

		this._webcamProducer = null;

		store.dispatch(meActions.setWebcamInProgress(false));
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
				meActions.setAudioDevices(this._audioDevices));
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
				meActions.setWebcamDevices(this._webcams));
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
			logger.debug('_getAudioDeviceId() | calling _updateAudioDeviceId()');

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

import Logger from './Logger';
import hark from 'hark';
import { getSignalingUrl } from './urlFactory';
import { SocketTimeoutError } from './utils';
import * as requestActions from './store/actions/requestActions';
import * as meActions from './store/actions/meActions';
import * as intlActions from './store/actions/intlActions';
import * as roomActions from './store/actions/roomActions';
import * as peerActions from './store/actions/peerActions';
import * as peerVolumeActions from './store/actions/peerVolumeActions';
import * as settingsActions from './store/actions/settingsActions';
import * as chatActions from './store/actions/chatActions';
import * as fileActions from './store/actions/fileActions';
import * as lobbyPeerActions from './store/actions/lobbyPeerActions';
import * as consumerActions from './store/actions/consumerActions';
import * as producerActions from './store/actions/producerActions';
import * as notificationActions from './store/actions/notificationActions';
import * as transportActions from './store/actions/transportActions';
import Spotlights from './Spotlights';
import { permissions } from './permissions';
import * as locales from './intl/locales';
import { createIntl } from 'react-intl';
import * as recorderActions from './store/actions/recorderActions';
import { directReceiverTransform, opusReceiverTransform } from './transforms/receiver';
import { config } from './config';

let createTorrent;

let WebTorrent;

let saveAs;

let mediasoupClient;

let io;

let ScreenShare;

const logger = new Logger('RoomClient');

const VIDEO_CONSTRAINS =
{
	'low' :
	{
		width : 320
	},
	'medium' :
	{
		width : 640
	},
	'high' :
	{
		width : 1280
	},
	'veryhigh' :
	{
		width : 1920
	},
	'ultra' :
	{
		width : 3840
	}
};

const DEFAULT_NETWORK_PRIORITIES =
{
	audio            : 'high',
	mainVideo        : 'high',
	additionalVideos : 'medium',
	screenShare      : 'medium'
};

function getVideoConstrains(resolution, aspectRatio)
{
	return {
		width  : { ideal: VIDEO_CONSTRAINS[resolution].width },
		height : { ideal: VIDEO_CONSTRAINS[resolution].width / aspectRatio }
	};
}

const PC_PROPRIETARY_CONSTRAINTS =
{
	optional : [ { googDscp: true } ]
};

const VIDEO_SIMULCAST_PROFILES =
{
	3840 :
		[
			{ scaleResolutionDownBy: 12, maxBitRate: 150000 },
			{ scaleResolutionDownBy: 6, maxBitRate: 500000 },
			{ scaleResolutionDownBy: 1, maxBitRate: 10000000 }
		],
	1920 :
		[
			{ scaleResolutionDownBy: 6, maxBitRate: 150000 },
			{ scaleResolutionDownBy: 3, maxBitRate: 500000 },
			{ scaleResolutionDownBy: 1, maxBitRate: 3500000 }
		],
	1280 :
		[
			{ scaleResolutionDownBy: 4, maxBitRate: 150000 },
			{ scaleResolutionDownBy: 2, maxBitRate: 500000 },
			{ scaleResolutionDownBy: 1, maxBitRate: 1200000 }
		],
	640 :
	[
		{ scaleResolutionDownBy: 2, maxBitRate: 150000 },
		{ scaleResolutionDownBy: 1, maxBitRate: 500000 }
	],
	320 :
	[
		{ scaleResolutionDownBy: 1, maxBitRate: 150000 }
	]
};

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

/**
 * Validates the simulcast `encodings` array extracting the resolution scalings
 * array.
 * ref. https://www.w3.org/TR/webrtc/#rtp-media-api
 * 
 * @param {*} encodings
 * @returns the resolution scalings array
 */
function getResolutionScalings(encodings)
{
	const resolutionScalings = [];

	// SVC encodings
	if (encodings.length === 1)
	{
		const { spatialLayers } =
			mediasoupClient.parseScalabilityMode(encodings[0].scalabilityMode);

		for (let i=0; i < spatialLayers; i++)
		{
			resolutionScalings.push(2 ** (spatialLayers - i - 1));
		}

		return resolutionScalings;
	}

	// Simulcast encodings
	let scaleResolutionDownByDefined = false;

	encodings.forEach((encoding) =>
	{
		if (encoding.scaleResolutionDownBy !== undefined)
		{
			// at least one scaleResolutionDownBy is defined
			scaleResolutionDownByDefined = true;
			// scaleResolutionDownBy must be >= 1.0
			resolutionScalings.push(Math.max(1.0, encoding.scaleResolutionDownBy));
		}
		else
		{
			// If encodings contains any encoding whose scaleResolutionDownBy
			// attribute is defined, set any undefined scaleResolutionDownBy
			// of the other encodings to 1.0.
			resolutionScalings.push(1.0);
		}
	});

	// If the scaleResolutionDownBy attribues of sendEncodings are
	// still undefined, initialize each encoding's scaleResolutionDownBy
	// to 2^(length of sendEncodings - encoding index - 1).
	if (!scaleResolutionDownByDefined)
	{
		encodings.forEach((encoding, index) =>
		{
			resolutionScalings[index] = 2 ** (encodings.length - index - 1);
		});
	}

	return resolutionScalings;
}

let store;

let intl;

const insertableStreamsSupported = Boolean(RTCRtpSender.prototype.createEncodedStreams);

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
	}

	constructor(
		{
			peerId,
			accessCode,
			device,
			produce,
			headless,
			forceTcp,
			displayName,
			muted,
			basePath
		} = {})
	{
		if (!peerId)
			throw new Error('Missing peerId');
		else if (!device)
			throw new Error('Missing device');

		logger.debug(
			'constructor() [peerId: "%s", device: "%s", produce: "%s", forceTcp: "%s", displayName ""]',
			peerId, device.flag, produce, forceTcp, displayName);

		this._signalingUrl = null;

		// Closed flag.
		this._closed = false;

		// Whether we should produce.
		this._produce = produce;

		// Whether we force TCP
		this._forceTcp = forceTcp;

		// URL basepath
		this._basePath = basePath;

		// Use displayName
		this._displayName=null;
		if (displayName)
		{
			store.dispatch(settingsActions.setDisplayName(displayName));
			this._displayName=displayName;
		}

		this._tracker = 'wss://tracker.lab.vvc.niif.hu:443';

		// Torrent support
		this._torrentSupport = null;

		// Whether simulcast should be used.
		this._useSimulcast = false;

		this._useSimulcast = config.simulcast;

		// Whether simulcast should be used for sharing
		this._useSharingSimulcast = config.simulcastSharing;

		this._muted = muted;

		// This device
		this._device = device;

		// My peer name.
		this._peerId = peerId;

		// Access code
		this._accessCode = accessCode;

		// Alert sounds
		this._soundAlerts = { 'default': { audio: new Audio('/sounds/notify.mp3') } };
		if (config.notificationSounds)
		{
			for (const [ k, v ] of Object.entries(config.notificationSounds))
			{
				if (v != null && v.play !== undefined)
					this._soundAlerts[k] = {
						audio : new Audio(v.play),
						delay : v.delay ? v.delay: 0
					};
			}
		}

		// Socket.io peer connection
		this._signalingSocket = null;

		// The room ID
		this._roomId = null;

		// mediasoup-client Device instance.
		// @type {mediasoupClient.Device}
		this._mediasoupDevice = null;

		// Put the browser info into state
		store.dispatch(meActions.setBrowser(device));

		// Our WebTorrent client
		this._webTorrent = null;

		// Max spotlights
		if (device.platform === 'desktop')
			this._maxSpotlights = config.lastN;
		else
			this._maxSpotlights = config.mobileLastN;

		store.dispatch(
			settingsActions.setLastN(this._maxSpotlights));

		// Manager of spotlight
		this._spotlights = new Spotlights(this._maxSpotlights,
			store.getState().settings.hideNoVideoParticipants, this);

		// Transport for sending.
		this._sendTransport = null;

		// Transport for receiving.
		this._recvTransport = null;

		// Local mic mediasoup Producer.
		this._micProducer = null;

		// Local mic hark
		this._hark = null;

		// Local MediaStream for hark
		this._harkStream = null;

		// Local webcam mediasoup Producer.
		this._webcamProducer = null;

		// Extra videos being produced
		this._extraVideoProducers = new Map();

		// Map of webcam MediaDeviceInfos indexed by deviceId.
		// @type {Map<String, MediaDeviceInfos>}
		this._webcams = {};

		this._audioDevices = {};

		this._audioOutputDevices = {};

		// mediasoup Consumers.
		// @type {Map<String, mediasoupClient.Consumer>}
		this._consumers = new Map();

		this._screenSharing = null;

		this._screenSharingProducer = null;

		this._screenSharingAudioProducer = null;

		this._startKeyListener();

		this._startDevicesListener();

		this.setLocale(store.getState().intl.locale);

		if (store.getState().settings.localPicture)
		{
			store.dispatch(meActions.setPicture(store.getState().settings.localPicture));
		}
		store.dispatch(
			settingsActions.setRecorderSupportedMimeTypes(this.getRecorderSupportedMimeTypes())
		);

		// Receive transport restart ICE object
		this._recvRestartIce = { timer: null, restarting: false };

		// Send transport restart ICE object
		this._sendRestartIce = { timer: null, restarting: false };

		if (headless)
		{
			const encodedRoomId =
				encodeURIComponent(decodeURIComponent(window.location.pathname.slice(1)));

			this.join({
				roomId    : encodedRoomId,
				joinVideo : false,
				joinAudio : false
			});
		}

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

		window.location = `/${this._roomId}`;
	}

	_startKeyListener()
	{
		// Add keydown event listener on document
		document.addEventListener('keydown', (event) =>
		{
			if (event.repeat) return;
			const key = String.fromCharCode(event.which);

			const source = event.target;

			const exclude = [ 'input', 'textarea', 'div' ];

			if (exclude.indexOf(source.tagName.toLowerCase()) === -1)
			{
				logger.debug('keyDown() [key:"%s"]', key);

				switch (key)
				{

					/*
					case String.fromCharCode(37):
					{
						const newPeerId = this._spotlights.getPrevAsSelected(
							store.getState().room.selectedPeerId);

						if (newPeerId) this.setSelectedPeer(newPeerId);
						break;
					}

					case String.fromCharCode(39):
					{
						const newPeerId = this._spotlights.getNextAsSelected(
							store.getState().room.selectedPeerId);

						if (newPeerId) this.setSelectedPeer(newPeerId);
						break;
					}
					*/

					case 'A': // Activate advanced mode
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

					case ' ': // Push To Talk start
					{
						if (this._micProducer)
						{
							if (this._micProducer.paused)
							{
								this.unmuteMic();
							}
						}

						break;
					}
					case 'M': // Toggle microphone
					{
						if (this._micProducer)
						{
							if (!this._micProducer.paused)
							{
								this.muteMic();

								store.dispatch(requestActions.notify(
									{
										text : intl.formatMessage({
											id             : 'devices.microphoneMute',
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
											id             : 'devices.microphoneUnMute',
											defaultMessage : 'Unmuted your microphone'
										})
									}));
							}
						}
						else
						{
							this.updateMic({ start: true });

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

					case 'V': // Toggle video
					{
						if (this._webcamProducer)
							this.disableWebcam();
						else
							this.updateWebcam({ start: true });

						break;
					}

					case 'H': // Open help dialog
					{
						store.dispatch(roomActions.setHelpOpen(true));

						break;
					}

					default:
					{
						break;
					}
				}
			}
		});
		document.addEventListener('keyup', (event) =>
		{
			const key = String.fromCharCode(event.which);

			const source = event.target;

			const exclude = [ 'input', 'textarea', 'div' ];

			if (exclude.indexOf(source.tagName.toLowerCase()) === -1)
			{
				logger.debug('keyUp() [key:"%s"]', key);

				switch (key)
				{
					case ' ': // Push To Talk stop
					{
						if (this._micProducer)
						{
							if (!this._micProducer.paused)
							{
								this.muteMic();
							}
						}

						break;
					}
					default:
					{
						break;
					}
				}
			}
			event.preventDefault();
		}, true);
	}

	_startDevicesListener()
	{
		navigator.mediaDevices.addEventListener('devicechange', async () =>
		{
			logger.debug('_startDevicesListener() | navigator.mediaDevices.ondevicechange');

			await this._updateAudioDevices();
			await this._updateWebcams();
			await this._updateAudioOutputDevices();

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'devices.devicesChanged',
						defaultMessage : 'Your devices changed, configure your devices in the settings dialog'
					})
				}));
		});
	}

	setLocale(locale)
	{

		if (locale === null) locale = locales.detect();

		const one = locales.loadOne(locale);

		store.dispatch(intlActions.updateIntl({
			locale   : one.locale[0],
			messages : one.messages,
			list   	 : locales.getList()
		}));

		intl = createIntl({
			locale   : store.getState().intl.locale,
			messages : store.getState().intl.messages
		});

		document.documentElement.lang = store.getState().intl.locale.toUpperCase();

	}

	login(roomId = this._roomId)
	{
		const url = `/auth/login?peerId=${this._peerId}&roomId=${roomId}`;

		window.open(url, 'loginWindow');
	}

	logout(roomId = this._roomId)
	{
		window.open(`/auth/logout?peerId=${this._peerId}&roomId=${roomId}`, 'logoutWindow');
	}

	setLoggedIn(loggedIn)
	{
		logger.debug('setLoggedIn() | [loggedIn: "%s"]', loggedIn);

		store.dispatch(meActions.loggedIn(loggedIn));

	}

	setPicture(picture)
	{
		store.dispatch(settingsActions.setLocalPicture(picture));
		store.dispatch(meActions.setPicture(picture));
		this.changePicture(picture);
	}

	receiveLoginChildWindow(data)
	{
		logger.debug('receiveFromChildWindow() | [data:"%o"]', data);

		const { picture } = data;

		let displayName;

		if (typeof(data.displayName) === 'undefined' || !data.displayName)
			displayName = '';
		else
			displayName = data.displayName;

		store.dispatch(settingsActions.setDisplayName(displayName));

		this._displayName=displayName;

		if (!store.getState().settings.localPicture)
		{
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

		if (!store.getState().settings.localPicture)
		{
			store.dispatch(meActions.setPicture(null));
		}

		store.dispatch(meActions.loggedIn(false));

		store.dispatch(requestActions.notify(
			{
				text : intl.formatMessage({
					id             : 'room.loggedOut',
					defaultMessage : 'You are logged out'
				})
			}));
	}

	_soundNotification(type = 'default')
	{
		const { notificationSounds } = store.getState().settings;

		if (notificationSounds)
		{
			const soundAlert = this._soundAlerts[type] === undefined
				? this._soundAlerts['default'] : this._soundAlerts[type];

			const now = Date.now();

			if (soundAlert.last !== undefined && (now - soundAlert.last) < soundAlert.delay)
			{
				return;
			}
			soundAlert.last = now;

			const alertPromise = soundAlert.audio.play();

			if (alertPromise !== undefined)
			{
				alertPromise
					.then()
					.catch((error) =>
					{
						logger.error('_soundAlert.play() [error:"%o"]', error);
					});
			}
		}
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
				callback(new SocketTimeoutError('Request timed out'));
			},
			config.requestTimeout
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

	_sendRequest(method, data)
	{
		return new Promise((resolve, reject) =>
		{
			if (!this._signalingSocket)
			{
				reject('No socket connection');
			}
			else
			{
				this._signalingSocket.emit(
					'request',
					{ method, data },
					this.timeoutCallback((err, response) =>
					{
						if (err)
							reject(err);
						else
							resolve(response);
					})
				);
			}
		});
	}

	async getTransportStats()
	{
		try
		{
			if (this._recvTransport)
			{
				logger.debug('getTransportStats() - recv [transportId: "%s"]', this._recvTransport.id);

				const recv = await this.sendRequest('getTransportStats', { transportId: this._recvTransport.id });

				store.dispatch(
					transportActions.addTransportStats(recv, 'recv'));
			}

			if (this._sendTransport)
			{
				logger.debug('getTransportStats() - send [transportId: "%s"]', this._sendTransport.id);

				const send = await this.sendRequest('getTransportStats', { transportId: this._sendTransport.id });

				store.dispatch(
					transportActions.addTransportStats(send, 'send'));
			}
		}
		catch (error)
		{
			logger.error('getTransportStats() [error:"%o"]', error);
		}
	}

	async sendRequest(method, data)
	{
		logger.debug('sendRequest() [method:"%s", data:"%o"]', method, data);

		for (let tries = 0; tries < config.requestRetries; tries++)
		{
			try
			{
				return await this._sendRequest(method, data);
			}
			catch (error)
			{
				if (
					error instanceof SocketTimeoutError &&
					tries < config.requestRetries
				)
					logger.warn('sendRequest() | timeout, retrying [attempt:"%s"]', tries);
				else
					throw error;
			}
		}
	}

	async changeDisplayName(displayName)
	{
		displayName = displayName.trim();

		if (!displayName)
			displayName = `Guest ${Math.floor(Math.random() * (100000 - 10000)) + 10000}`;

		logger.debug('changeDisplayName() [displayName:"%s"]', displayName);

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

			this._displayName=displayName;

		}
		catch (error)
		{
			logger.error('changeDisplayName() [error:"%o"]', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.changeDisplayNameError',
						defaultMessage : 'An error occurred while changing your display name'
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
			logger.error('changePicture() [error:"%o"]', error);
		}
	}

	async sendChatMessage(chatMessage)
	{
		logger.debug('sendChatMessage() [chatMessage:"%s"]', chatMessage);

		try
		{
			store.dispatch(
				chatActions.addMessage(
					{
						...chatMessage,
						// name    : 'Me',
						sender  : 'client',
						picture : undefined,
						isRead  : true
					}
				)
			);

			store.dispatch(
				chatActions.setIsScrollEnd(true));

			await this.sendRequest('chatMessage', { chatMessage });

		}
		catch (error)
		{
			logger.error('sendChatMessage() [error:"%o"]', error);

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
				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : intl.formatMessage({
							id             : 'filesharing.saveFileError',
							defaultMessage : 'Unable to save file'
						})
					}));

				return;
			}

			saveAs(blob, file.name);
		});
	}

	async saveChat()
	{
		const html = window.document.getElementsByTagName('html')[0].cloneNode(true);

		const chatEl = html.querySelector('#chatList');

		html.querySelector('body').replaceChildren(chatEl);

		const fileName= 'chat.html';

		// remove unused tags
		[ 'script', 'link' ].forEach((element) =>
		{
			const el = html.getElementsByTagName(element);

			let i = el.length;

			while (i--) el[i].parentNode.removeChild(el[i]);
		});

		// embed images
		for await (const img of html.querySelectorAll('img'))
		{
			img.src = `${img.src}`;

			await fetch(img.src)

				.then((response) => response.blob())
				.then((data) =>
				{
					const reader = new FileReader();

					reader.readAsDataURL(data);

					reader.onloadend = () => { img.src = reader.result; };
				});
		}

		const blob = new Blob([ html.innerHTML ], { type: 'text/html;charset=utf-8' });

		saveAs(blob, fileName);
	}

	sortChat(order)
	{
		store.dispatch(
			chatActions.sortChat(order)
		);
	}

	handleDownload(magnetUri)
	{
		store.dispatch(
			fileActions.setFileActive(magnetUri));

		const existingTorrent = this._webTorrent.get(magnetUri);

		if (existingTorrent)
		{
			// Never add duplicate torrents, use the existing one instead.
			this._handleTorrent(existingTorrent);

			return;
		}

		this._webTorrent.add(magnetUri, this._handleTorrent);
	}

	_handleTorrent(torrent)
	{
		// Torrent already done, this can happen if the
		// same file was sent multiple times.
		if (torrent.progress === 1)
		{
			store.dispatch(
				fileActions.setFileDone(
					torrent.magnetURI,
					torrent.files
				));

			return;
		}

		// let lastMove = 0;

		torrent.on('download', () =>
		{
			// if (Date.now() - lastMove > 1000)
			// {
			store.dispatch(
				fileActions.setFileProgress(
					torrent.magnetURI,
					torrent.progress
				));

			// lastMove = Date.now();
			// }
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

	async shareFiles(data)
	{
		store.dispatch(requestActions.notify(
			{
				text : intl.formatMessage({
					id             : 'filesharing.startingFileShare',
					defaultMessage : 'Attempting to share file'
				})
			}));

		createTorrent(data.attachment, (err, torrent) =>
		{
			if (err)
			{
				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : intl.formatMessage({
							id             : 'filesharing.unableToShare',
							defaultMessage : 'Unable to share file'
						})
					}));

				return;
			}

			const existingTorrent = this._webTorrent.get(torrent);

			if (existingTorrent)
			{
				store.dispatch(requestActions.notify(
					{
						text : intl.formatMessage({
							id             : 'filesharing.successfulFileShare',
							defaultMessage : 'File successfully shared'
						})
					}));

				const file = {
					...data,
					peerId    : this._peerId,
					magnetUri : existingTorrent.magnetURI
				};

				store.dispatch(fileActions.addFile(file));

				this._sendFile(file);

				return;
			}

			this._webTorrent.seed(
				data.attachment,
				{ announceList: [ [ this._tracker ] ] },
				(newTorrent) =>
				{
					store.dispatch(requestActions.notify(
						{
							text : intl.formatMessage({
								id             : 'filesharing.successfulFileShare',
								defaultMessage : 'File successfully shared'
							})
						}));

					const file = {
						...data,
						peerId    : this._peerId,
						magnetUri : newTorrent.magnetURI
					};

					store.dispatch(fileActions.addFile(file));

					this._sendFile(file);
				});
		});
	}

	async _sendFile(file)
	{
		logger.debug('sendFile() [magnetUri:"%o"]', file.magnetUri);

		try
		{
			await this.sendRequest('sendFile', file);
		}
		catch (error)
		{
			logger.error('sendFile() [error:"%o"]', error);

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

			store.dispatch(
				settingsActions.setAudioMuted(true));

		}
		catch (error)
		{
			logger.error('muteMic() [error:"%o"]', error);

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
			this.updateMic({ start: true });
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

				store.dispatch(
					settingsActions.setAudioMuted(false));

			}
			catch (error)
			{
				logger.error('unmuteMic() [error:"%o"]', error);

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

		store.dispatch(roomActions.setSpotlights(spotlights));

		try
		{
			for (const consumer of this._consumers.values())
			{
				if (consumer.kind === 'video')
				{
					if (spotlights.includes(consumer.appData.peerId))
					{
						await this._resumeConsumer(consumer);
					}
					else
					{
						await this._pauseConsumer(consumer);
						store.dispatch(
							roomActions.removeSelectedPeer(consumer.appData.peerId));
					}
				}
			}
		}
		catch (error)
		{
			logger.error('updateSpotlights() [error:"%o"]', error);
		}
	}

	disconnectLocalHark()
	{
		logger.debug('disconnectLocalHark()');

		if (this._harkStream != null)
		{
			let [ track ] = this._harkStream.getAudioTracks();

			track.stop();
			track = null;

			this._harkStream = null;
		}

		if (this._hark != null)
			this._hark.stop();
	}

	connectLocalHark(track)
	{
		logger.debug('connectLocalHark() [track:"%o"]', track);

		this._harkStream = new MediaStream();

		const newTrack = track.clone();

		this._harkStream.addTrack(newTrack);

		newTrack.enabled = true;

		this._hark = hark(this._harkStream,
			{
				play      : false,
				interval  : 10,
				threshold : store.getState().settings.noiseThreshold,
				history   : 100
			});

		this._hark.lastVolume = -100;

		this._hark.on('volume_change', (volume) =>
		{
			volume = Math.round(volume);

			// Update only if there is a bigger diff 
			if (this._micProducer && Math.abs(volume - this._hark.lastVolume) > 0.5)
			{
				// Decay calculation: keep in mind that volume range is -100 ... 0 (dB)
				// This makes decay volume fast if difference to last saved value is big
				// and slow for small changes. This prevents flickering volume indicator
				// at low levels
				if (volume < this._hark.lastVolume)
				{
					volume = Math.round(
						this._hark.lastVolume -
						Math.pow(
							(volume - this._hark.lastVolume) /
							(100 + this._hark.lastVolume)
							, 2
						) * 10);
				}

				this._hark.lastVolume = volume;

				store.dispatch(peerVolumeActions.setPeerVolume(this._peerId, volume));
			}
		});

		this._hark.on('speaking', () =>
		{
			store.dispatch(meActions.setIsSpeaking(true));

			if (
				(store.getState().settings.voiceActivatedUnmute ||
				store.getState().me.isAutoMuted) &&
				this._micProducer &&
				this._micProducer.paused
			)
				this._micProducer.resume();

			store.dispatch(meActions.setAutoMuted(false)); // sanity action
		});

		this._hark.on('stopped_speaking', () =>
		{
			store.dispatch(meActions.setIsSpeaking(false));

			if (
				store.getState().settings.voiceActivatedUnmute &&
				this._micProducer &&
				!this._micProducer.paused
			)
			{
				this._micProducer.pause();

				store.dispatch(meActions.setAutoMuted(true));
			}
		});
	}

	async changeAudioOutputDevice(deviceId)
	{
		logger.debug('changeAudioOutputDevice() [deviceId:"%s"]', deviceId);

		store.dispatch(
			meActions.setAudioOutputInProgress(true));

		try
		{
			const device = this._audioOutputDevices[deviceId];

			if (!device)
				throw new Error('Selected audio output device no longer available');

			store.dispatch(settingsActions.setSelectedAudioOutputDevice(deviceId));

			await this._updateAudioOutputDevices();
		}
		catch (error)
		{
			logger.error('changeAudioOutputDevice() [error:"%o"]', error);
		}

		store.dispatch(
			meActions.setAudioOutputInProgress(false));
	}

	// Only Firefox supports applyConstraints to audio tracks
	// See:
	// https://bugs.chromium.org/p/chromium/issues/detail?id=796964
	async updateMic({
		start = false,
		restart = true,
		newDeviceId = null
	} = {})
	{
		logger.debug(
			'updateMic() [start:"%s", restart:"%s", newDeviceId:"%s"]',
			start,
			restart,
			newDeviceId
		);

		let track;

		try
		{
			if (!this._mediasoupDevice.canProduce('audio'))
				throw new Error('cannot produce audio');

			if (newDeviceId && !restart)
				throw new Error('changing device requires restart');

			if (newDeviceId)
				store.dispatch(settingsActions.setSelectedAudioDevice(newDeviceId));

			store.dispatch(meActions.setAudioInProgress(true));

			const deviceId = await this._getAudioDeviceId();
			const device = this._audioDevices[deviceId];

			if (!device)
				throw new Error('no audio devices');

			const {
				autoGainControl,
				echoCancellation,
				noiseSuppression,
				sampleRate,
				channelCount,
				sampleSize,
				opusStereo,
				opusDtx,
				opusFec,
				opusPtime,
				opusMaxPlaybackRate
			} = store.getState().settings;

			if (
				(restart && this._micProducer) ||
				start
			)
			{
				this.disconnectLocalHark();

				let muted = false;

				if (this._micProducer)
				{
					muted = this._micProducer.paused;
					await this.disableMic();
				}

				const stream = await navigator.mediaDevices.getUserMedia(
					{
						audio : {
							deviceId : { ideal: deviceId },
							sampleRate,
							channelCount,
							autoGainControl,
							echoCancellation,
							noiseSuppression,
							sampleSize
						}
					}
				);

				([ track ] = stream.getAudioTracks());

				const { deviceId: trackDeviceId } = track.getSettings();

				store.dispatch(settingsActions.setSelectedAudioDevice(trackDeviceId));

				const networkPriority =
					config.networkPriorities?.audio ?
						config.networkPriorities?.audio :
						DEFAULT_NETWORK_PRIORITIES.audio;

				this._micProducer = await this._sendTransport.produce(
					{
						track,
						encodings :
						[
							{
								networkPriority
							}
						],
						codecOptions :
						{
							opusStereo          : opusStereo,
							opusFec             : opusFec,
							opusDtx             : opusDtx,
							opusMaxPlaybackRate : opusMaxPlaybackRate,
							opusPtime           : opusPtime
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

					this.disableMic();
				});

				this.connectLocalHark(track);
				if (muted) this.muteMic();
				else this.unmuteMic();
			}
			else if (this._micProducer)
			{
				({ track } = this._micProducer);

				await track.applyConstraints(
					{
						sampleRate,
						channelCount,
						autoGainControl,
						echoCancellation,
						noiseSuppression,
						sampleSize
					}
				);

				if (this._harkStream != null)
				{
					const [ harkTrack ] = this._harkStream.getAudioTracks();

					harkTrack && await harkTrack.applyConstraints(
						{
							sampleRate,
							channelCount,
							autoGainControl,
							echoCancellation,
							noiseSuppression,
							sampleSize
						}
					);
				}
			}

			// TODO update recorder inputs 
			/* 
			if (recorder != null)
			{
				recorder.addTrack(new MediaStream([ this._micProducer.track ]));
			}
			*/
			await this._updateAudioDevices();
		}
		catch (error)
		{
			logger.error('updateMic() [error:"%o"]', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.microphoneError',
						defaultMessage : 'An error occurred while accessing your microphone'
					})
				}));

			if (track)
				track.stop();
		}

		store.dispatch(meActions.setAudioInProgress(false));
	}

	async updateWebcam({
		init = false,
		start = false,
		restart = false,
		newDeviceId = null,
		newResolution = null,
		newFrameRate = null
	} = {})
	{
		logger.debug(
			'updateWebcam() [start:"%s", restart:"%s", newDeviceId:"%s", newResolution:"%s", newFrameRate:"%s"]',
			start,
			restart,
			newDeviceId,
			newResolution,
			newFrameRate
		);

		let track;

		try
		{
			if (!this._mediasoupDevice.canProduce('video'))
				throw new Error('cannot produce video');

			if (newDeviceId && !restart)
				throw new Error('changing device requires restart');

			if (newDeviceId)
				store.dispatch(settingsActions.setSelectedWebcamDevice(newDeviceId));

			if (newResolution)
				store.dispatch(settingsActions.setVideoResolution(newResolution));

			if (newFrameRate)
				store.dispatch(settingsActions.setVideoFrameRate(newFrameRate));

			const { videoMuted } = store.getState().settings;

			if (init && videoMuted)
				return;
			else
				store.dispatch(settingsActions.setVideoMuted(false));

			store.dispatch(meActions.setWebcamInProgress(true));

			const deviceId = await this._getWebcamDeviceId();
			const device = this._webcams[deviceId];

			if (!device)
				throw new Error('no webcam devices');

			const {
				resolution,
				aspectRatio,
				frameRate
			} = store.getState().settings;

			if (
				(restart && this._webcamProducer) ||
				start
			)
			{
				if (this._webcamProducer)
					await this.disableWebcam();

				const stream = await navigator.mediaDevices.getUserMedia(
					{
						video :
						{
							deviceId : { ideal: deviceId },
							...getVideoConstrains(resolution, aspectRatio),
							frameRate
						}
					});

				([ track ] = stream.getVideoTracks());

				const { deviceId: trackDeviceId, width, height } = track.getSettings();

				logger.debug('getUserMedia track settings:', track.getSettings());

				store.dispatch(settingsActions.setSelectedWebcamDevice(trackDeviceId));

				const networkPriority =
					config.networkPriorities?.mainVideo ?
						config.networkPriorities?.mainVideo :
						DEFAULT_NETWORK_PRIORITIES.mainVideo;

				if (this._useSimulcast)
				{
					const encodings = this._getEncodings(width, height);
					const resolutionScalings = getResolutionScalings(encodings);

					/** 
					 * TODO: 
					 * I receive DOMException: 
					 * Failed to execute 'addTransceiver' on 'RTCPeerConnection': 
					 * Attempted to set an unimplemented parameter of RtpParameters.
					encodings.forEach((encoding) =>
					{
						encoding.networkPriority=networkPriority;
					});
					*/
					encodings[0].networkPriority=networkPriority;

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
								source : 'webcam',
								width,
								height,
								resolutionScalings
							}
						});
				}
				else
				{
					this._webcamProducer = await this._sendTransport.produce({
						track,
						encodings : [ { networkPriority } ],
						appData   :
						{
							source : 'webcam',
							width,
							height
						}
					});
				}

				store.dispatch(producerActions.addProducer(
					{
						id            : this._webcamProducer.id,
						source        : 'webcam',
						paused        : this._webcamProducer.paused,
						track         : this._webcamProducer.track,
						rtpParameters : this._webcamProducer.rtpParameters,
						codec         : this._webcamProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
					}));

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

					this.disableWebcam();
				});

				store.dispatch(settingsActions.setVideoMuted(false));
			}
			else if (this._webcamProducer)
			{
				({ track } = this._webcamProducer);

				await track.applyConstraints(
					{
						...getVideoConstrains(resolution, aspectRatio),
						frameRate
					}
				);

				// Also change resolution of extra video producers
				for (const producer of this._extraVideoProducers.values())
				{
					({ track } = producer);

					await track.applyConstraints(
						{
							...getVideoConstrains(resolution, aspectRatio),
							frameRate
						}
					);
				}
			}

			await this._updateWebcams();
		}
		catch (error)
		{
			logger.error('updateWebcam() [error:"%o"]', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.cameraError',
						defaultMessage : 'An error occurred while accessing your camera'
					})
				}));

			if (track)
				track.stop();
		}

		store.dispatch(
			meActions.setWebcamInProgress(false));
	}

	addSelectedPeer(peerId)
	{
		logger.debug('addSelectedPeer() [peerId:"%s"]', peerId);

		this._spotlights.addPeerToSelectedSpotlights(peerId);

		store.dispatch(
			roomActions.addSelectedPeer(peerId));
	}

	setSelectedPeer(peerId)
	{
		logger.debug('setSelectedPeer() [peerId:"%s"]', peerId);

		this.clearSelectedPeers();
		this.addSelectedPeer(peerId);
	}

	removeSelectedPeer(peerId)
	{
		logger.debug('removeSelectedPeer() [peerId:"%s"]', peerId);

		this._spotlights.removePeerFromSelectedSpotlights(peerId);

		store.dispatch(
			roomActions.removeSelectedPeer(peerId));
	}

	clearSelectedPeers()
	{
		logger.debug('clearSelectedPeers()');

		this._spotlights.clearPeersFromSelectedSpotlights();

		store.dispatch(
			roomActions.clearSelectedPeers());
	}

	async promoteAllLobbyPeers()
	{
		logger.debug('promoteAllLobbyPeers()');

		store.dispatch(
			roomActions.setLobbyPeersPromotionInProgress(true));

		try
		{
			await this.sendRequest('promoteAllPeers');
		}
		catch (error)
		{
			logger.error('promoteAllLobbyPeers() [error:"%o"]', error);
		}

		store.dispatch(
			roomActions.setLobbyPeersPromotionInProgress(false));
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
			logger.error('promoteLobbyPeer() [error:"%o"]', error);
		}

		store.dispatch(
			lobbyPeerActions.setLobbyPeerPromotionInProgress(peerId, false));
	}

	async clearChat()
	{
		logger.debug('clearChat()');

		store.dispatch(
			roomActions.setClearChatInProgress(true));

		try
		{
			await this.sendRequest('moderator:clearChat');

			store.dispatch(chatActions.clearChat());

			store.dispatch(fileActions.clearFiles());
		}
		catch (error)
		{
			logger.error('clearChat() [error:"%o"]', error);
		}

		store.dispatch(
			roomActions.setClearChatInProgress(false));
	}

	/*
	async clearFileSharing()
	{
		logger.debug('clearFileSharing()');

		store.dispatch(
			roomActions.setClearFileSharingInProgress(true));

		try
		{
			await this.sendRequest('moderator:clearFileSharing');

			store.dispatch(fileActions.clearFiles());
		}
		catch (error)
		{
			logger.error('clearFileSharing() [error:"%o"]', error);
		}

		store.dispatch(
			roomActions.setClearFileSharingInProgress(false));
	}
	*/

	async givePeerRole(peerId, roleId)
	{
		logger.debug('givePeerRole() [peerId:"%s", roleId:"%s"]', peerId, roleId);

		store.dispatch(
			peerActions.setPeerModifyRolesInProgress(peerId, true));

		try
		{
			await this.sendRequest('moderator:giveRole', { peerId, roleId });
		}
		catch (error)
		{
			logger.error('givePeerRole() [error:"%o"]', error);
		}

		store.dispatch(
			peerActions.setPeerModifyRolesInProgress(peerId, false));
	}

	async removePeerRole(peerId, roleId)
	{
		logger.debug('removePeerRole() [peerId:"%s", roleId:"%s"]', peerId, roleId);

		store.dispatch(
			peerActions.setPeerModifyRolesInProgress(peerId, true));

		try
		{
			await this.sendRequest('moderator:removeRole', { peerId, roleId });
		}
		catch (error)
		{
			logger.error('removePeerRole() [error:"%o"]', error);
		}

		store.dispatch(
			peerActions.setPeerModifyRolesInProgress(peerId, false));
	}

	async kickPeer(peerId)
	{
		logger.debug('kickPeer() [peerId:"%s"]', peerId);

		store.dispatch(
			peerActions.setPeerKickInProgress(peerId, true));

		try
		{
			await this.sendRequest('moderator:kickPeer', { peerId });
		}
		catch (error)
		{
			logger.error('kickPeer() [error:"%o"]', error);
		}

		store.dispatch(
			peerActions.setPeerKickInProgress(peerId, false));
	}

	async mutePeer(peerId)
	{
		logger.debug('mutePeer() [peerId:"%s"]', peerId);

		store.dispatch(
			peerActions.setMutePeerInProgress(peerId, true));

		try
		{
			await this.sendRequest('moderator:mute', { peerId });
		}
		catch (error)
		{
			logger.error('mutePeer() [error:"%o"]', error);
		}

		store.dispatch(
			peerActions.setMutePeerInProgress(peerId, false));
	}

	async stopPeerVideo(peerId)
	{
		logger.debug('stopPeerVideo() [peerId:"%s"]', peerId);

		store.dispatch(
			peerActions.setStopPeerVideoInProgress(peerId, true));

		try
		{
			await this.sendRequest('moderator:stopVideo', { peerId });
		}
		catch (error)
		{
			logger.error('stopPeerVideo() [error:"%o"]', error);
		}

		store.dispatch(
			peerActions.setStopPeerVideoInProgress(peerId, false));
	}

	async stopPeerScreenSharing(peerId)
	{
		logger.debug('stopPeerScreenSharing() [peerId:"%s"]', peerId);

		store.dispatch(
			peerActions.setStopPeerScreenSharingInProgress(peerId, true));

		try
		{
			await this.sendRequest('moderator:stopScreenSharing', { peerId });
		}
		catch (error)
		{
			logger.error('stopPeerScreenSharing() [error:"%o"]', error);
		}

		store.dispatch(
			peerActions.setStopPeerScreenSharingInProgress(peerId, false));
	}

	async muteAllPeers()
	{
		logger.debug('muteAllPeers()');

		store.dispatch(
			roomActions.setMuteAllInProgress(true));

		try
		{
			await this.sendRequest('moderator:muteAll');
		}
		catch (error)
		{
			logger.error('muteAllPeers() [error:"%o"]', error);
		}

		store.dispatch(
			roomActions.setMuteAllInProgress(false));
	}

	async stopAllPeerVideo()
	{
		logger.debug('stopAllPeerVideo()');

		store.dispatch(
			roomActions.setStopAllVideoInProgress(true));

		try
		{
			await this.sendRequest('moderator:stopAllVideo');
		}
		catch (error)
		{
			logger.error('stopAllPeerVideo() [error:"%o"]', error);
		}

		store.dispatch(
			roomActions.setStopAllVideoInProgress(false));
	}

	async stopAllPeerScreenSharing()
	{
		logger.debug('stopAllPeerScreenSharing()');

		store.dispatch(
			roomActions.setStopAllScreenSharingInProgress(true));

		try
		{
			await this.sendRequest('moderator:stopAllScreenSharing');
		}
		catch (error)
		{
			logger.error('stopAllPeerScreenSharing() [error:"%o"]', error);
		}

		store.dispatch(
			roomActions.setStopAllScreenSharingInProgress(false));
	}

	async closeMeeting()
	{
		logger.debug('closeMeeting()');

		store.dispatch(
			roomActions.setCloseMeetingInProgress(true));

		try
		{
			await this.sendRequest('moderator:closeMeeting');
		}
		catch (error)
		{
			logger.error('closeMeeting() [error:"%o"]', error);
		}

		store.dispatch(
			roomActions.setCloseMeetingInProgress(false));
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
						await this._pauseConsumer(consumer);
					else
						await this._resumeConsumer(consumer);
				}
			}
		}
		catch (error)
		{
			logger.error('modifyPeerConsumer() [error:"%o"]', error);
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

	async setAudioGain(micConsumer, peerId, audioGain)
	{
		logger.debug(
			'setAudioGain() [micConsumer:"%o", peerId:"%s", type:"%s"]',
			micConsumer,
			peerId,
			audioGain
		);

		if (!micConsumer)
		{
			return;
		}

		micConsumer.audioGain = audioGain;

		try
		{
			for (const consumer of this._consumers.values())
			{
				if (consumer.appData.peerId === peerId)
				{
					store.dispatch(consumerActions.setConsumerAudioGain(consumer.id, audioGain));
				}
			}
		}
		catch (error)
		{
			logger.error('setAudioGain() [error:"%o"]', error);
		}
	}

	async _pauseConsumer(consumer)
	{
		logger.debug('_pauseConsumer() [consumer:"%o"]', consumer);

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
			logger.error('_pauseConsumer() [consumerId: %s; error:"%o"]', consumer.id, error);
			if (error.notFoundInMediasoupError)
			{
				this._closeConsumer(consumer.id);
			}
		}
	}

	async _resumeConsumer(consumer, { initial = false } = {})
	{
		logger.debug('_resumeConsumer() [consumer:"%o"]', consumer);

		if ((!initial && !consumer.paused) || consumer.closed)
			return;

		try
		{
			consumer.resume();
			await this.sendRequest('resumeConsumer', { consumerId: consumer.id });
			store.dispatch(
				consumerActions.setConsumerResumed(consumer.id, 'local'));
		}
		catch (error)
		{
			logger.error('_resumeConsumer() [consumerId: %s; error:"%o"]', consumer.id, error);
			if (error.notFoundInMediasoupError)
			{
				this._closeConsumer(consumer.id);
			}
		}
	}

	async _startConsumer(consumer)
	{
		return this._resumeConsumer(consumer, { initial: true });
	}

	async lowerPeerHand(peerId)
	{
		logger.debug('lowerPeerHand() [peerId:"%s"]', peerId);

		store.dispatch(
			peerActions.setPeerRaisedHandInProgress(peerId, true));

		try
		{
			await this.sendRequest('moderator:lowerHand', { peerId });
		}
		catch (error)
		{
			logger.error('lowerPeerHand() [error:"%o"]', error);
		}

		store.dispatch(
			peerActions.setPeerRaisedHandInProgress(peerId, false));
	}

	async setRaisedHand(raisedHand)
	{
		logger.debug('setRaisedHand: ', raisedHand);

		store.dispatch(
			meActions.setRaisedHandInProgress(true));

		try
		{
			await this.sendRequest('raisedHand', { raisedHand });

			store.dispatch(
				meActions.setRaisedHand(raisedHand));
		}
		catch (error)
		{
			logger.error('setRaisedHand() [error:"%o"]', error);

			// We need to refresh the component for it to render changed state
			store.dispatch(meActions.setRaisedHand(!raisedHand));
		}

		store.dispatch(
			meActions.setRaisedHandInProgress(false));
	}

	async setMaxSendingSpatialLayer(spatialLayer)
	{
		logger.debug('setMaxSendingSpatialLayer() [spatialLayer:"%s"]', spatialLayer);

		try
		{
			if (this._webcamProducer)
				await this._webcamProducer.setMaxSpatialLayer(spatialLayer);
			if (this._screenSharingProducer)
				await this._screenSharingProducer.setMaxSpatialLayer(spatialLayer);
		}
		catch (error)
		{
			logger.error('setMaxSendingSpatialLayer() [error:"%o"]', error);
		}
	}

	async setConsumerPreferredLayers(consumerId, spatialLayer, temporalLayer)
	{
		logger.debug(
			'setConsumerPreferredLayers() [consumerId:"%s", spatialLayer:"%s", temporalLayer:"%s"]',
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
			logger.error('setConsumerPreferredLayers() [consumerId: %s; error:"%o"]', consumerId, error);
			if (error.notFoundInMediasoupError)
			{
				this._closeConsumer(consumerId);
			}
		}
	}

	async restartIce(transport, ice, delay)
	{
		logger.debug('restartIce() [transport:%o ice:%o delay:%d]', transport, ice, delay);

		if (!transport)
		{
			logger.error('restartIce(): missing valid transport object');

			return;
		}

		if (!ice)
		{
			logger.error('restartIce(): missing valid ice object');

			return;
		}

		clearTimeout(ice.timer);
		ice.timer = setTimeout(async () =>
		{
			try
			{
				if (ice.restarting)
				{
					return;
				}
				ice.restarting = true;

				const iceParameters = await this.sendRequest(
					'restartIce',
					{ transportId: transport.id });

				await transport.restartIce({ iceParameters });
				ice.restarting = false;
				logger.debug('ICE restarted');
			}
			catch (error)
			{
				logger.error('restartIce() [failed:%o]', error);

				ice.restarting = false;
				ice.timer = setTimeout(() =>
				{
					this.restartIce(transport, ice, delay * 2);
				}, delay);
			}
		}, delay);
	}

	setConsumerPreferredLayersMax(consumer)
	{
		if (consumer.type === 'simple')
		{
			return;
		}

		logger.debug(
			'setConsumerPreferredLayersMax() [consumerId:"%s"]', consumer.id);

		if (consumer.preferredSpatialLayer !== consumer.spatialLayers -1 ||
			consumer.preferredTemporalLayer !== consumer.temporalLayers -1)
		{
			return this.setConsumerPreferredLayers(consumer.id,
				consumer.spatialLayers - 1, consumer.temporalLayers - 1);
		}
	}

	adaptConsumerPreferredLayers(consumer, viewportWidth, viewportHeight)
	{
		if (consumer.type === 'simple')
		{
			return;
		}

		if (!viewportWidth || !viewportHeight)
		{
			return;
		}

		const {
			id,
			preferredSpatialLayer,
			preferredTemporalLayer,
			width,
			height,
			resolutionScalings
		} = consumer;
		const adaptiveScalingFactor = Math.min(Math.max(
			config.adaptiveScalingFactor || 0.75, 0.5), 1.0);

		logger.debug(
			'adaptConsumerPreferredLayers() [consumerId:"%s", width:"%d", height:"%d" resolutionScalings:[%s] viewportWidth:"%d", viewportHeight:"%d"]',
			consumer.id, width, height, resolutionScalings.join(', '),
			viewportWidth, viewportHeight);

		let newPreferredSpatialLayer = 0;

		for (let i = 0; i < resolutionScalings.length; i++)
		{
			const levelWidth = adaptiveScalingFactor * width / resolutionScalings[i];
			const levelHeight = adaptiveScalingFactor * height / resolutionScalings[i];

			if (viewportWidth >= levelWidth || viewportHeight >= levelHeight)
			{
				newPreferredSpatialLayer = i;
			}
			else
			{
				break;
			}
		}

		let newPreferredTemporalLayer = consumer.temporalLayers - 1;

		if (newPreferredSpatialLayer === 0 && newPreferredTemporalLayer > 0)
		{
			const lowestLevelWidth = width / resolutionScalings[0];
			const lowestLevelHeight = height / resolutionScalings[0];

			if (viewportWidth < lowestLevelWidth * 0.5
				&& viewportHeight < lowestLevelHeight * 0.5)
			{
				newPreferredTemporalLayer -= 1;
			}
			if (newPreferredTemporalLayer > 0
				&& viewportWidth < lowestLevelWidth * 0.25
				&& viewportHeight < lowestLevelHeight * 0.25)
			{
				newPreferredTemporalLayer -= 1;
			}
		}

		if (preferredSpatialLayer !== newPreferredSpatialLayer ||
			preferredTemporalLayer !== newPreferredTemporalLayer)
		{
			return this.setConsumerPreferredLayers(id,
				newPreferredSpatialLayer, newPreferredTemporalLayer);
		}

	}

	async setConsumerPriority(consumerId, priority)
	{
		logger.debug(
			'setConsumerPriority() [consumerId:"%s", priority:%d]',
			consumerId, priority);

		try
		{
			await this.sendRequest('setConsumerPriority', { consumerId, priority });

			store.dispatch(consumerActions.setConsumerPriority(consumerId, priority));
		}
		catch (error)
		{
			logger.error('setConsumerPriority() [consumerId: %s; error:"%o"]', consumerId, error);
			if (error.notFoundInMediasoupError)
			{
				this._closeConsumer(consumerId);
			}
		}
	}

	async requestConsumerKeyFrame(consumerId)
	{
		logger.debug('requestConsumerKeyFrame() [consumerId:"%s"]', consumerId);

		try
		{
			await this.sendRequest('requestConsumerKeyFrame', { consumerId });
		}
		catch (error)
		{
			logger.error('requestConsumerKeyFrame() [consumerId: %s; error:"%o"]', consumerId, error);
			if (error.notFoundInMediasoupError)
			{
				this._closeConsumer(consumerId);
			}
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

	async join({ roomId, joinVideo, joinAudio })
	{
		await this._loadDynamicImports();

		this._roomId = roomId;

		store.dispatch(roomActions.setRoomName(roomId));

		this._signalingUrl = getSignalingUrl(this._peerId, roomId);

		this._screenSharing = ScreenShare.create(this._device);

		this._signalingSocket = io(this._signalingUrl);

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

			if (this._screenSharingProducer)
			{
				this._screenSharingProducer.close();

				store.dispatch(
					producerActions.removeProducer(this._screenSharingProducer.id));

				this._screenSharingProducer = null;
			}

			if (this._webcamProducer)
			{
				this._webcamProducer.close();

				store.dispatch(
					producerActions.removeProducer(this._webcamProducer.id));

				this._webcamProducer = null;
			}

			for (const producer of this._extraVideoProducers.values())
			{
				producer.close();

				store.dispatch(
					producerActions.removeProducer(producer.id));
			}
			this._extraVideoProducers.clear();

			if (this._micProducer)
			{
				this._micProducer.close();

				store.dispatch(
					producerActions.removeProducer(this._micProducer.id));

				this._micProducer = null;
			}

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

			this._spotlights.clearSpotlights();

			store.dispatch(peerActions.clearPeers());
			store.dispatch(consumerActions.clearConsumers());
			store.dispatch(roomActions.clearSpotlights());
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
				'socket "request" event [method:"%s", data:"%o"]',
				request.method, request.data);

			switch (request.method)
			{
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
				'socket "notification" event [method:"%s", data:"%o"]',
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
						store.dispatch(meActions.loggedIn(false));
						store.dispatch(roomActions.setSignInRequired(true));

						break;
					}

					case 'overRoomLimit':
					{
						store.dispatch(roomActions.setOverRoomLimit(true));

						break;
					}

					case 'roomReady':
					{
						const { turnServers } = notification.data;

						this._turnServers = turnServers;

						store.dispatch(roomActions.toggleJoined());
						store.dispatch(roomActions.setInLobby(false));

						await this._joinRoom({ joinVideo, joinAudio });

						break;
					}

					case 'roomBack':
					{
						await this._joinRoom({
							joinVideo : !store.getState().settings.videoMuted,
							joinAudio : !store.getState().settings.audioMuted,
							returning : true
						});

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

						this._soundNotification(notification.method);

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'room.newLobbyPeer',
									defaultMessage : 'New participant entered the lobby'
								})
							}));

						break;
					}

					case 'parkedPeers':
					{
						const { lobbyPeers } = notification.data;

						if (lobbyPeers.length > 0)
						{
							lobbyPeers.forEach((peer) =>
							{
								store.dispatch(
									lobbyPeerActions.addLobbyPeer(peer.id));

								store.dispatch(
									lobbyPeerActions.setLobbyPeerDisplayName(
										peer.displayName,
										peer.id
									)
								);

								store.dispatch(
									lobbyPeerActions.setLobbyPeerPicture(
										peer.picture,
										peer.id
									)
								);
							});

							store.dispatch(
								roomActions.setToolbarsVisible(true));

							this._soundNotification(notification.method);

							store.dispatch(requestActions.notify(
								{
									text : intl.formatMessage({
										id             : 'room.newLobbyPeer',
										defaultMessage : 'New participant entered the lobby'
									})
								}));
						}

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

						if (peerId === this._peerId)
							this._displayName=displayName;

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

						if (peerId === this._peerId)
							this._displayName=displayName;

						break;
					}

					case 'changePicture':
					{
						const { peerId, picture } = notification.data;

						store.dispatch(peerActions.setPeerPicture(peerId, picture));

						break;
					}

					case 'raisedHand':
					{
						const {
							peerId,
							raisedHand,
							raisedHandTimestamp
						} = notification.data;

						store.dispatch(
							peerActions.setPeerRaisedHand(
								peerId,
								raisedHand,
								raisedHandTimestamp
							)
						);

						const { displayName } = store.getState().peers[peerId];

						let text;

						if (raisedHand)
						{
							text = intl.formatMessage({
								id             : 'room.raisedHand',
								defaultMessage : '{displayName} raised their hand'
							}, {
								displayName
							});
						}
						else
						{
							text = intl.formatMessage({
								id             : 'room.loweredHand',
								defaultMessage : '{displayName} put their hand down'
							}, {
								displayName
							});
						}

						if (displayName)
						{
							store.dispatch(requestActions.notify(
								{
									text
								}));
						}

						this._soundNotification(notification.method);

						break;
					}

					case 'chatMessage':
					{
						const { peerId, chatMessage } = notification.data;

						store.dispatch(
							chatActions.addMessage({ ...chatMessage, peerId, isRead: false }));

						if (
							!store.getState().toolarea.toolAreaOpen ||
							(store.getState().toolarea.toolAreaOpen &&
							store.getState().toolarea.currentToolTab !== 'chat')
						) // Make sound
						{
							store.dispatch(
								roomActions.setToolbarsVisible(true));
							this._soundNotification(notification.method);
						}

						break;
					}

					case 'moderator:clearChat':
					{
						store.dispatch(chatActions.clearChat());

						store.dispatch(fileActions.clearFiles());

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'moderator.clearChat',
									defaultMessage : 'Moderator cleared the chat'
								})
							}));

						break;
					}

					case 'sendFile':
					{
						const file = notification.data;

						store.dispatch(fileActions.addFile({ ...file }));

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
							store.getState().toolarea.currentToolTab !== 'chat')
						) // Make sound
						{
							store.dispatch(
								roomActions.setToolbarsVisible(true));
							this._soundNotification(notification.method);
						}

						break;
					}

					/*
					case 'moderator:clearFileSharing':
					{
						store.dispatch(fileActions.clearFiles());

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'moderator.clearFiles',
									defaultMessage : 'Moderator cleared the files'
								})
							}));

						break;
					}
					*/

					case 'producerScore':
					{
						const { producerId, score } = notification.data;

						store.dispatch(
							producerActions.setProducerScore(producerId, score));

						break;
					}

					case 'newPeer':
					{
						const {
							id,
							displayName,
							picture,
							roles,
							returning
						} = notification.data;

						store.dispatch(peerActions.addPeer(
							{ id, displayName, picture, roles, consumers: [] }));

						this._spotlights.newPeer(id);

						if (!returning)
						{
							this._soundNotification(notification.method);

							store.dispatch(requestActions.notify(
								{
									text : intl.formatMessage({
										id             : 'room.newPeer',
										defaultMessage : '{displayName} joined the room'
									}, {
										displayName
									})
								}));
						}

						break;
					}

					case 'peerClosed':
					{
						const { peerId } = notification.data;

						for (const consumer of this._consumers.values())
						{
							if (peerId === consumer.appData.peerId)
							{
								this._closeConsumer(consumer.id);
							}
						}

						this._spotlights.closePeer(peerId);

						store.dispatch(
							peerActions.removePeer(peerId));

						break;
					}

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
							producerPaused,
							score
						} = notification.data;

						const consumer = await this._recvTransport.consume(
							{
								id,
								producerId,
								kind,
								rtpParameters,
								appData : { ...appData, peerId } // Trick.
							});

						if (this._recvTransport.appData.encodedInsertableStreams)
						{
							const { enableOpusDetails } = store.getState().settings;

							if (kind === 'audio' && enableOpusDetails)
								opusReceiverTransform(consumer.rtpReceiver, consumer.id);
							else
								directReceiverTransform(consumer.rtpReceiver);
						}

						// Store in the map.
						this._consumers.set(consumer.id, consumer);

						consumer.on('transportclose', () =>
						{
							this._consumers.delete(consumer.id);
						});

						const { spatialLayers, temporalLayers } =
							mediasoupClient.parseScalabilityMode(
								consumer.rtpParameters.encodings[0].scalabilityMode);

						const consumerStoreObject = {
							id                     : consumer.id,
							peerId                 : peerId,
							kind                   : kind,
							type                   : type,
							locallyPaused          : false,
							remotelyPaused         : producerPaused,
							rtpParameters          : consumer.rtpParameters,
							source                 : consumer.appData.source,
							width                  : consumer.appData.width,
							height                 : consumer.appData.height,
							resolutionScalings     : consumer.appData.resolutionScalings,
							spatialLayers          : spatialLayers,
							temporalLayers         : temporalLayers,
							preferredSpatialLayer  : 0,
							preferredTemporalLayer : 0,
							priority               : 1,
							codec                  : consumer.rtpParameters.codecs[0].mimeType.split('/')[1],
							track                  : consumer.track,
							score                  : score,
							audioGain              : undefined,
							opusConfig             : null
						};

						this._spotlights.addVideoConsumer(consumerStoreObject);

						store.dispatch(consumerActions.addConsumer(consumerStoreObject, peerId));

						await this._startConsumer(consumer);

						if (kind === 'audio')
						{
							consumer.volume = 0;

							const stream = new MediaStream();

							stream.addTrack(consumer.track);

							if (!stream.getAudioTracks()[0])
								throw new Error('request.newConsumer | given stream has no audio track');

							consumer.hark = hark(stream, { play: false, interval: 100 });

							consumer.hark.on('volume_change', (volume) =>
							{
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

					case 'consumerClosed':
					{
						const { consumerId } = notification.data;

						this._closeConsumer(consumerId);

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

						this._spotlights.pauseVideoConsumer(consumerId);

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

						this._spotlights.resumeVideoConsumer(consumerId);

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

					case 'moderator:mute':
					{
						if (this._micProducer && !this._micProducer.paused)
						{
							this.muteMic();

							store.dispatch(requestActions.notify(
								{
									text : intl.formatMessage({
										id             : 'moderator.muteAudio',
										defaultMessage : 'Moderator muted your audio'
									})
								}));
						}

						break;
					}

					case 'moderator:stopVideo':
					{
						this.disableWebcam();

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'moderator.muteVideo',
									defaultMessage : 'Moderator stopped your video'
								})
							}));

						break;
					}

					case 'moderator:stopScreenSharing':
					{
						this.disableScreenSharing();

						store.dispatch(requestActions.notify(
							{
								text : intl.formatMessage({
									id             : 'moderator.stopScreenSharing',
									defaultMessage : 'Moderator stopped your screen sharing'
								})
							}));

						break;
					}

					case 'moderator:kick':
					{
						// Need some feedback
						this.close();

						break;
					}

					case 'moderator:lowerHand':
					{
						this.setRaisedHand(false);

						break;
					}

					case 'gotRole':
					{
						const { peerId, roleId } = notification.data;

						const userRoles = store.getState().room.userRoles;

						if (peerId === this._peerId)
						{
							store.dispatch(meActions.addRole(roleId));

							store.dispatch(requestActions.notify(
								{
									text : intl.formatMessage({
										id             : 'roles.gotRole',
										defaultMessage : 'You got the role: {role}'
									}, {
										role : userRoles.get(roleId).label
									})
								}));
						}
						else
							store.dispatch(peerActions.addPeerRole(peerId, roleId));

						break;
					}

					case 'lostRole':
					{
						const { peerId, roleId } = notification.data;

						const userRoles = store.getState().room.userRoles;

						if (peerId === this._peerId)
						{
							store.dispatch(meActions.removeRole(roleId));

							store.dispatch(requestActions.notify(
								{
									text : intl.formatMessage({
										id             : 'roles.lostRole',
										defaultMessage : 'You lost the role: {role}'
									}, {
										role : userRoles.get(roleId).label
									})
								}));
						}
						else
							store.dispatch(peerActions.removePeerRole(peerId, roleId));

						break;
					}
					case 'addConsentForRecording':
					{
						// eslint-disable-next-line no-unused-vars
						const { peerId, consent } = notification.data;

						store.dispatch(
							peerActions.setPeerLocalRecordingConsent(peerId, consent));

						break;
					}
					case 'setLocalRecording':
					{
						const { peerId, localRecordingState } = notification.data;
						const { me, peers } = store.getState();

						let displayNameOfRecorder;

						if (peerId === me.id)
						{
							displayNameOfRecorder = store.getState().settings.displayName;
						}
						else if (peers[peerId])
							displayNameOfRecorder = store.getState().peers[peerId].displayName;
						else
							return;

						// Save state to peer
						store.dispatch(
							peerActions.setPeerLocalRecordingState(peerId, localRecordingState));

						switch (localRecordingState)
						{
							case 'start':
								store.dispatch(requestActions.notify(
									{
										text : intl.formatMessage({
											id             : 'room.localRecordingStarted',
											defaultMessage : '{displayName} started local recording'
										}, {
											displayName : displayNameOfRecorder
										})
									}));
								break;
							case 'resume':
								store.dispatch(requestActions.notify(
									{
										text : intl.formatMessage({
											id             : 'room.localRecordingResumed',
											defaultMessage : '{displayName} resumed local recording'
										}, {
											displayName : displayNameOfRecorder
										})
									}));
								break;
							case 'pause':
							{
								store.dispatch(requestActions.notify(
									{
										text : intl.formatMessage({
											id             : 'room.localRecordingPaused',
											defaultMessage : '{displayName} paused local recording'
										}, {
											displayName : displayNameOfRecorder
										})
									}));
								break;
							}
							case 'stop':
								store.dispatch(requestActions.notify(
									{
										text : intl.formatMessage({
											id             : 'room.localRecordingStopped',
											defaultMessage : '{displayName} stopped local recording'
										}, {
											displayName : displayNameOfRecorder
										})
									}));
								break;
							default:
								break;
						}
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
				logger.error('error on socket "notification" event [error:"%o"]', error);

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

	async _joinRoom({ joinVideo, joinAudio, returning })
	{
		logger.debug('_joinRoom()');

		const { displayName, enableOpusDetails } = store.getState().settings;
		const { picture } = store.getState().me;

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

			routerRtpCapabilities.headerExtensions = routerRtpCapabilities.headerExtensions
				.filter((ext) => ext.uri !== 'urn:3gpp:video-orientation');

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
						iceServers             : this._turnServers,
						// TODO: Fix for issue #72
						iceTransportPolicy     : this._device.flag === 'firefox' && this._turnServers ? 'relay' : undefined,
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
					'connectionstatechange', (connectState) =>
					{
						switch (connectState)
						{
							case 'disconnected':
							case 'failed':
								this.restartIce(this._sendTransport, this._sendRestartIce, 2000);
								break;

							default:
								clearTimeout(this._sendRestartIce.timer);
								break;
						}
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
					iceServers         : this._turnServers,
					// TODO: Fix for issue #72
					iceTransportPolicy : this._device.flag === 'firefox' && this._turnServers ? 'relay' : undefined,
					additionalSettings : {
						encodedInsertableStreams : insertableStreamsSupported && enableOpusDetails
					},
					appData : {
						encodedInsertableStreams : insertableStreamsSupported && enableOpusDetails
					}
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

			this._recvTransport.on(
				'connectionstatechange', (connectState) =>
				{
					switch (connectState)
					{
						case 'disconnected':
						case 'failed':
							this.restartIce(this._recvTransport, this._recvRestartIce, 2000);
							break;

						default:
							clearTimeout(this._recvRestartIce.timer);
							break;
					}
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

			const {
				authenticated,
				roles,
				peers,
				tracker,
				roomPermissions,
				userRoles,
				allowWhenRoleMissing,
				chatHistory,
				fileHistory,
				lastNHistory,
				locked,
				lobbyPeers,
				accessCode
			} = await this.sendRequest(
				'join',
				{
					displayName     : displayName,
					picture         : picture,
					rtpCapabilities : this._mediasoupDevice.rtpCapabilities,
					returning       : returning
				});

			logger.debug(
				'_joinRoom() joined [authenticated:"%s", peers:"%o", roles:"%o", userRoles:"%o"]',
				authenticated,
				peers,
				roles,
				userRoles
			);

			tracker && (this._tracker = tracker);

			store.dispatch(meActions.loggedIn(authenticated));

			store.dispatch(roomActions.setRoomPermissions(roomPermissions));

			const roomUserRoles = new Map();

			Object.values(userRoles).forEach((val) => roomUserRoles.set(val.id, val));

			store.dispatch(roomActions.setUserRoles(roomUserRoles));

			if (allowWhenRoleMissing)
				store.dispatch(roomActions.setAllowWhenRoleMissing(allowWhenRoleMissing));

			const myRoles = store.getState().me.roles;

			for (const roleId of roles)
			{
				if (!myRoles.some((myRoleId) => roleId === myRoleId))
				{
					store.dispatch(meActions.addRole(roleId));

					store.dispatch(requestActions.notify(
						{
							text : intl.formatMessage({
								id             : 'roles.gotRole',
								defaultMessage : 'You got the role: {role}'
							}, {
								role : roomUserRoles.get(roleId).label
							})
						}));
				}
			}

			for (const peer of peers)
			{
				store.dispatch(
					peerActions.addPeer({ ...peer, consumers: [] }));
			}

			(chatHistory.length > 0) && store.dispatch(
				chatActions.addChatHistory(chatHistory));

			(fileHistory.length > 0) && store.dispatch(
				fileActions.addFileHistory(fileHistory));

			locked ?
				store.dispatch(roomActions.setRoomLocked()) :
				store.dispatch(roomActions.setRoomUnLocked());

			(lobbyPeers.length > 0) && lobbyPeers.forEach((peer) =>
			{
				store.dispatch(
					lobbyPeerActions.addLobbyPeer(peer.id));
				store.dispatch(
					lobbyPeerActions.setLobbyPeerDisplayName(peer.displayName, peer.id));
				store.dispatch(
					lobbyPeerActions.setLobbyPeerPicture(peer.picture, peer.id));
			});

			(accessCode != null) && store.dispatch(
				roomActions.setAccessCode(accessCode));

			// Don't produce if explicitly requested to not to do it.
			if (this._produce)
			{
				if (
					joinVideo &&
					this._havePermission(permissions.SHARE_VIDEO)
				)
				{
					this.updateWebcam({ init: true, start: true });
				}
				if (
					joinAudio &&
					this._mediasoupDevice.canProduce('audio') &&
					this._havePermission(permissions.SHARE_AUDIO)
				)
					if (!this._muted)
					{
						await this.updateMic({ start: true });
						const autoMuteThreshold = config.autoMuteThreshold;

						if (autoMuteThreshold >= 0 && peers.length >= autoMuteThreshold)
						{
							this.muteMic();
						}
					}
			}

			await this._updateAudioOutputDevices();

			const { selectedAudioOutputDevice } = store.getState().settings;

			if (!selectedAudioOutputDevice && this._audioOutputDevices !== {})
			{
				store.dispatch(
					settingsActions.setSelectedAudioOutputDevice(
						Object.keys(this._audioOutputDevices)[0]
					)
				);
			}

			store.dispatch(roomActions.setRoomState('connected'));

			// Clean all the existing notifications.
			store.dispatch(notificationActions.removeAllNotifications());

			store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'room.joined',
						defaultMessage : 'You have joined the room'
					})
				}));

			this._spotlights.addPeers(peers);

			if (lastNHistory.length > 0)
			{
				logger.debug('_joinRoom() | got lastN history');

				this._spotlights.addSpeakerList(
					lastNHistory.filter((peerId) => peerId !== this._peerId)
				);
			}
		}
		catch (error)
		{
			logger.error('_joinRoom() [error:"%o"]', error);

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

	getRecorderSupportedMimeTypes()
	{
		const mimeTypes = [];

		const mimeTypeCapability = [

			/* audio codecs
			[ 'audio/wav', [] ],
			[ 'audio/pcm', [] ],
			[ 'audio/webm', [ 'Chrome', 'Firefox', 'Safari' ] ],
			[ 'audio/ogg', [ 'Firefox' ] ],
			[ 'audio/opus', [] ],
			*/
			[ 'video/webm', [ 'Chrome', 'Firefox', 'Safari' ] ],
			[ 'video/webm;codecs="vp8, opus"', [ 'Chrome', 'Firefox', 'Safari' ] ],
			[ 'video/webm;codecs="vp9, opus"', [ 'Chrome' ] ],
			[ 'video/webm;codecs="h264, opus"', [ 'Chrome' ] ],
			[ 'video/mp4', [] ],
			[ 'video/mpeg', [] ],
			[ 'video/x-matroska;codecs=avc1', [ 'Chrome' ] ]
		];

		if (typeof MediaRecorder === 'undefined')
		{
			window.MediaRecorder = {
				isTypeSupported : function()
				{
					return false;
				}
			};
		}
		mimeTypeCapability.forEach((item) =>
		{
			if (MediaRecorder.isTypeSupported(item[0]) && !mimeTypes.includes(item[0]))
			{
				mimeTypes.push(item[0]);
			}
		});

		return mimeTypes;
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

			logger.error('lockRoom() [error:"%o"]', error);
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

			logger.error('unlockRoom() [error:"%o"]', error);
		}
	}

	async addConsentForRecording(consent)
	{
		logger.debug('addConsentForRecording()');

		try
		{
			store.dispatch(
				recorderActions.setLocalRecordingConsent(consent));
			await this.sendRequest('addConsentForRecording', { consent });
		}
		catch (error)
		{

			logger.error('addConsentForRecording() [error:"%o"]', error);
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
			logger.error('setAccessCode() [error:"%o"]', error);
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
			logger.error('setAccessCode() [error:"%o"]', error);
			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : 'Unable to set join by access code.'
				}));
		}
	}

	async addExtraVideo(videoDeviceId)
	{
		logger.debug(
			'addExtraVideo() [videoDeviceId:"%s"]',
			videoDeviceId
		);

		store.dispatch(
			roomActions.setExtraVideoOpen(false));

		if (!this._mediasoupDevice.canProduce('video'))
		{
			logger.error('addExtraVideo() | cannot produce video');

			return;
		}

		let track;

		store.dispatch(
			meActions.setWebcamInProgress(true));

		try
		{
			const device = this._webcams[videoDeviceId];
			const { resolution, aspectRatio } = store.getState().settings;

			if (!device)
				throw new Error('no webcam devices');

			const stream = await navigator.mediaDevices.getUserMedia(
				{
					video :
					{
						deviceId : { ideal: videoDeviceId },
						...getVideoConstrains(resolution, aspectRatio)
					}
				});

			([ track ] = stream.getVideoTracks());

			const { width, height } = track.getSettings();

			logger.debug('extra video track settings:', track.getSettings());

			let exists = false;

			this._extraVideoProducers.forEach(function(value)
			{
				if (value._track.label===track.label)
				{
					exists=true;
				}
			});

			if (!exists)
			{

				let producer;

				const networkPriority =
					config.networkPriorities?.extraVideo ?
						config.networkPriorities?.extraVideo :
						DEFAULT_NETWORK_PRIORITIES.extraVideo;

				if (this._useSimulcast)
				{
					const encodings = this._getEncodings(width, height);
					const resolutionScalings = getResolutionScalings(encodings);

					/** 
					 * TODO: 
					 * I receive DOMException: 
					 * Failed to execute 'addTransceiver' on 'RTCPeerConnection': 
					 * Attempted to set an unimplemented parameter of RtpParameters.
					encodings.forEach((encoding) =>
					{
						encoding.networkPriority=networkPriority;
					});
					*/
					encodings[0].networkPriority=networkPriority;

					producer = await this._sendTransport.produce(
						{
							track,
							encodings,
							codecOptions :
							{
								videoGoogleStartBitrate : 1000
							},
							appData :
							{
								source : 'extravideo',
								width,
								height,
								resolutionScalings
							}
						});
				}
				else
				{
					producer = await this._sendTransport.produce({
						track,
						encodings : [ { networkPriority } ],
						appData   :
						{
							source : 'extravideo',
							width,
							height
						}
					});
				}

				this._extraVideoProducers.set(producer.id, producer);

				store.dispatch(producerActions.addProducer(
					{
						id            : producer.id,
						deviceLabel   : device.label,
						source        : 'extravideo',
						paused        : producer.paused,
						track         : producer.track,
						rtpParameters : producer.rtpParameters,
						codec         : producer.rtpParameters.codecs[0].mimeType.split('/')[1]
					}));

				// store.dispatch(settingsActions.setSelectedWebcamDevice(deviceId));

				await this._updateWebcams();

				producer.on('transportclose', () =>
				{
					this._extraVideoProducers.delete(producer.id);

					producer = null;
				});

				producer.on('trackended', () =>
				{
					store.dispatch(requestActions.notify(
						{
							type : 'error',
							text : intl.formatMessage({
								id             : 'devices.cameraDisconnected',
								defaultMessage : 'Camera disconnected'
							})
						}));

					this.disableExtraVideo(producer.id)
						.catch(() => {});
				});

				logger.debug('addExtraVideo() succeeded');

			}
			else
			{
				logger.error('addExtraVideo() duplicate');
				store.dispatch(requestActions.notify(
					{
						type : 'error',
						text : intl.formatMessage({
							id             : 'room.extraVideoDuplication',
							defaultMessage : 'Extra videodevice duplication errordefault'
						})
					}));
			}
		}
		catch (error)
		{
			logger.error('addExtraVideo() [error:"%o"]', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.cameraError',
						defaultMessage : 'An error occurred while accessing your camera'
					})
				}));

			if (track)
				track.stop();
		}

		store.dispatch(
			meActions.setWebcamInProgress(false));
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
	async updateRecorderPreferredMimeType({ recorderPreferredMimeType = null } = {})
	{
		logger.debug('updateRecorderPreferredMimeType [mime-type: "%s"]',
			recorderPreferredMimeType
		);
		store.dispatch(
			settingsActions.setRecorderPreferredMimeType(recorderPreferredMimeType));
	}

	async updateScreenSharing({
		start = false,
		newResolution = null,
		newFrameRate = null
	} = {})
	{
		logger.debug('updateScreenSharing() [start:"%s"]', start);

		let track;

		try
		{
			const available = this._screenSharing.isScreenShareAvailable();

			const isAudioEnabled = this._screenSharing.isAudioEnabled();

			if (!available)
				throw new Error('screen sharing not available');

			if (!this._mediasoupDevice.canProduce('video'))
				throw new Error('cannot produce video');

			if (newResolution)
				store.dispatch(settingsActions.setScreenSharingResolution(newResolution));

			if (newFrameRate)
				store.dispatch(settingsActions.setScreenSharingFrameRate(newFrameRate));

			store.dispatch(meActions.setScreenShareInProgress(true));

			const {
				screenSharingResolution,
				autoGainControl,
				echoCancellation,
				noiseSuppression,
				aspectRatio,
				screenSharingFrameRate,
				sampleRate,
				channelCount,
				sampleSize,
				opusStereo,
				opusDtx,
				opusFec,
				opusPtime,
				opusMaxPlaybackRate
			} = store.getState().settings;

			if (start)
			{
				let stream;

				if (isAudioEnabled)
				{
					stream = await this._screenSharing.start({
						...getVideoConstrains(screenSharingResolution, aspectRatio),
						frameRate : screenSharingFrameRate,
						sampleRate,
						channelCount,
						autoGainControl,
						echoCancellation,
						noiseSuppression,
						sampleSize
					});

				}
				else
				{
					stream = await this._screenSharing.start({
						...getVideoConstrains(screenSharingResolution, aspectRatio),
						frameRate : screenSharingFrameRate
					});

				}

				([ track ] = stream.getVideoTracks());

				const { width, height } = track.getSettings();

				logger.debug('screenSharing track settings:', track.getSettings());

				const networkPriority =
					config.networkPriorities?.screenShare ?
						config.networkPriorities?.screenShare :
						DEFAULT_NETWORK_PRIORITIES.screenShare;

				if (this._useSharingSimulcast)
				{
					let encodings = this._getEncodings(width, height, true);

					// If VP9 is the only available video codec then use SVC.
					const firstVideoCodec = this._mediasoupDevice
						.rtpCapabilities
						.codecs
						.find((c) => c.kind === 'video');

					if (firstVideoCodec.mimeType.toLowerCase() !== 'video/vp9')
					{
						encodings = encodings
							.map((encoding) => ({ ...encoding, dtx: true }));
					}

					const resolutionScalings = getResolutionScalings(encodings);

					/** 
					 * TODO: 
					 * I receive DOMException: 
					 * Failed to execute 'addTransceiver' on 'RTCPeerConnection': 
					 * Attempted to set an unimplemented parameter of RtpParameters.
					encodings.forEach((encoding) =>
					{
						encoding.networkPriority=networkPriority;
					});
					*/
					encodings[0].networkPriority=networkPriority;

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
								source : 'screen',
								width,
								height,
								resolutionScalings
							}
						});
				}
				else
				{
					this._screenSharingProducer = await this._sendTransport.produce({
						track,
						encodings : [ { networkPriority } ],
						appData   :
						{
							source : 'screen',
							width,
							height
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

					this.disableScreenSharing();
				});

				([ track ] = stream.getAudioTracks());

				if (isAudioEnabled && track)
				{

					this._screenSharingAudioProducer = await this._sendTransport.produce(
						{
							track,
							codecOptions :
							{
								opusStereo          : opusStereo,
								opusFec             : opusFec,
								opusDtx             : opusDtx,
								opusMaxPlaybackRate : opusMaxPlaybackRate,
								opusPtime           : opusPtime
							},
							appData :
							{ source: 'mic' }
						});

					store.dispatch(producerActions.addProducer(
						{
							id            : this._screenSharingAudioProducer.id,
							source        : 'mic',
							paused        : this._screenSharingAudioProducer.paused,
							track         : this._screenSharingAudioProducer.track,
							rtpParameters : this._screenSharingAudioProducer.rtpParameters,
							codec         : this._screenSharingAudioProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
						}));

					this._screenSharingAudioProducer.on('transportclose', () =>
					{
						this._screenSharingAudioProducer = null;
					});

					this._screenSharingAudioProducer.on('trackended', () =>
					{
						store.dispatch(requestActions.notify(
							{
								type : 'error',
								text : intl.formatMessage({
									id             : 'devices.screenSharingDisconnected',
									defaultMessage : 'Screen sharing disconnected'
								})
							}));

						// this.disableScreenSharing();
					});

					this._screenSharingAudioProducer.volume = 0;
				}

			}
			else
			{
				if (this._screenSharingProducer)
				{
					({ track } = this._screenSharingProducer);

					await track.applyConstraints(
						{
							...getVideoConstrains(screenSharingResolution, aspectRatio),
							frameRate : screenSharingFrameRate
						}
					);
				}
				if (this._screenSharingAudioProducer)
				{
					({ track } = this._screenSharingAudioProducer);

					await track.applyConstraints(
						{
							sampleRate,
							channelCount,
							autoGainControl,
							echoCancellation,
							noiseSuppression,
							sampleSize
						}
					);
				}
			}
		}
		catch (error)
		{
			logger.error('updateScreenSharing() [error:"%o"]', error);

			store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.screenSharingError',
						defaultMessage : 'An error occurred while accessing your screen'
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

		if (this._screenSharingAudioProducer)
		{
			this._screenSharingAudioProducer.close();

			store.dispatch(
				producerActions.removeProducer(this._screenSharingAudioProducer.id));
		}

		store.dispatch(
			producerActions.removeProducer(this._screenSharingProducer.id));

		try
		{
			await this.sendRequest(
				'closeProducer', { producerId: this._screenSharingProducer.id });

			if (this._screenSharingAudioProducer)
			{
				await this.sendRequest(
					'closeProducer', { producerId: this._screenSharingAudioProducer.id });
			}
		}
		catch (error)
		{
			logger.error('disableScreenSharing() [error:"%o"]', error);
		}

		this._screenSharingProducer = null;
		this._screenSharingAudioProducer = null;

		this._screenSharing.stop();

		store.dispatch(meActions.setScreenShareInProgress(false));
	}

	async disableExtraVideo(id)
	{
		logger.debug('disableExtraVideo()');

		const producer = this._extraVideoProducers.get(id);

		if (!producer)
			return;

		store.dispatch(meActions.setWebcamInProgress(true));

		producer.close();

		store.dispatch(
			producerActions.removeProducer(id));

		try
		{
			await this.sendRequest(
				'closeProducer', { producerId: id });
		}
		catch (error)
		{
			logger.error('disableWebcam() [error:"%o"]', error);
		}

		this._extraVideoProducers.delete(id);

		store.dispatch(meActions.setWebcamInProgress(false));
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
		store.dispatch(settingsActions.setVideoMuted(true));
		store.dispatch(meActions.setWebcamInProgress(false));
	}

	async _setNoiseThreshold(threshold)
	{
		logger.debug('_setNoiseThreshold() [threshold:"%s"]', threshold);

		this._hark?.setThreshold(threshold);

		store.dispatch(
			settingsActions.setNoiseThreshold(threshold));
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
			logger.error('_updateAudioDevices() [error:"%o"]', error);
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
			logger.error('_updateWebcams() [error:"%o"]', error);
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
			logger.error('_getAudioDeviceId() [error:"%o"]', error);
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
			logger.error('_getWebcamDeviceId() [error:"%o"]', error);
		}
	}

	async _updateAudioOutputDevices()
	{
		logger.debug('_updateAudioOutputDevices()');

		// Reset the list.
		this._audioOutputDevices = {};

		try
		{
			logger.debug('_updateAudioOutputDevices() | calling enumerateDevices()');

			const devices = await navigator.mediaDevices.enumerateDevices();

			for (const device of devices)
			{
				if (device.kind !== 'audiooutput')
					continue;

				this._audioOutputDevices[device.deviceId] = device;
			}

			store.dispatch(
				meActions.setAudioOutputDevices(this._audioOutputDevices));
		}
		catch (error)
		{
			logger.error('_updateAudioOutputDevices() [error:"%o"]', error);
		}
	}

	_havePermission(permission)
	{
		const {
			roomPermissions,
			allowWhenRoleMissing
		} = store.getState().room;

		if (!roomPermissions)
			return false;

		const { roles } = store.getState().me;

		const permitted = roles.some((userRoleId) =>
			roomPermissions[permission].some((permissionRole) =>
				userRoleId === permissionRole.id
			)
		);

		if (permitted)
			return true;

		if (!allowWhenRoleMissing)
			return false;

		const peers = Object.values(store.getState().peers);

		// Allow if config is set, and no one is present
		if (allowWhenRoleMissing.includes(permission) &&
			peers.filter(
				(peer) =>
					peer.roles.some(
						(roleId) => roomPermissions[permission].some((permissionRole) =>
							roleId === permissionRole.id
						)
					)
			).length === 0
		)
			return true;

		return false;
	}

	_closeConsumer(consumerId)
	{
		const consumer = this._consumers.get(consumerId);

		this._spotlights.removeVideoConsumer(consumerId);

		if (!consumer)
			return;

		consumer.close();

		if (consumer.hark != null)
			consumer.hark.stop();

		this._consumers.delete(consumerId);

		const { peerId } = consumer.appData;

		store.dispatch(
			consumerActions.removeConsumer(consumerId, peerId));
	}

	_chooseEncodings(simulcastProfiles, size)
	{
		let encodings;

		const sortedMap = new Map([ ...Object.entries(simulcastProfiles) ]
			.sort((a, b) => parseInt(b[0]) - parseInt(a[0])));

		for (const [ key, value ] of sortedMap)
		{
			if (key < size)
			{
				if (encodings === null)
				{
					encodings = value;
				}

				break;
			}

			encodings = value;
		}

		// hack as there is a bug in mediasoup
		if (encodings.length === 1)
		{
			encodings.push({ ...encodings[0] });
		}

		return encodings;
	}

	_getEncodings(width, height, screenSharing = false)
	{
		// If VP9 is the only available video codec then use SVC.
		const firstVideoCodec = this._mediasoupDevice
			.rtpCapabilities
			.codecs
			.find((c) => c.kind === 'video');

		let encodings;

		const size = (width > height ? width : height);

		if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9')
			encodings = screenSharing ? VIDEO_SVC_ENCODINGS : VIDEO_KSVC_ENCODINGS;
		else if (config.simulcastProfiles)
			encodings = this._chooseEncodings(config.simulcastProfiles, size);
		else
			encodings = this._chooseEncodings(VIDEO_SIMULCAST_PROFILES, size);

		return encodings;
	}

	setHideNoVideoParticipants(hideNoVideoParticipants)
	{
		this._spotlights.hideNoVideoParticipants = hideNoVideoParticipants;
	}
}

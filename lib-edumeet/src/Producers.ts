import * as mediasoupClient from 'mediasoup-client';
import Bowser from 'bowser';
import hark from 'hark';
import { getResolutionScalings, getVideoConstraints, stringArrayEqual } from './utils';
import { createScreenShare, ScreenShare } from './ScreenShare';
import { EventEmitterTyped, IEventsDescriptor } from './EventEmitter';
import EdumeetTransport from './Transport';
import EdumeetSignalingAPI from './SignalingAPI';
import { IEdumeetConfig, IEdumeetProducer, IMediasoupProducerScore, VideoResolution } from './types';
import Logger from './Logger';
const logger = new Logger('Producer');


type Devices = {[deviceId: string]: MediaDeviceInfo}
interface ProducerEvents extends IEventsDescriptor {
	producerAdded: (payload: IEdumeetProducer) => void
	producerRemoved: (payload: {id: string}) => void
	producerPaused: (payload: {id: string}) => void
	producerResumed: (payload: {id: string}) => void
	producerScore: (payload: {id: string, scores: IMediasoupProducerScore[] }) => void
	audioDevicesUpdate: (payload: {devices: Devices}) => void
	videoDevicesUpdate: (payload: {devices: Devices}) => void

	// mic
	micVolumeChange: (payload: {volume: number}) => void
	microphoneMuted: (payload: { byModerator: boolean }) => void
	microphoneUnmuted: () => void
	microphoneDisconnected: () => void
	speaking: () => void
	stoppedSpeaking: (payload: {autoMuted: boolean }) => void

	audioInProgress: (state: boolean) => void

	// webcam
	webcamDisconnect: () => void,
	webcamStopped: (payload: { byModerator: boolean }) => void
	videoInProgress: (state: boolean) => void

	// screenshare
	screenSharingDisconnect: () => void,
	screenSharingStopped: (payload: { byModerator: boolean }) => void
	screenSharingInProgress: (state: boolean) => void
}

interface IMicrophoneSettings {
	deviceId: string
	autoGainControl: boolean
	echoCancellation: boolean
	noiseSuppression: boolean
	noiseThreshold: number
	sampleRate: number
	channelCount: number
	sampleSize: number
	opusStereo: boolean
	opusDtx: boolean
	opusFec: boolean
	opusPtime: number
	opusMaxPlaybackRate: number
}
interface IVideoSettings {
	resolution: VideoResolution
	aspectRatio: number
	frameRate: number
}
interface IWebcamSettings extends IVideoSettings {
	deviceId: string
}

export default class EdumeetProducers extends EventEmitterTyped<ProducerEvents> {
	private config: IEdumeetConfig
	private api: EdumeetSignalingAPI
	private transport: EdumeetTransport
	private screenSharing: ScreenShare
	private bowser: Bowser.Parser.Parser
	private _harkStream?: MediaStream
	private _hark?: hark.Harker
	private _audioDevices: Devices = {}
	private _videoDevices: Devices = {}

	private micProducer?: mediasoupClient.types.Producer
	private screenshareProducer?: mediasoupClient.types.Producer
	private screenshareAudioProducer?: mediasoupClient.types.Producer
	private webcamProducer?: mediasoupClient.types.Producer
	private extraVideoProducers: Map<string, mediasoupClient.types.Producer> = new Map()

	public isVoiceActivationEnabled = false
	private _isAutoMuted = false
	private _audioDeviceId?: string
	private _webcamDeviceId?: string

	private microphoneSettings: IMicrophoneSettings = {
		deviceId: '',
		autoGainControl: false,
		echoCancellation: true,
		noiseSuppression: true,
		noiseThreshold: -50,
		sampleRate: 4800,
		channelCount: 1,
		sampleSize: 16,
		opusStereo: false,
		opusDtx: true,
		opusFec: true,
		opusPtime: 20,
		opusMaxPlaybackRate: 48000
	}
	private webcamSettings: IWebcamSettings = {
		deviceId: '',
		resolution: 'medium',
		frameRate: 15,
		aspectRatio: 1.777
	}
	private screenshareSetttings: IVideoSettings = {
		resolution: 'veryhigh',
		frameRate: 5,
		aspectRatio: 1.777
	}

	constructor(props: {
		api: EdumeetSignalingAPI,
		transport: EdumeetTransport,
		bowser: Bowser.Parser.Parser,
		config: IEdumeetConfig
	}) {
		super();
		this.api = props.api;
		this.bowser = props.bowser;
		this.screenSharing = createScreenShare(this.bowser);
		this.transport = props.transport;
		this.config = props.config;

		this.api.on('disconnect', (reason: string) => {
			this.stopProducer(this.screenshareProducer);
			this.stopProducer(this.micProducer);
			this.stopProducer(this.webcamProducer);
			this.extraVideoProducers.forEach((producer) => this.stopProducer(producer));
		});
		this.api.on('notification:producerScore', ({producerId, score}) => {
			this.emit('producerScore', { id: producerId, scores: score })
		})
		this.api.on('notification:moderator:mute', async () => {
			this.muteMicrophone({ triggeredByModerator: true })
		})
		this.api.on('notification:moderator:stopVideo', async () => {
			this.stopWebcam({ triggeredByModerator: true })
		})
		this.api.on('notification:moderator:stopScreenSharing', async () => {
			this.stopScreenSharing({ triggeredByModerator: true })
		})

		const defaults = this.config.defaults
		Object.assign(this.microphoneSettings, defaults.audio)
		Object.assign(this.webcamSettings, defaults.video)
		Object.assign(this.screenshareSetttings, defaults.screenshare)

	}

	canProduce(type: 'audio'|'video') {
		if (!this.transport.mediasoupDevice.loaded) {
			throw new Error('not connected yet, call room.connect() first');
		}
		if (!this.transport.send) {
			return false;
		}

		return this.transport.mediasoupDevice.canProduce(type);
	}

	private async createProducer(track: MediaStreamTrack, options: {
		appData: any,
		codecOptions?: mediasoupClient.types.ProducerCodecOptions,
		simulcast?: boolean,
		deviceLabel?: string
	}) {
		if (!this.transport.send) throw new Error('cannot produce');

		try {
			// simulcast
			let resolutionScalings: number[]|undefined;
			const simulcastOptions: mediasoupClient.types.ProducerOptions = {};
			let encodings: mediasoupClient.types.RtpEncodingParameters[] = []
			
			if (options.simulcast) {
				const { width, height } = track.getSettings()
				if(width && height) {
					const isScreenshare = options.appData.source == 'screen'
					encodings = this.transport.getSimulcastEncodings(width, height, isScreenshare) || [];
	
					resolutionScalings = getResolutionScalings(encodings);
					simulcastOptions.codecOptions = {
						videoGoogleStartBitrate : 1000
					};	
					options.appData.width = width
					options.appData.height = height
				}
			}
			
			const { networkPriorities } = this.config
			const networkPriorityMapping: any = {
				'mic': networkPriorities.audio,
				'webcam': networkPriorities.mainVideo,
				'extravideo': networkPriorities.additionalVideos,
				'screen': networkPriorities.screenShare
			}
			const networkPriority = options.appData.source ? networkPriorityMapping[options.appData.source] : ''
			if(encodings.length) {
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
				encodings[0].networkPriority = networkPriority
			} else {
				encodings = [
					{
					networkPriority
					}
				]
			}

			const producer = await this.transport.send.produce({
				track,
				appData : {
					...options.appData,
					resolutionScalings,
				},

				codecOptions : options.codecOptions,
				encodings,
				...simulcastOptions
			});

			this.emit('producerAdded', {
				id            : producer.id,
				deviceLabel   : options.deviceLabel,
				source        : options.appData.source,
				paused        : producer.paused,
				track         : producer.track,
				rtpParameters : producer.rtpParameters,
				codec         : producer.rtpParameters.codecs[0].mimeType.split('/')[1]
			});

			producer.on('transportclose', () => {
				this.stopProducer(producer, true);
			});

			return producer;
		} catch (err) {
			if (track) track.stop();
			throw err;
		}
	}
	private async stopProducer(producer: mediasoupClient.types.Producer|undefined, deleteOnly = false) {
		if (!producer) return;
		switch (producer.id) {
			case this.micProducer?.id:
				delete this.micProducer;
				break;
			case this.webcamProducer?.id:
				delete this.webcamProducer;
				break;
			case this.screenshareProducer?.id:
				delete this.screenshareProducer;
				break;
			default:
				if (this.extraVideoProducers.has(producer.id)) {
					this.extraVideoProducers.delete(producer.id);
				} else {
					throw new Error('we don\'t recognize this producer. can\'t stop it');
				}
		}

		if (deleteOnly) return true;

		producer.close();
		this.emit('producerRemoved', { id: producer.id });
		try {
			await this.api.closeProducer({ producerId: producer.id });
		} catch (error) {
			logger.error('stopProducer() [error:"%o"]', error);
		}
	}
	private async pauseProducer(producer: mediasoupClient.types.Producer) {
		producer.pause();
		await this.api.pauseProducer({ producerId: producer.id });
		this.emit('producerPaused', { id: producer.id });
	}
	private async resumeProducer(producer: mediasoupClient.types.Producer) {
		producer.resume();
		await this.api.resumeProducer({ producerId: producer.id });
		this.emit('producerResumed', { id: producer.id });
	}

	async updateDevices() {
		const audioDevices: {[deviceId: string]: MediaDeviceInfo} = {};
		const videoDevices: {[deviceId: string]: MediaDeviceInfo} = {};
		const devices = await navigator.mediaDevices.enumerateDevices();

		for (const device of devices) {
			switch (device.kind) {
				case 'audioinput':
					audioDevices[device.deviceId] = device;
					break;
				case 'videoinput':
					videoDevices[device.deviceId] = device;
					break;
				case 'audiooutput':
				// ignore, handles by Consumers
					break;
			}
		}
		if (!stringArrayEqual(Object.keys(audioDevices), Object.keys(this._audioDevices))) {
			this.emit('audioDevicesUpdate', {
				devices : audioDevices
			});
		}
		if (!stringArrayEqual(Object.keys(videoDevices), Object.keys(this._videoDevices))) {
			this.emit('videoDevicesUpdate', {
				devices : videoDevices
			});
		}
		this._audioDevices = audioDevices;
		this._videoDevices = videoDevices;
		/* eslint-disable no-console */
		console.log('device update', this);
	}

	/*
	* Microphone
	*/
	getSelectedAudioDeviceId() {
		return this._audioDeviceId;
	}
	async getAvailableAudioDeviceId(preferredDeviceId?: string) {
		if (preferredDeviceId && this._audioDevices[preferredDeviceId]) {
			return preferredDeviceId;
		} else {
			// pick first one
			const devices = Object.values(this._audioDevices);

			if(!devices.length) {
				throw new Error(`no audio input device available`);
			}
			return devices[0].deviceId;
		}
	}
	isMicrophoneStarted() {
		return Boolean(this.micProducer && this.micProducer.track);
	}
	isMicrophoneActive() {
		return Boolean(this.micProducer && !this.micProducer.paused);
	}
	async updateMicrophoneSettings(next: Partial<IMicrophoneSettings>) {
		if(!this.isMicrophoneStarted()) {
			// only store settings
			Object.assign(this.microphoneSettings, next)
			return
		}

		let changed = false
		let shouldRestart = false
		const prev = this.microphoneSettings
		if(next.deviceId) {
			if (!this._audioDevices[next.deviceId]) throw new Error(`audio input device '${next.deviceId}' not found`);
			if(prev.deviceId !== next.deviceId) {
				changed = true
				shouldRestart = true
			}
		}
		if(typeof next.autoGainControl !== 'undefined' && next.autoGainControl !== prev.autoGainControl) changed = true
		if(typeof next.echoCancellation !== 'undefined' && next.echoCancellation !== prev.echoCancellation) changed = true
		if(typeof next.noiseSuppression !== 'undefined' && next.noiseSuppression !== prev.noiseSuppression) changed = true

		// Only Firefox supports applyConstraints to audio tracks
		// See:
		// https://bugs.chromium.org/p/chromium/issues/detail?id=796964
		if(!this.bowser.satisfies({ firefox: '>0' })) shouldRestart = true

		if(changed)  {
			Object.assign(this.microphoneSettings, next)
			if(shouldRestart) {
				await this.startMicrophone()
			} else {
				await this.applyMicrophoneSettings()
			}
		}
		if(typeof next.noiseThreshold !== 'undefined' && next.noiseThreshold !== prev.noiseThreshold) {
			this._hark?.setThreshold(next.noiseThreshold);
		}
	}
	private async applyMicrophoneSettings() {
		const track = this.micProducer?.track;
		if(!track) return
		try {
			this.emit('audioInProgress', true)

			const {
				autoGainControl,
				echoCancellation,
				noiseSuppression,
				sampleRate,
				sampleSize,
				channelCount
			} = this.microphoneSettings
	
			await track.applyConstraints({
				sampleRate,
				channelCount,
				autoGainControl,
				echoCancellation,
				noiseSuppression,
				sampleSize
			});
	
			const harkTrack = this._harkStream?.getAudioTracks()[0];
			if (harkTrack) {
				await harkTrack.applyConstraints({
					sampleRate,
					channelCount,
					autoGainControl,
					echoCancellation,
					noiseSuppression,
					sampleSize
				});
			}
			this.emit('audioInProgress', false)
		} catch(err) {
			this.emit('audioInProgress', false)
			throw err
		}
	}
	async startMicrophone() {
		logger.debug(
			'startMicrophone()'
		);

		if (!this.canProduce('audio') || !this.transport.send) throw new Error('cannot produce audio');


		this.emit('audioInProgress', true)
		try {
			let {
				deviceId,
				autoGainControl,
				echoCancellation,
				noiseSuppression,
				sampleSize,
				sampleRate,
				channelCount,
				opusStereo,
				opusDtx,
				opusFec,
				opusPtime,
				opusMaxPlaybackRate
			} = this.microphoneSettings

			if(!deviceId) {
				deviceId = await this.getAvailableAudioDeviceId()
				this.microphoneSettings.deviceId = deviceId
			}
			
			if (!this._audioDevices[deviceId]) throw new Error(`audio input device '${deviceId}' not found`);
	

			// already active?
			let muted = false
			if (this.micProducer) {
				// restart 
				muted = this.micProducer.paused;
				await this.stopMicrophone(true);
			}
	
			const stream = await navigator.mediaDevices.getUserMedia({
				audio : {
					deviceId         : { ideal: deviceId },
					sampleRate,
					channelCount,
					autoGainControl  : autoGainControl,
					echoCancellation : echoCancellation,
					noiseSuppression : noiseSuppression,
					sampleSize,
				}
			});
			const track = stream.getAudioTracks()[0]
			this.micProducer = await this.createProducer(track, {

				codecOptions :
					{
						opusStereo,
						opusDtx,
						opusFec,
						opusPtime,
						opusMaxPlaybackRate
					},
				appData : { source: 'mic' }
			});
			this.micProducer.on('trackended', () => {
				this.emit('microphoneDisconnected');
				this.stopMicrophone(true);
			});
	
			this.emit('microphoneUnmuted');
	
			this._audioDeviceId = this.micProducer.track?.getSettings().deviceId;
			this.connectLocalHark();
			if(muted) {
				this.muteMicrophone()
			} else {
				this.unmuteMicrophone()
			}
			this.emit('audioInProgress', false)
		} catch(err) {
			this.emit('audioInProgress', false)
			throw err
		}
		
	}
	connectLocalHark() {
		const track = this.micProducer?.track;

		if (!track) throw new Error('no track found');
		const { noiseThreshold } = this.microphoneSettings

		// @ts-ignore : TODO: what is this for?
		this.micProducer.volume = 0;

		this.disconnectLocalHark();
		this._harkStream = new MediaStream();
		const newTrack = track.clone();

		this._harkStream.addTrack(newTrack);

		newTrack.enabled = true;
		this._hark = hark(this._harkStream,
			{
				play      : false,
				interval  : 100,
				threshold : noiseThreshold,
				history   : 100
			});

		let lastVolume = -100;

		this._hark.on('volume_change', (volume) => {
			volume = Math.round(volume);

			// Update only if there is a bigger diff 
			if (this.micProducer && Math.abs(volume - lastVolume) > 0.5) {
				// Decay calculation: keep in mind that volume range is -100 ... 0 (dB)
				// This makes decay volume fast if difference to last saved value is big
				// and slow for small changes. This prevents flickering volume indicator
				// at low levels
				if (volume < lastVolume) {
					volume = Math.round(
							lastVolume -
							Math.pow(
								(volume - lastVolume) /
								(100 + lastVolume)
								, 2
							) * 10);
				}

				lastVolume = volume;
				this.emit('micVolumeChange', {
					volume
				});
			}
		});

		this._hark.on('speaking', () => {
			if (!this.micProducer) return;

			this._isAutoMuted = false;
			this.emit('speaking');
			const shouldAutoResume = (this.isVoiceActivationEnabled || this._isAutoMuted);

			if (shouldAutoResume && this.micProducer.paused) {
				this.micProducer.resume();
			}
		});

		this._hark.on('stopped_speaking', () => {
			if (!this.micProducer) return;
			if (this.isVoiceActivationEnabled && !this.micProducer.paused) {
				this.micProducer.pause();
				this._isAutoMuted = true;
				this.emit('stoppedSpeaking', { autoMuted: true });
			} else {
				this._isAutoMuted = false;
				this.emit('stoppedSpeaking', { autoMuted: false });
			}
		});
	}
	async stopMicrophone(silent: boolean = false) {

		logger.debug('stopMicrophone()');
		if(!silent) this.emit('audioInProgress', true)
		try {
			this.disconnectLocalHark();
			await this.stopProducer(this.micProducer);
			if(!silent) this.emit('audioInProgress', false)
		} catch(err) {
			if(!silent) this.emit('audioInProgress', false)
			throw err
		}
	}

	private disconnectLocalHark() {
		if (!this._harkStream && !this._hark) return;
		logger.debug('disconnectLocalHark()');

		const harkTrack = this._harkStream?.getAudioTracks()[0];

		if (harkTrack) {
			harkTrack.stop();
			delete this._harkStream;
		}
		if (this._hark) {
			this._hark.stop();
		}
	}
	async muteMicrophone(flags: {triggeredByModerator: boolean} = { triggeredByModerator: false }) {
		if (!this.micProducer) {
			throw new Error('can\'t mute micrphone before initialized');
		}
		if (!this.isMicrophoneActive()) {
			// already muted
			return;
		}
		await this.pauseProducer(this.micProducer);
		this.emit('microphoneMuted', { byModerator: flags.triggeredByModerator });
	}
	async unmuteMicrophone() {
		if (!this.micProducer) {
			throw new Error('can\'t unmute micrphone before initialized');
		}
		if (this.isMicrophoneActive()) {
			// not muted
			return;
		}
		await this.resumeProducer(this.micProducer);
		this.emit('microphoneUnmuted');
	}

	/*
	* Webcam 
	*/
	isWebcamActive() {
		return Boolean(this.webcamProducer);
	}
	async getAvailableVideoDeviceId(preferredDeviceId?: string) {
		if (preferredDeviceId && this._videoDevices[preferredDeviceId]) {
			return preferredDeviceId;
		} else {
			// pick first one
			const devices = Object.values(this._videoDevices);

			return devices?.[0]?.deviceId;
		}
	}
	
	async updateWebcamSettings(next: Partial<IWebcamSettings>) {
		let changed = false
		let restart = false
		const prev = this.webcamSettings
		if(next.deviceId) {
			if (!this._videoDevices[next.deviceId]) throw new Error(`video input device '${next.deviceId}' not found`);
			if(prev.deviceId !== next.deviceId) {
				changed = true
				restart = true
			}
		}
		if(typeof next.resolution !== 'undefined' && next.resolution !== prev.resolution) changed = true
		if(typeof next.frameRate !== 'undefined' && next.frameRate !== prev.frameRate) changed = true
		if(typeof next.aspectRatio !== 'undefined' && next.aspectRatio !== prev.aspectRatio) changed = true

		if(changed) {
			Object.assign(this.webcamSettings, next)
			if(restart) {
				await this.startWebcam()
			} else {
				const {
					resolution,
					aspectRatio,
					frameRate
				} = this.webcamSettings

				try {
					this.emit('videoInProgress', true)
					await this.webcamProducer?.track?.applyConstraints({
						...getVideoConstraints(resolution, aspectRatio),
						frameRate
					})
					this.emit('videoInProgress', false)
				} catch(err) {
					this.emit('videoInProgress', false)
					throw err
				}
			}
		}
	}
	async startWebcam() {
		if (!this.canProduce('video') || !this.transport.send)
			throw new Error('cannot produce video');

		let {
			deviceId,
			aspectRatio,
			resolution,
			frameRate
		}  = this.webcamSettings

		try {
			this.emit('videoInProgress', true)
	
			if(!deviceId) {
				deviceId = await this.getAvailableVideoDeviceId()
				this.webcamSettings.deviceId = deviceId
			}

			if (!this._videoDevices[deviceId]) throw new Error(`video input device '${deviceId}' not found`);


			// already active?
			if (this.webcamProducer) {
				// restart
				await this.stopWebcam({ silent: true });
			}
	
			const stream = await navigator.mediaDevices.getUserMedia({
				video : {
					deviceId : { ideal: deviceId },
					...getVideoConstraints(resolution, aspectRatio),
					frameRate
				}
			});
	
			const track = stream.getVideoTracks()[0];
			const { deviceId: trackDeviceId, width, height } = track.getSettings();
	
			logger.debug('getUserMedia track settings:', track.getSettings());
			this._webcamDeviceId = trackDeviceId;
	
			this.webcamProducer = await this.createProducer(track, {
				appData : {
					source : 'webcam',
					width,
					height
				}
			});
	
			this.webcamProducer.on('trackended', () => {
				this.emit('webcamDisconnect');
				this.stopWebcam({ silent: true })
			});
			this.emit('videoInProgress', false)

		} catch(err) {
			this.emit('videoInProgress', false)
			throw err
		}
	}
	async stopWebcam(flags: {silent?: boolean, triggeredByModerator?: boolean} = {}) {
		logger.debug('stopWebcam()');
		if(!flags.silent) this.emit('videoInProgress', true)
		try {
			await this.stopProducer(this.webcamProducer);
			if(!flags.silent) this.emit('videoInProgress', false)
			this.emit('webcamStopped', { byModerator: !!flags.triggeredByModerator });
		} catch(err) {
			if(!flags.silent) this.emit('videoInProgress', false)
			throw err
		}
	}

	/*
	* Screenshare
	*/
	isScreenShareAvailable() {
		return this.canProduce('video') && this.screenSharing.isScreenShareAvailable();
	}
	isScreenShareActive() {
		return Boolean(this.screenshareProducer);
	}
	async updateScreenShareSettings(next: Partial<IVideoSettings>) {
		let changed = false
		let restart = false
		const prev = this.screenshareSetttings
		if(typeof next.resolution !== 'undefined' && next.resolution !== prev.resolution) changed = true
		if(typeof next.frameRate !== 'undefined' && next.frameRate !== prev.frameRate) changed = true
		if(typeof next.aspectRatio !== 'undefined' && next.aspectRatio !== prev.aspectRatio) changed = true

		if(changed) {
			Object.assign(this.screenshareSetttings, next)
			if(restart) {
				await this.startScreenSharing()
			} else {
				const {
					resolution,
					aspectRatio,
					frameRate
				} = this.screenshareSetttings

				const {
					autoGainControl,
					echoCancellation,
					noiseSuppression,
					sampleSize,
					sampleRate,
					channelCount,
	
				} = this.microphoneSettings

				try {
					this.emit('screenSharingInProgress', true)
					await this.screenshareProducer?.track?.applyConstraints({
						...getVideoConstraints(resolution, aspectRatio),
						frameRate
					})
					if(this.screenshareAudioProducer) {
						const track = this.screenshareAudioProducer.track

						await track?.applyConstraints({
							sampleRate,
							channelCount,
							autoGainControl,
							echoCancellation,
							noiseSuppression,
							sampleSize
						})
					}
					this.emit('screenSharingInProgress', false)
				} catch(err) {
					this.emit('screenSharingInProgress', false)
					throw err
				}
			}
		}
	}

	async startScreenSharing() {
		const available = this.screenSharing.isScreenShareAvailable();

		if (!available || !this.transport.send) {
			throw new Error('screen sharing not available');
		}
		try {
			this.emit('screenSharingInProgress', true)
			// already active?
			if (this.screenshareProducer) {
				// restart
				await this.stopScreenSharing({ silent: true });
			}
			const {
				resolution,
				aspectRatio,
				frameRate
			} = this.screenshareSetttings

			const {
				autoGainControl,
				echoCancellation,
				noiseSuppression,
				sampleSize,
				sampleRate,
				channelCount,

				opusStereo,
				opusDtx,
				opusFec,
				opusPtime,
				opusMaxPlaybackRate
			} = this.microphoneSettings

			const audioOptions = this.screenSharing.isAudioEnabled() ? {
				sampleRate,
				channelCount,
				autoGainControl,
				echoCancellation,
				noiseSuppression,
				sampleSize,
				
			} : {}

			const stream = await this.screenSharing.start({
				...getVideoConstraints(resolution, aspectRatio),
				frameRate : frameRate,
				...audioOptions

			});

			if (!stream) {
				throw new Error('could not get screensharing stream');
			}
			const videoTrack = stream.getVideoTracks()[0]
			this.screenshareProducer = await this.createProducer(videoTrack, {
				appData : {
					source : 'screen'
				},
				deviceLabel : 'screen'
			});
			this.screenshareProducer.on('trackended', () => {
				this.emit('screenSharingDisconnect');
				this.stopScreenSharing();
			});

			const audioTrack = stream.getAudioTracks()[0]
			if(this.screenSharing.isAudioEnabled() && audioTrack) {

				this.screenshareAudioProducer = await this.createProducer(audioTrack, {
					codecOptions :
						{
							opusStereo,
							opusDtx,
							opusFec,
							opusPtime,
							opusMaxPlaybackRate
						},
					appData : { source: 'mic' }
				});
				this.screenshareAudioProducer.on('trackended', () => {
					this.emit('screenSharingDisconnect');
					this.stopScreenSharing();
				})

				// @ts-ignore
				this._screenSharingAudioProducer.volume = 0;
			}

			this.emit('screenSharingInProgress', false)
		} catch(err) {
			this.emit('screenSharingInProgress', false)
			throw err
		}

	}
	async stopScreenSharing(flags: {silent?: boolean, triggeredByModerator?: boolean} = {}) {
		logger.debug('stopScreenSharing()');
		try {
			if(!flags.silent) this.emit('screenSharingInProgress', true)
			this.screenSharing.stop();
			await this.stopProducer(this.screenshareProducer);	
			await this.stopProducer(this.screenshareAudioProducer);	
			this.emit('screenSharingStopped', { byModerator: !!flags.triggeredByModerator })
			if(!flags.silent) this.emit('screenSharingInProgress', false)
		} catch(err) {
			if(!flags.silent) this.emit('screenSharingInProgress', false)
			throw err
		}
	}

	/*
	* Extra Video 
	*/
	async startExtraVideo({
		deviceId,
		resolution,
		aspectRatio,
		frameRate
	}: {
							deviceId: string
							resolution: string,
							aspectRatio: number,
							frameRate: number
						}) {
		if (!this.canProduce('video') || !this.transport.send)
			throw new Error('cannot produce video');

		const device = this._videoDevices[deviceId];

		if (!device) throw new Error(`video input device '${deviceId}' not found`);

		const stream = await navigator.mediaDevices.getUserMedia({
			video : {
				deviceId : { ideal: deviceId },
				...getVideoConstraints(resolution, aspectRatio),
				frameRate
			}
		});

		const track = stream.getVideoTracks()[0];

		let exists = false;

		this.extraVideoProducers.forEach((producer) => {
			if (producer.track?.label == track.label) {
				exists = true;
			}
		});
		if (exists) {
			track.stop();
			throw new Error('extraVideo duplicated');
		}

		const { deviceId: trackDeviceId, width, height } = track.getSettings();

		logger.debug('getUserMedia track settings:', track.getSettings());
		this._webcamDeviceId = trackDeviceId;

		const producer = await this.createProducer(track, {
			appData : {
				source : 'extravideo',
				width,
				height
			},
			deviceLabel : device.label
		});

		this.extraVideoProducers.set(producer.id, producer);

		producer.on('trackended', () => {
			this.emit('webcamDisconnect');
			this.stopExtraVideo(producer.id);
		});
	}
	async stopExtraVideo(producerId: string) {
		logger.debug('stopExtraVideo()');
		const producer = this.extraVideoProducers.get(producerId);

		await this.stopProducer(producer);
	}

	/*
	* Mixed
	*/
	async setMaxSendingSpatialLayer(spatialLayer: number) {
		logger.debug('setMaxSendingSpatialLayer() [spatialLayer:"%s"]', spatialLayer);
		try {
			if (this.webcamProducer) {
				await this.webcamProducer.setMaxSpatialLayer(spatialLayer);
			}
			if (this.screenshareProducer) {
				await this.screenshareProducer.setMaxSpatialLayer(spatialLayer);
			}
		} catch (error) {
			logger.error('setMaxSendingSpatialLayer() [error:"%o"]', error);
		}
	}
}
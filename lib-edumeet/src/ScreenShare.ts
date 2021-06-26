import isElectron from 'is-electron';
import bowser from 'bowser';

interface IScreenShareOptions {
	width?: number
	height?: number
	aspectRatio?: number
	frameRate?: number
}
interface IScreenShareWithAudioOptions extends IScreenShareOptions {
	autoGainControl: boolean
	echoCancellation: boolean
	noiseSuppression: boolean
	sampleRate: number
	channelCount: number
	sampleSize: number
}
export class ScreenShare {
	protected _stream: MediaStream|null = null
	isScreenShareAvailable() {
		return false;
	}
	isAudioEnabled() {
		return false;
	}
	async start(options: IScreenShareOptions = {}): Promise<MediaStream|null> {
		throw new Error('Screenshare is not available');
	}

	async stop() {
		if (!(this._stream instanceof MediaStream)) {
			return;
		}

		this._stream.getTracks().forEach((track) => track.stop());
		this._stream = null;
	}
}

export class ElectronScreenShare extends ScreenShare {
	isScreenShareAvailable() {
		return true;
	}
	async start(ooptions: IScreenShareOptions = {}) {
		const electron = window.require('electron');
		const sources = await electron.desktopCapturer.getSources({ types: [ 'window', 'screen' ] });

		for (const source of sources) {
			// Currently only getting whole screen
			if (source.name === 'Entire Screen') {

				const constraints: MediaStreamConstraints = {
					audio : true,
					video :
					{
						// @ts-ignore : https://stackoverflow.com/a/65710811
						mandatory :
						{
							chromeMediaSource   : 'desktop',
							chromeMediaSourceId : source.id
						}
					}
				};

				this._stream = await navigator.mediaDevices.getUserMedia(constraints);

				return this._stream;
			}
		}

		return null;
	}
}

export class DisplayMediaScreenShare extends ScreenShare {
	isScreenShareAvailable() {
		return true;
	}

	async start(options: IScreenShareOptions = {}) {
		const constraints = this._toConstraints(options);

		// @ts-ignore : https://github.com/microsoft/TypeScript/issues/33232
		this._stream = await navigator.mediaDevices.getDisplayMedia(constraints);

		return this._stream;
	}

	protected _toConstraints(options: IScreenShareOptions): MediaStreamConstraints {
		const constraints: any = {
			video : {},
			audio : true
		};

		if (options.width && isFinite(options.width)) {
			constraints.video.width = options.width;
		}
		if (options.height && isFinite(options.height)) {
			constraints.video.height = options.height;
		}
		if (options.frameRate && isFinite(options.frameRate)) {
			constraints.video.frameRate = options.frameRate;
		}

		return constraints;
	}
}


class DisplayMediaScreenShareWithAudio extends DisplayMediaScreenShare {

	isAudioEnabled() {
		return true;
	}

	protected _toConstraints(options: IScreenShareWithAudioOptions): MediaStreamConstraints {
		const constraints = super._toConstraints(options)

		constraints.audio = {
			sampleRate       : options.sampleRate,
			channelCount     : options.channelCount,
			autoGainControl  : options.autoGainControl,
			echoCancellation : options.echoCancellation,
			noiseSuppression : options.noiseSuppression,
			sampleSize       : options.sampleSize
		}
		return constraints;
	}
}


export class FirefoxScreenShare extends ScreenShare {
	isScreenShareAvailable() {
		return true;
	}
	async start(options: IScreenShareOptions = {}) {
		const constraints = this._toConstraints(options);

		this._stream = await navigator.mediaDevices.getUserMedia(constraints);

		return this._stream;
	}

	protected _toConstraints(options: IScreenShareOptions): MediaStreamConstraints {
		const constraints = {
			video : {
				mediaSource : 'window'
			} as any,
			audio : false
		};

		if (options.width && isFinite(options.width)) {
			constraints.video.width = {
				min : options.width,
				max : options.width
			};
		}
		if (options.height && isFinite(options.height)) {
			constraints.video.height = {
				min : options.height,
				max : options.height
			};
		}
		if (options.frameRate && isFinite(options.frameRate)) {
			constraints.video.frameRate = {
				min : options.frameRate,
				max : options.frameRate
			};
		}

		return constraints;
	}
}

export function createScreenShare(bowser: bowser.Parser.Parser): ScreenShare {
	/** 
	* Check if window.require function exits
	* because electron default is "nodeIntegration: false"
	* and this case window.require is not a function.
	* It caused issue with Rocket Chat electron client.
	* 
	* TODO: do it more inteligently.
	*/
	if (isElectron() && typeof window.require === 'function')
		return new ElectronScreenShare();

	if (bowser.getPlatformType(true) !== 'desktop')
		return new ScreenShare(); // = no screenshare enabled

	let flag: string;

	if (bowser.satisfies({ chrome: '>=0', chromium: '>=0' }))
		flag = 'chrome';
	else if (bowser.satisfies({ firefox: '>=0' }))
		flag = 'firefox';
	else if (bowser.satisfies({ safari: '>=0' }))
		flag = 'safari';
	else if (bowser.satisfies({ opera: '>=0' }))
		flag = 'opera';
	else if (bowser.satisfies({ 'microsoft edge': '>=0' }))
		flag = 'edge';
	else
		flag = 'unknown';

	switch (flag) {
		case 'firefox':
		{
			if (parseFloat(bowser.getBrowserVersion()) < 66.0)
				return new FirefoxScreenShare();
			else
				return new DisplayMediaScreenShare();
		}
		case 'safari':
		{
			if (parseFloat(bowser.getBrowserVersion()) >= 13.0)
				return new DisplayMediaScreenShare();
			else
				return new ScreenShare();
		}
		case 'chrome':
		case 'chromium':
		case 'edge':
		{
			return new DisplayMediaScreenShareWithAudio();
		}
		default:
		{
			return new ScreenShare();
		}
	}
}
import isElectron from 'is-electron';

let electron = null;

/** 
 * Check if window.require function exits
 * because electron default is "nodeIntegration: false"
 * and this case window.require is not a function.
 * It caused issue with Rocket Chat electron client.
 * 
 * TODO: do it more inteligently.
 */
if (isElectron() && typeof window.require === 'function')
	electron = window.require('electron');

class ElectronScreenShare
{
	constructor()
	{
		this._stream = null;
	}

	start()
	{
		return Promise.resolve()
			.then(() =>
			{
				return electron.desktopCapturer.getSources({ types: [ 'window', 'screen' ] });
			})
			.then((sources) =>
			{
				for (const source of sources)
				{
					// Currently only getting whole screen
					if (source.name === 'Entire Screen')
					{
						return navigator.mediaDevices.getUserMedia({
							audio : true,
							video :
							{
								mandatory :
								{
									chromeMediaSource   : 'desktop',
									chromeMediaSourceId : source.id
								}
							}
						});
					}
				}
			})
			.then((stream) =>
			{
				this._stream = stream;

				return stream;
			});
	}

	stop()
	{
		if (this._stream instanceof MediaStream === false)
		{
			return;
		}

		this._stream.getTracks().forEach((track) => track.stop());
		this._stream = null;
	}

	isScreenShareAvailable()
	{
		return true;
	}
}

class DisplayMediaScreenShare
{
	constructor()
	{
		this._stream = null;
	}

	start(options = {})
	{
		const constraints = this._toConstraints(options);

		return navigator.mediaDevices.getDisplayMedia(constraints)
			.then((stream) =>
			{
				this._stream = stream;

				return Promise.resolve(stream);
			});
	}

	stop()
	{
		if (this._stream instanceof MediaStream === false)
		{
			return;
		}

		this._stream.getTracks().forEach((track) => track.stop());
		this._stream = null;
	}

	isScreenShareAvailable()
	{
		return true;
	}

	_toConstraints(options)
	{
		const constraints = {
			video : {},
			audio : true
		};

		if (isFinite(options.width))
		{
			constraints.video.width = options.width;
		}
		if (isFinite(options.height))
		{
			constraints.video.height = options.height;
		}
		if (isFinite(options.frameRate))
		{
			constraints.video.frameRate = options.frameRate;
		}

		return constraints;
	}
}

class FirefoxScreenShare
{
	constructor()
	{
		this._stream = null;
	}

	start(options = {})
	{
		const constraints = this._toConstraints(options);

		return navigator.mediaDevices.getUserMedia(constraints)
			.then((stream) =>
			{
				this._stream = stream;

				return Promise.resolve(stream);
			});
	}

	stop()
	{
		if (this._stream instanceof MediaStream === false)
		{
			return;
		}

		this._stream.getTracks().forEach((track) => track.stop());
		this._stream = null;
	}

	isScreenShareAvailable()
	{
		return true;
	}

	_toConstraints(options)
	{
		const constraints = {
			video : {
				mediaSource : 'window'
			},
			audio : false
		};

		if ('mediaSource' in options)
		{
			constraints.video.mediaSource = options.mediaSource;
		}
		if (isFinite(options.width))
		{
			constraints.video.width = {
				min : options.width,
				max : options.width
			};
		}
		if (isFinite(options.height))
		{
			constraints.video.height = {
				min : options.height,
				max : options.height
			};
		}
		if (isFinite(options.frameRate))
		{
			constraints.video.frameRate = {
				min : options.frameRate,
				max : options.frameRate
			};
		}

		return constraints;
	}
}

class DefaultScreenShare
{
	isScreenShareAvailable()
	{
		return false;
	}
}

export default class ScreenShare
{
	static create(device)
	{
		if (electron)
			return new ElectronScreenShare();
		else if (device.platform !== 'desktop')
			return new DefaultScreenShare();
		else
		{
			switch (device.flag)
			{
				case 'firefox':
				{
					if (device.version < 66.0)
						return new FirefoxScreenShare();
					else
						return new DisplayMediaScreenShare();
				}
				case 'safari':
				{
					if (device.version >= 13.0)
						return new DisplayMediaScreenShare();
					else
						return new DefaultScreenShare();
				}
				case 'chrome':
				case 'chromium':
				case 'opera':
				case 'edge':
				{
					return new DisplayMediaScreenShare();
				}
				default:
				{
					return new DefaultScreenShare();
				}
			}
		}
	}
}

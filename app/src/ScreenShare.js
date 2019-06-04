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

	_toConstraints()
	{
		const constraints = {
			video : true
		};

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
		switch (device.flag)
		{
			case 'firefox':
			{
				if (device.version < 66.0)
					return new FirefoxScreenShare();
				else
					return new DisplayMediaScreenShare();
			}
			case 'chrome':
			{
				return new DisplayMediaScreenShare();
			}
			case 'msedge':
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

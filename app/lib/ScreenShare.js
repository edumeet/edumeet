import { getBrowserType } from './utils';

class ChromeScreenShare
{
	constructor()
	{
		this._stream = null;
	}

	start(options = { })
	{
		const state = this;

		return new Promise((resolve, reject) =>
		{
			window.addEventListener('message', _onExtensionMessage, false);
			window.postMessage({ type: 'getStreamId' }, '*');

			function _onExtensionMessage({ data })
			{
				if (data.type !== 'gotStreamId')
				{
					return;
				}

				const constraints = state._toConstraints(options, data.streamId);

				navigator.mediaDevices.getUserMedia(constraints)
					.then((stream) =>
					{
						window.removeEventListener('message', _onExtensionMessage);

						state._stream = stream;
						resolve(stream);
					})
					.catch((err) =>
					{
						window.removeEventListener('message', _onExtensionMessage);

						reject(err);
					});
			}
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
		if ('__multipartyMeetingScreenShareExtensionAvailable__' in window)
		{
			return true;
		}

		return false;
	}
	
	needExtension()
	{
		if ('__multipartyMeetingScreenShareExtensionAvailable__' in window)
		{
			return false;
		}

		return true;
	}

	_toConstraints(options, streamId)
	{
		const constraints = {
			video : {
				mandatory : {
					chromeMediaSource   : 'desktop',
					chromeMediaSourceId : streamId
				},
				optional : [ {
					googTemporalLayeredScreencast : true
				} ]
			},
			audio : false
		};

		if (isFinite(options.width))
		{
			constraints.video.mandatory.maxWidth = options.width;
			constraints.video.mandatory.minWidth = options.width;
		}
		if (isFinite(options.height))
		{
			constraints.video.mandatory.maxHeight = options.height;
			constraints.video.mandatory.minHeight = options.height;
		}
		if (isFinite(options.frameRate))
		{
			constraints.video.mandatory.maxFrameRate = options.frameRate;
			constraints.video.mandatory.minFrameRate = options.frameRate;
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

	needExtension()
	{
		return false;
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

export default class ScreenShare
{
	static create()
	{
		switch (getBrowserType())
		{
			case 'firefox':
			{
				return new FirefoxScreenShare();
			}
			case 'chrome':
			{
				return new ChromeScreenShare();
			}
			default:
			{
				return null;
			}
		}
	}
}

import Logger from './Logger';
import intl from 'react-intl-universal';
const logger = new Logger('ChromeScreenShare');

class ChromeScreenShare
{
	constructor()
	{
		this._stream = null;
	}

	getScreenList(options = { })
	{
		return new Promise();
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

class Chrome72ScreenShare
{
	constructor()
	{
		this._stream = null;
	}

	getScreenList(options = { })
	{
		return new Promise();
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

	needExtension()
	{
		return false;
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

class Firefox66ScreenShare
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

	needExtension()
	{
		return false;
	}

	_toConstraints()
	{
		const constraints = {
			video : true
		};

		return constraints;
	}
}

class EdgeScreenShare
{
	constructor()
	{
		this._stream = null;
	}

	start(options = {})
	{
		const constraints = this._toConstraints(options);

		return navigator.getDisplayMedia(constraints)
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

	_toConstraints()
	{
		const constraints = {
			video : true
		};

		return constraints;
	}
}

class ElectronScreenShare
{
	constructor()
	{
		this._stream = null;
		// const { _electron, ipcRenderer } = window.require('electron');
		const _electron = window.require('electron');

		this.desktopCapturer = _electron.desktopCapturer;
	}

	getScreenList(options = { })
	{
		return new Promise((resolve, reject) =>
		{
			this.desktopCapturer.getSources({ types: [ 'screen', 'window' ] }, (error, sources) => 
			{
				if (error)
				{
					reject(error);
				}
				else 
				{
					let screenCount = 0;
					const screens = sources.filter((source) => 
					{
						if (source.id.indexOf('screen:') != -1)
						{
							screenCount ++;
							switch (screenCount) 
							{
								case 1:
									source.name = intl.get('screen_showname1');
									break;
								case 2:
									source.name = intl.get('screen_showname2');
									break;
								case 3:
									source.name = intl.get('screen_showname3');
									break;
								case 4:
									source.name = intl.get('screen_showname4');
									break;
								case 5:
									source.name = intl.get('screen_showname5');
									break;
								default:
									source.name = intl.get('screen_showname');
									break;
							}
							
							return source;
						} 
						else if (source.name.endsWith('.doc') || source.name.endsWith('.docx') || 
						source.name.endsWith('.xls') || source.name.endsWith('.xlsx') || 
						source.name.endsWith('.ppt') || source.name.endsWith('.pptx') || source.name.endsWith('.pdf'))
						{
							return source;
						}
					});

					if (screenCount === 1)
					{
						screens[0].name = intl.get('screen_showname');
					}
					screenCount = 0;
					resolve(screens);
				}
			});
		});
	}

	start(options = { })
	{
		const state = this;
		
		return new Promise((resolve, reject) =>
		{
			// this._ipcRenderer.once('meeting_getStreamId', _onSelectSreenMessage);
			// this._ipcRenderer.send('new-window', {
			// 	winUrl    : '#/ChooseScreen',
			// 	winType   : 'ChooseScreen',
			// 	winTitle  : '分享选择',
			// 	winIcon   : '',
			// 	shapeType : 'normal'
			// });

			window.addEventListener('message', _onSelectSreenMessage, false);
			window.postMessage({ type: 'getStreamId' }, '*');
			function _onSelectSreenMessage({ data })
			{
				
				logger.debug('_onSelectSreenMessage 1', data);
				if (data.type !== 'gotStreamId')
				{
					return;
				}
				const constraints = state._toConstraints(options, data.streamId);
				
				navigator.webkitGetUserMedia(constraints, (stream) =>
				{
					// window.removeEventListener('message', _onSelectSreenMessage);
					logger.debug('_onSelectSreenMessage 2', stream);
					state._stream = stream;
					resolve(stream);
				}, (e) =>
				{
					// window.removeEventListener('message', _onSelectSreenMessage);
					logger.debug('_onSelectSreenMessage 3', e);
					reject(e);
				});
			}
			
			// this.desktopCapturer.getSources({ types: [ 'screen', 'window' ] }, (error, sources) => 
			// {
			// 	for (let i = 0; i < sources.length; ++i) 
			// 	{
			// 		logger.debug('sources id::', sources[i].id); // id name thumbnail
			// 		navigator.webkitGetUserMedia({
			// 			audio : false,
			// 			video : {
			// 				mandatory : {
			// 					chromeMediaSource   : 'desktop',
			// 					chromeMediaSourceId : sources[i].id,
			// 					maxWidth            : 2560,
			// 					maxHeight           : 1440
			// 				}
			// 			}
			// 		}, (stream1) =>
			// 		{
			// 			resolve(stream1);
			// 		}, (e) =>
			// 		{
			// 			logger.debug('getUserMediaError', e);
			// 			reject(error);
			// 		});
			// 		if (sources[i].id == 'window:0:0') break;
			// 	}
			// });
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

	_toConstraints(options, streamId)
	{
		const constraints = {
			video : {
				mandatory : {
					chromeMediaSource   : 'desktop',
					chromeMediaSourceId : streamId
				}
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

class DefaultScreenShare
{
	isScreenShareAvailable()
	{
		return false;
	}

	needExtension()
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
					return new Firefox66ScreenShare();
			}
			case 'chrome':
			{
				if (device.version < 72.0)
					return new ChromeScreenShare();
				else
					return new Chrome72ScreenShare();
			}
			case 'msedge':
			{
				return new EdgeScreenShare();
			}
			case 'electron':
			{
				return new ElectronScreenShare();
			}
			default:
			{
				return new DefaultScreenShare();
			}
		}
	}
}

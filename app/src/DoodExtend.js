/* eslint-disable no-console */
import Logger from './Logger';
import RecordRTC from 'recordrtc';

const logger = new Logger('DefaultDoodExtend');

class ChromeDoodExtend
{
	constructor()
	{
	}

	getUserInfo(options = {})
	{
		return '';
	}

	getMemberInfo(options = {})
	{
		return '';
	}

	getMemberList(options = {})
	{
		const map = [];

		return new Promise((resolve, reject) =>
		{
			for (let index = 0; index < 10; index++) 
			{
				const arr1 = [];

				arr1.push(`${index}${index}${index}`);
				arr1.push({ thumbAvatar: '', remark: `${index}${index}${index}`, name: `${index}-${index}-${index}` });
				map.push(arr1);
			}
			
			resolve(map);
		});
		// return array;
	}

	async getAudioStream()
	{
		const devices = await navigator.mediaDevices.enumerateDevices();
		const audioDevices = devices.filter((device) => device.kind === 'audiooutput');
		
		return audioDevices;
	}

	async getScreenStrean(options = { })
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

	async startRecording(options = {})
	{

		const { producer, peers } = options;
		// const stream = await navigator.mediaDevices.getUserMedia({
		// 	audio : true,
		// 	video : true
		// });
		const micStream = new MediaStream;
		const speakStream = new MediaStream;

		micStream.addTrack(producer.track);
		for (const peer of peers)
		{
			for (const consumer of peer.consumers)
			{
				if (consumer.kind === 'audio')
				{
					console.log('zxj::startRecording>>', consumer);
					speakStream.addTrack(consumer.track);
				}
			}
		}

		const screen = await this.getScreenStrean();

		screen.width = window.screen.width;
		screen.height = window.screen.height;
		screen.fullcanvas = true;
		this.recorder = RecordRTC([ micStream, speakStream, screen ], {
			type     : 'video',
			mimeType : 'video/webm'
		});
		this.recorder.startRecording();
	}

	async stopRecording(options = {})
	{
		
		console.log('zxj::stopRecording', this.recorder);
		if (this.recorder)
		{
			const { isCancel } = options;

			this.recorder.stopRecording((res) => 
			{
				if (isCancel) 
				{
					this.recorder.destroy();
					this.recorder = null;
				}
				else 
				{
					this.recorder.save('record');
				}
				console.log('zxj::stopRecording>>1', res, isCancel);
			});
		}
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

	sendTemplateMsg()
	{
		console.log('zxj::InviteMember::sendTemplateMsg');
	}

	closeView(option = {})
	{

	}

	openWebrtcStats()
	{

	}

	keepalive()
	{
		console.log('keepalive==>');
		setTimeout(() => 
		{
			this.keepalive();
		}, 150 * 1000);
	}

	memberNotify(request = {})
	{
		console.log('memberNotify==>', request);
	}

	log4File(tag, message)
	{
		console.log(`vrvmeeting::${tag}==${message}`);
	}
}

class ElectronDoodExtend
{
	constructor()
	{
		const electron = window.require('electron');
		const { remote, ipcRenderer, desktopCapturer } = electron;

		this.service = remote.getGlobal('service');
		this.rtcplugin = remote.getGlobal('service')['rtcplugin'];
		this.ipcRenderer = ipcRenderer;
		this.desktopCapturer = desktopCapturer;
		const self = this;

		// this.ipcRenderer.on('closeMeeting', function(event, arg) 
		// {
		// 	self.openWebrtcStats(false);
		// 	self.closeView(self.meetingInfo);
		// });
		this.recorder = null;
		// this.meetingInfo = null;
	}

	getUserInfo(options = {})
	{
		const { peer } = options;
		
		return new Promise((resolve, reject) =>
		{
			this.service.search.getUserInfo({ userId: peer.name }, (userInfo) => 
			{
				const { thumbAvatar } = userInfo.users;	

				resolve(thumbAvatar);
			});
		});
	}

	getMemberList(option = {})
	{
		const { groupId } = option;

		return new Promise((resolve, reject) =>
		{
			this.service.group.getMemberList({
				groupId : groupId
			}, (result) =>
			{
				if (result.code === 0)
				{
					resolve(result.members);
				}
				else
				{
					reject(null);
				}
				
			});
		});
	}

	getMemberInfo(options = {})
	{
		const { groupId, userId } = options;

		return new Promise((resolve, reject) =>
		{
			this.service.group.getMemberInfo({
				groupId : groupId,
				userId  : userId
			}, (userInfo) => 
			{
				resolve(userInfo);
			});
		});
	}

	async getAudioStream()
	{
		const devices = await navigator.mediaDevices.enumerateDevices();
		const audioDevices = devices.filter((device) => device.kind === 'audiooutput');

		// eslint-disable-next-line no-console
		console.log('zxj::getAudioStream>>', audioDevices);
	}

	async getScreenStrean()
	{
		return new Promise((resolve, reject) => 
		{
			this.desktopCapturer.getSources({ types: [ 'window' ] }, (error, sources) => 
			{
				for (let i = 0; i < sources.length; ++i) 
				{
					if (sources[i].name === '豆豆视频会议' || sources[i].name === 'Linkdood Video Conference')
					{
						navigator.webkitGetUserMedia({
							audio : false,
							video : {
								mandatory : {
									chromeMediaSource   : 'desktop',
									chromeMediaSourceId : sources[i].id,
									maxWidth            : 2560,
									maxHeight           : 1440
								}
							}
						}, (stream1) =>
						{
							resolve(stream1);
						}, (e) =>
						{
							logger.debug('getUserMediaError', e);
							reject(error);
						});
					}
					logger.debug('sources id::', sources[i]); // id name thumbnail
					// if (sources[i].id == 'window:0:0') break;
				}
			});
		});
	}

	async startRecording(options = {})
	{
		const screen = await this.getScreenStrean();

		const { producer, peers } = options;
		const micStream = new MediaStream;
		const speakStream = new MediaStream;

		micStream.addTrack(producer.track);
		for (const peer of peers)
		{
			for (const consumer of peer.consumers)
			{
				if (consumer.kind === 'audio')
				{
					console.log('zxj::startRecording>>', consumer);
					speakStream.addTrack(consumer.track);
				}
			}
		}
		screen.width = window.screen.width;
		screen.height = window.screen.height;
		screen.fullcanvas = true;
		this.recorder = RecordRTC([ micStream, speakStream, screen ], {
			type     : 'video',
			mimeType : 'video/webm'
		});
		this.recorder.startRecording();
	}

	async stopRecording(options = {})
	{
		if (this.recorder)
		{
			const { isCancel } = options;

			this.recorder.stopRecording((res) => 
			{
				if (isCancel) 
				{
					this.recorder.destroy();
					this.recorder = null;
				}
				else 
				{
					this.recorder.save('record');
				}

				console.log('zxj::stopRecording>>1', res, isCancel);
			});
		}
	}

	sendTemplateMsg(options)
	{
		// const { groupId, userId, theme, remark, memberIds } = options;
		const { roomId, groupId, userId, theme, remark, memberIds } = options.extend;

		return new Promise((resolve, reject) =>
		{
			const fields = remark ? [ {
				[this.$t('chat.remark')] : remark 
			} ] : '';
			const detailUrl = {
				subType : 14,
				roomID  : roomId
			};
			const msgBean = {
				fromId        : userId,
				targetId      : groupId,
				msgProperties : '',
				msgType       : 26,
				
				time : new Date().getTime()
					.toString(),
				
				localId : new Date().getTime()
					.toString(),
				// isPrivateMsg: 0,
				// msgId : 
				// activeType: 0,
				// deviceType : 1,
				
				// noStore : 0,
				// unReadCount : 0,
				// maxUnReadCount : 0,
				// snapshotId : 0,
				timeZone           : -4*(new Date().getTimezoneOffset()/60),
				title              : '视频会议',
				titleColor         : '#FFFFFF',
				titleBGColor       : '#003557',
				content            : theme,
				fields             : `'fields':${JSON.stringify(fields)}`,
				detailUrl          : JSON.stringify(detailUrl),
				limitRange         : memberIds,
				creator            : this.user_account.name,
				relatedUsers       : memberIds,
				isNeedHandleUnread : true

			};
			// const msg = new MsgImgTemplate(msgBean);

			this.service.chat.sendMessage(msgBean, (result) =>
			{
				console.log('createGroupMeeting::handleMeeting ==>', result);
				resolve(result);
			});
		});		
	}

	closeView(option = {})
	{
		this.ipcRenderer.send('exit_meeting', option);
		// eslint-disable-next-line no-console
		console.log('zxj::exit-meeting0');
	}

	openWebrtcStats(open = true)
	{
		this.ipcRenderer.send('open_webrtc_stats', open);
	}

	keepalive()
	{
		console.log('keepalive==>0 ');
		this.rtcplugin.keepalive({
			reqType : 6
		}, (cb) => 
		{
			console.log('keepalive==>1 ', cb);		
		});
		setTimeout(() => 
		{
			this.keepalive();
		}, 150 * 1000);
	}

	// 成员变动通知
	memberNotify(request = {})
	{
		console.log('memberNotify==>0 ', request);	
		request = Object.assign(request, { reqType: 7 });
		this.rtcplugin.memberNotify(request, (cb) => 
		{
			console.log('memberNotify==>1 ', cb);		
		});
	}

	log4File(tag, message)
	{
		this.service.log(`vrvmeeting::${tag}==${message}`);
		console.log(`vrvmeeting::${tag}==${message}`);
	}

}

function log(tag, ...args)
{

}
class DefaultDoodExtend
{

}
export default class DoodExtend
{
	static create(device)
	{
		logger.debug('DoodExtend', device);
		switch (device.flag)
		{
			case 'electron':
			{
				return new ElectronDoodExtend();
			}
			case 'chrome':
			{
				return new ChromeDoodExtend();
			}
			default:
			{
				return new DefaultDoodExtend();
			}
		}
	}
}

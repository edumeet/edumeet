'use strict';

import events from 'events';
import browser from 'bowser';
import sdpTransform from 'sdp-transform';
import Logger from './Logger';
import protooClient from 'protoo-client';
import * as urlFactory from './urlFactory';
import * as utils from './utils';

const logger = new Logger('Client');

const DO_GETUSERMEDIA = true;
const ENABLE_SIMULCAST = false;
const VIDEO_CONSTRAINS =
{
	qvga   : { width: { ideal: 320  }, height: { ideal: 240  }},
	vga    : { width: { ideal: 640  }, height: { ideal: 480  }},
	hd     : { width: { ideal: 1280 }, height: { ideal: 720  }}
};

export default class Client extends events.EventEmitter
{
	constructor(peerId, roomId)
	{
		logger.debug('constructor() [peerId:"%s", roomId:"%s"]', peerId, roomId);

		super();
		this.setMaxListeners(Infinity);

		// TODO: TMP
		global.CLIENT = this;

		let url = urlFactory.getProtooUrl(peerId, roomId);
		let transport = new protooClient.WebSocketTransport(url);

		// protoo-client Peer instance.
		this._protooPeer = new protooClient.Peer(transport);

		// RTCPeerConnection instance.
		this._peerconnection = null;

		// Webcam map indexed by deviceId.
		this._webcams = new Map();

		// Local Webcam device.
		this._webcam = null;

		// Local MediaStream instance.
		this._localStream = null;

		// Closed flag.
		this._closed = false;

		// Local video resolution.
		this._localVideoResolution = 'vga';

		this._protooPeer.on('open', () =>
		{
			logger.debug('protoo Peer "open" event');
		});

		this._protooPeer.on('disconnected', () =>
		{
			logger.warn('protoo Peer "disconnected" event');

			// Close RTCPeerConnection.
			try
			{
				this._peerconnection.close();
			}
			catch (error) {}

			// Close local MediaStream.
			if (this._localStream)
				utils.closeMediaStream(this._localStream);

			this.emit('disconnected');
		});

		this._protooPeer.on('close', () =>
		{
			if (this._closed)
				return;

			logger.warn('protoo Peer "close" event');

			this.close();
		});

		this._protooPeer.on('request', this._handleRequest.bind(this));
	}

	close()
	{
		if (this._closed)
			return;

		this._closed = true;

		logger.debug('close()');

		// Close protoo Peer.
		this._protooPeer.close();

		// Close RTCPeerConnection.
		try
		{
			this._peerconnection.close();
		}
		catch (error) {}

		// Close local MediaStream.
		if (this._localStream)
			utils.closeMediaStream(this._localStream);

		// Emit 'close' event.
		this.emit('close');
	}

	removeVideo(dontNegotiate)
	{
		logger.debug('removeVideo()');

		let stream = this._localStream;
		let videoTrack = stream.getVideoTracks()[0];

		if (!videoTrack)
		{
			logger.warn('removeVideo() | no video track');

			return Promise.reject(new Error('no video track'));
		}

		videoTrack.stop();

		if (this._peerconnection.removeTrack)
		{
			let sender;

			for (sender of this._peerconnection.getSenders())
			{
				if (sender.track === videoTrack)
					break;
			}

			this._peerconnection.removeTrack(sender);
		}
		else
		{
			stream.removeTrack(videoTrack);
		}

		if (!dontNegotiate)
		{
			this.emit('localstream', stream, null);

			return this._requestRenegotiation();
		}
	}

	addVideo()
	{
		logger.debug('addVideo()');

		let stream = this._localStream;
		let videoTrack;
		let videoResolution = this._localVideoResolution; // Keep previous resolution.

		if (stream)
			videoTrack = stream.getVideoTracks()[0];

		if (videoTrack)
		{
			logger.warn('addVideo() | there is already a video track');

			return Promise.reject(new Error('there is already a video track'));
		}

		return this._getLocalStream(
			{
				video : VIDEO_CONSTRAINS[videoResolution]
			})
			.then((newStream) =>
			{
				let newVideoTrack = newStream.getVideoTracks()[0];

				if (stream)
				{
					// Fucking hack for adapter.js in Chrome.
					if (this._peerconnection.removeStream)
						this._peerconnection.removeStream(stream);

					stream.addTrack(newVideoTrack);

					if (this._peerconnection.addTrack)
						this._peerconnection.addTrack(newVideoTrack, stream);
				}
				else
				{
					this._localStream = newStream;
					this._peerconnection.addStream(newStream);
				}

				this.emit('localstream', this._localStream, videoResolution);
			})
			.then(() =>
			{
				return this._requestRenegotiation();
			})
			.catch((error) =>
			{
				logger.error('addVideo() failed: %o', error);

				throw error;
			});
	}

	changeWebcam()
	{
		logger.debug('changeWebcam()');

		return Promise.resolve()
			.then(() =>
			{
				return this._updateWebcams();
			})
			.then(() =>
			{
				let array = Array.from(this._webcams.keys());
				let len = array.length;
				let deviceId = this._webcam ? this._webcam.deviceId : undefined;
				let idx = array.indexOf(deviceId);

				if (idx < len - 1)
					idx++;
				else
					idx = 0;

				this._webcam = this._webcams.get(array[idx]);

				this._emitWebcamType();

				if (len < 2)
					return;

				logger.debug(
					'changeWebcam() | new selected webcam [deviceId:"%s"]',
					this._webcam.deviceId);

				// Reset video resolution to VGA.
				this._localVideoResolution = 'vga';

				// For Chrome (old WenRTC API).
				// Replace the track (so new SSRC) and renegotiate.
				if (!this._peerconnection.removeTrack)
				{
					this.removeVideo(true);

					return this.addVideo();
				}
				// For Firefox (modern WebRTC API).
				// Avoid renegotiation.
				else
				{
					return this._getLocalStream(
						{
							video : VIDEO_CONSTRAINS[this._localVideoResolution]
						})
						.then((newStream) =>
						{
							let newVideoTrack = newStream.getVideoTracks()[0];
							let stream = this._localStream;
							let oldVideoTrack = stream.getVideoTracks()[0];
							let sender;

							for (sender of this._peerconnection.getSenders())
							{
								if (sender.track === oldVideoTrack)
									break;
							}

							sender.replaceTrack(newVideoTrack);
							stream.removeTrack(oldVideoTrack);
							oldVideoTrack.stop();
							stream.addTrack(newVideoTrack);

							this.emit('localstream', stream, this._localVideoResolution);
						});
				}
			})
			.catch((error) =>
			{
				logger.error('changeWebcam() failed: %o', error);
			});
	}

	changeVideoResolution()
	{
		logger.debug('changeVideoResolution()');

		let newVideoResolution;

		switch (this._localVideoResolution)
		{
			case 'qvga':
				newVideoResolution = 'vga';
				break;
			case 'vga':
				newVideoResolution = 'hd';
				break;
			case 'hd':
				newVideoResolution = 'qvga';
				break;
			default:
				throw new Error(`unknown resolution "${this._localVideoResolution}"`);
		}

		this._localVideoResolution = newVideoResolution;

		// For Chrome (old WenRTC API).
		// Replace the track (so new SSRC) and renegotiate.
		if (!this._peerconnection.removeTrack)
		{
			this.removeVideo(true);

			return this.addVideo();
		}
		// For Firefox (modern WebRTC API).
		// Avoid renegotiation.
		else
		{
			return this._getLocalStream(
				{
					video : VIDEO_CONSTRAINS[this._localVideoResolution]
				})
				.then((newStream) =>
				{
					let newVideoTrack = newStream.getVideoTracks()[0];
					let stream = this._localStream;
					let oldVideoTrack = stream.getVideoTracks()[0];
					let sender;

					for (sender of this._peerconnection.getSenders())
					{
						if (sender.track === oldVideoTrack)
							break;
					}

					sender.replaceTrack(newVideoTrack);
					stream.removeTrack(oldVideoTrack);
					oldVideoTrack.stop();
					stream.addTrack(newVideoTrack);

					this.emit('localstream', stream, newVideoResolution);
				})
				.catch((error) =>
				{
					logger.error('changeVideoResolution() failed: %o', error);
				});
		}
	}

	getStats()
	{
		return this._peerconnection.getStats()
			.catch((error) =>
			{
				logger.error('pc.getStats() failed: %o', error);

				throw error;
			});
	}

	disableRemoteVideo(msid)
	{
		return this._protooPeer.send('disableremotevideo', { msid, disable: true })
			.catch((error) =>
			{
				logger.warn('disableRemoteVideo() failed: %o', error);
			});
	}

	enableRemoteVideo(msid)
	{
		return this._protooPeer.send('disableremotevideo', { msid, disable: false })
			.catch((error) =>
			{
				logger.warn('enableRemoteVideo() failed: %o', error);
			});
	}

	_handleRequest(request, accept, reject)
	{
		logger.debug('_handleRequest() [method:%s, data:%o]', request.method, request.data);

		switch(request.method)
		{
			case 'joinme':
			{
				let videoResolution = this._localVideoResolution;

				Promise.resolve()
					.then(() =>
					{
						return this._updateWebcams();
					})
					.then(() =>
					{
						if (DO_GETUSERMEDIA)
						{
							return this._getLocalStream(
								{
									audio : true,
									video : VIDEO_CONSTRAINS[videoResolution]
								})
								.then((stream) =>
								{
									logger.debug('got local stream [resolution:%s]', videoResolution);

									// Close local MediaStream if any.
									if (this._localStream)
										utils.closeMediaStream(this._localStream);

									this._localStream = stream;

									// Emit 'localstream' event.
									this.emit('localstream', stream, videoResolution);
								});
						}
					})
					.then(() =>
					{
						return this._createPeerConnection();
					})
					.then(() =>
					{
						return this._peerconnection.createOffer(
							{
								offerToReceiveAudio : 1,
								offerToReceiveVideo : 1
							});
					})
					.then((offer) =>
					{
						let capabilities = offer.sdp;
						let parsedSdp = sdpTransform.parse(capabilities);

						logger.debug('capabilities [parsed:%O, sdp:%s]', parsedSdp, capabilities);

						// Accept the protoo request.
						accept(
							{
								capabilities : capabilities,
								usePlanB     : utils.isPlanB()
							});
					})
					.then(() =>
					{
						logger.debug('"joinme" request accepted');

						// Emit 'join' event.
						this.emit('join');
					})
					.catch((error) =>
					{
						logger.error('"joinme" request failed: %o', error);

						reject(500, error.message);
						throw error;
					});

				break;
			}

			case 'peers':
			{
				this.emit('peers', request.data.peers);
				accept();

				break;
			}

			case 'addpeer':
			{
				this.emit('addpeer', request.data.peer);
				accept();

				break;
			}

			case 'updatepeer':
			{
				this.emit('updatepeer', request.data.peer);
				accept();

				break;
			}

			case 'removepeer':
			{
				this.emit('removepeer', request.data.peer);
				accept();

				break;
			}

			case 'offer':
			{
				let offer = new RTCSessionDescription(request.data.offer);
				let parsedSdp = sdpTransform.parse(offer.sdp);

				logger.debug('received offer [parsed:%O, sdp:%s]', parsedSdp, offer.sdp);

				Promise.resolve()
					.then(() =>
					{
						return this._peerconnection.setRemoteDescription(offer);
					})
					.then(() =>
					{
						return this._peerconnection.createAnswer();
					})
					// Play with simulcast.
					.then((answer) =>
					{
						if (!ENABLE_SIMULCAST)
							return answer;

						// Chrome Plan B simulcast.
						if (utils.isPlanB())
						{
							// Just for the initial offer.
							// NOTE: Otherwise Chrome crashes.
							// TODO: This prevents simulcast to be applied to new tracks.
							if (this._peerconnection.localDescription && this._peerconnection.localDescription.sdp)
								return answer;

							// TODO: Should be done just for VP8.
							let parsedSdp = sdpTransform.parse(answer.sdp);
							let videoMedia;

							for (let m of parsedSdp.media)
							{
								if (m.type === 'video')
								{
									videoMedia = m;
									break;
								}
							}

							if (!videoMedia || !videoMedia.ssrcs)
								return answer;

							logger.debug('setting video simulcast (PlanB)');

							let ssrc1;
							let ssrc2;
							let ssrc3;
							let cname;
							let msid;

							for (let ssrcObj of videoMedia.ssrcs)
							{
								// Chrome uses:
								//   a=ssrc:xxxx msid:yyyy zzzz
								//   a=ssrc:xxxx mslabel:yyyy
								//   a=ssrc:xxxx label:zzzz
								// Where yyyy is the MediaStream.id and zzzz the MediaStreamTrack.id.
								switch (ssrcObj.attribute)
								{
									case 'cname':
										ssrc1 = ssrcObj.id;
										cname = ssrcObj.value;
										break;

									case 'msid':
										msid = ssrcObj.value;
										break;
								}
							}

							ssrc2 = ssrc1 + 1;
							ssrc3 = ssrc1 + 2;

							videoMedia.ssrcGroups =
							[
								{
									semantics : 'SIM',
									ssrcs     : `${ssrc1} ${ssrc2} ${ssrc3}`
								}
							];

							videoMedia.ssrcs =
							[
								{
									id        : ssrc1,
									attribute : 'cname',
									value     : cname,
								},
								{
									id        : ssrc1,
									attribute : 'msid',
									value     : msid,
								},
								{
									id        : ssrc2,
									attribute : 'cname',
									value     : cname,
								},
								{
									id        : ssrc2,
									attribute : 'msid',
									value     : msid,
								},
								{
									id        : ssrc3,
									attribute : 'cname',
									value     : cname,
								},
								{
									id        : ssrc3,
									attribute : 'msid',
									value     : msid,
								}
							];

							let modifiedAnswer =
							{
								type : 'answer',
								sdp  : sdpTransform.write(parsedSdp)
							};

							return modifiedAnswer;
						}
						// Firefox way.
						else
						{
							let parsedSdp = sdpTransform.parse(answer.sdp);
							let videoMedia;

							logger.debug('created answer [parsed:%O, sdp:%s]', parsedSdp, answer.sdp);

							for (let m of parsedSdp.media)
							{
								if (m.type === 'video' && m.direction === 'sendonly')
								{
									videoMedia = m;
									break;
								}
							}

							if (!videoMedia)
								return answer;

							logger.debug('setting video simulcast (Unified-Plan)');

							videoMedia.simulcast_03 =
							{
								value : 'send rid=1,2'
							};

							videoMedia.rids =
							[
								{ id: '1', direction: 'send' },
								{ id: '2', direction: 'send' }
							];

							let modifiedAnswer =
							{
								type : 'answer',
								sdp  : sdpTransform.write(parsedSdp)
							};

							return modifiedAnswer;
						}
					})
					.then((answer) =>
					{
						return this._peerconnection.setLocalDescription(answer);
					})
					.then(() =>
					{
						let answer = this._peerconnection.localDescription;
						let parsedSdp = sdpTransform.parse(answer.sdp);

						logger.debug('sent answer [parsed:%O, sdp:%s]', parsedSdp, answer.sdp);

						accept(
							{
								answer :
								{
									type : answer.type,
									sdp  : answer.sdp
								}
							});
					})
					.catch((error) =>
					{
						logger.error('"offer" request failed: %o', error);

						reject(500, error.message);
						throw error;
					})
					.then(() =>
					{
						// If Firefox trigger 'forcestreamsupdate' event due to bug:
						// https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
						if (browser.firefox || browser.gecko)
						{
							// Not sure, but it thinks that the timeout does the trick.
							setTimeout(() => this.emit('forcestreamsupdate'), 500);
						}
					});

				break;
			}

			case 'activespeaker':
			{
				let data = request.data;

				this.emit('activespeaker', data.peer, data.level);
				accept();

				break;
			}

			default:
			{
				logger.error('unknown method');

				reject(404, 'unknown method');
			}
		}
	}

	_updateWebcams()
	{
		logger.debug('_updateWebcams()');

		// Reset the list.
		this._webcams = new Map();

		return Promise.resolve()
			.then(() =>
			{
				return navigator.mediaDevices.enumerateDevices();
			})
			.then((devices) =>
			{
				for (let device of devices)
				{
					if (device.kind !== 'videoinput')
						continue;

					this._webcams.set(device.deviceId, device);
				}
			})
			.then(() =>
			{
				let array = Array.from(this._webcams.values());
				let len = array.length;
				let currentWebcamId = this._webcam ? this._webcam.deviceId : undefined;

				logger.debug('_updateWebcams() [webcams:%o]', array);

				if (len === 0)
					this._webcam = null;
				else if (!this._webcams.has(currentWebcamId))
					this._webcam = array[0];

				this.emit('numwebcams', len);

				this._emitWebcamType();
			});
	}

	_getLocalStream(constraints)
	{
		logger.debug('_getLocalStream() [constraints:%o, webcam:%o]',
			constraints, this._webcam);

		if (this._webcam)
			constraints.video.deviceId = { exact: this._webcam.deviceId };

		return navigator.mediaDevices.getUserMedia(constraints);
	}

	_createPeerConnection()
	{
		logger.debug('_createPeerConnection()');

		this._peerconnection = new RTCPeerConnection({ iceServers: [] });

		// TODO: TMP
		global.PC = this._peerconnection;

		if (this._localStream)
			this._peerconnection.addStream(this._localStream);

		this._peerconnection.addEventListener('iceconnectionstatechange', () =>
		{
			let state = this._peerconnection.iceConnectionState;

			logger.debug('peerconnection "iceconnectionstatechange" event [state:%s]', state);

			this.emit('connectionstate', state);
		});

		this._peerconnection.addEventListener('addstream', (event) =>
		{
			let stream = event.stream;

			logger.debug('peerconnection "addstream" event [stream:%o]', stream);

			this.emit('addstream', stream);

			// NOTE: For testing.
			let interval = setInterval(() =>
			{
				if (!stream.active)
				{
					logger.warn('stream inactive [stream:%o]', stream);

					clearInterval(interval);
				}
			}, 2000);

			stream.addEventListener('addtrack', (event) =>
			{
				let track = event.track;

				logger.debug('stream "addtrack" event [track:%o]', track);

				this.emit('addtrack', track);

				// Firefox does not implement 'stream.onremovetrack' so let's use 'track.ended'.
				// But... track "ended" is neither fired.
				// https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
				track.addEventListener('ended', () =>
				{
					logger.debug('track "ended" event [track:%o]', track);

					this.emit('removetrack', track);
				});
			});

			// NOTE: Not implemented in Firefox.
			stream.addEventListener('removetrack', (event) =>
			{
				let track = event.track;

				logger.debug('stream "removetrack" event [track:%o]', track);

				this.emit('removetrack', track);
			});
		});

		this._peerconnection.addEventListener('removestream', (event) =>
		{
			let stream = event.stream;

			logger.debug('peerconnection "removestream" event [stream:%o]', stream);

			this.emit('removestream', stream);
		});
	}

	_requestRenegotiation()
	{
		logger.debug('_requestRenegotiation()');

		return this._protooPeer.send('reofferme');
	}

	_restartIce()
	{
		logger.debug('_restartIce()');

		return this._protooPeer.send('restartice')
			.then(() =>
			{
				logger.debug('_restartIce() succeded');
			})
			.catch((error) =>
			{
				logger.error('_restartIce() failed: %o', error);

				throw error;
			});
	}

	_emitWebcamType()
	{
		let webcam = this._webcam;

		if (!webcam)
			return;

		if (/(back|rear)/i.test(webcam.label))
		{
			logger.debug('_emitWebcamType() | it seems to be a back camera');

			this.emit('webcamtype', 'back');
		}
		else
		{
			logger.debug('_emitWebcamType() | it seems to be a front camera');

			this.emit('webcamtype', 'front');
		}
	}
}

import Logger from './Logger';
import * as mediasoupClient from 'mediasoup-client';
import { PC_PROPRIETARY_CONSTRAINTS, VIDEO_KSVC_ENCODINGS, VIDEO_SIMULCAST_PROFILES, VIDEO_SVC_ENCODINGS } from './consts';
import SignalingAPI from './SignalingAPI';
import { IEdumeetSimulcastConfig } from './types';
import { RtpEncodingParameters } from 'mediasoup-client/lib/types';

const logger = new Logger('Transport');

type IceRestartState = {timer: NodeJS.Timer|null, restarting: boolean}

type TransportProps = {
	api: SignalingAPI
	isProduceEnabled: boolean
	forceTcp: boolean,
	iceTransportPolicy: 'all'|'relay'|undefined,
	simulcastConfig: IEdumeetSimulcastConfig,
	insertableStreamsEnabled: boolean
}

export default class Transport {
	private api: SignalingAPI
	mediasoupDevice: mediasoupClient.Device
	private isProduceEnabled: boolean
	private forceTcp: boolean
	private iceTransportPolicy: 'all'|'relay'|undefined
	turnServers: RTCIceServer[] = []
	private simulcastConfig: IEdumeetSimulcastConfig
	private insertableStreamsEnabled =  false

	send?: mediasoupClient.types.Transport|null
	recv?: mediasoupClient.types.Transport|null

	private _iceRestartState = {
		recv : { timer: null, restarting: false } as IceRestartState,
		send : { timer: null, restarting: false } as IceRestartState
	}

	constructor(props: TransportProps) {
		this.mediasoupDevice = new mediasoupClient.Device();
		this.api = props.api;
		this.isProduceEnabled = props.isProduceEnabled;
		this.forceTcp = props.forceTcp;
		this.iceTransportPolicy = props.iceTransportPolicy;
		this.simulcastConfig = props.simulcastConfig;
		this.insertableStreamsEnabled = props.insertableStreamsEnabled

		this.api.on('disconnect', (reason: string) => {
			if (this.send) {
				this.send.close();
				this.send = null;
			}

			if (this.recv) {
				this.recv.close();
				this.recv = null;
			}
		});
	}

	async connect() {

		const routerRtpCapabilities = await this.api.getRouterRtpCapabilities();

		if (routerRtpCapabilities.headerExtensions) {
			routerRtpCapabilities.headerExtensions = routerRtpCapabilities.headerExtensions
				.filter((ext) => ext.uri !== 'urn:3gpp:video-orientation');
		}

		await this.mediasoupDevice.load({ routerRtpCapabilities });

		// we can only enforce usage of TURN if there are actually TURN server configured
		const iceTransportPolicy = this.turnServers.length ? this.iceTransportPolicy : 'all';

		if (this.isProduceEnabled) {
			const transportInfo = await this.api.createWebRtcTransport({
				forceTcp  : this.forceTcp,
				producing : true,
				consuming : false
			});

			const {
				id,
				iceParameters,
				iceCandidates,
				dtlsParameters
			} = transportInfo;

			this.send = this.mediasoupDevice.createSendTransport({
				id,
				iceParameters,
				iceCandidates,
				dtlsParameters,
				iceServers             : this.turnServers,
				iceTransportPolicy     : iceTransportPolicy,
				proprietaryConstraints : PC_PROPRIETARY_CONSTRAINTS
			});

			this.send.on('connect', async ({ dtlsParameters }, callback, errback) => {
				if (!this.send) return;
				try {
					callback(await this.api.connectWebRtcTransport({
						transportId : this.send.id,
						dtlsParameters
					}));
				} catch (err) {
					errback(err);
				}
			});

			this.send.on('connectionstatechange', (connectState) => {
				switch (connectState) {
					case 'disconnected':
					case 'failed':
						this.restartIce('send', 2000);
						break;

					default:
						if (this._iceRestartState.send.timer) {
							clearTimeout(this._iceRestartState.send.timer);
						}
						break;
				}
			});

			this.send.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
				if (!this.send) return;
				try {
					const { id } = await this.api.produce({
						transportId : this.send?.id,
						kind,
						rtpParameters,
						appData
					});

					callback({ id });
				} catch (error) {
					errback(error);
				}
			});
		}
		const transportInfo = await this.api.createWebRtcTransport({
			forceTcp  : this.forceTcp,
			producing : false,
			consuming : true
		});

		const {
			id,
			iceParameters,
			iceCandidates,
			dtlsParameters
		} = transportInfo;

		this.recv = this.mediasoupDevice.createRecvTransport({
			id,
			iceParameters,
			iceCandidates,
			dtlsParameters,
			iceServers         : this.turnServers,
			iceTransportPolicy : iceTransportPolicy,

			additionalSettings : {
				encodedInsertableStreams : this.insertableStreamsEnabled
			},
			appData : {
				encodedInsertableStreams : this.insertableStreamsEnabled
			}
		});

		this.recv.on(
			'connect', async ({ dtlsParameters }, callback, errback) => {
				if (!this.recv) return;
				try {
					callback(await this.api.connectWebRtcTransport({
						transportId : this.recv.id,
						dtlsParameters
					}));
				} catch (err) {
					errback(err);
				}
			});

		this.recv.on(
			'connectionstatechange', (connectState) => {
				switch (connectState) {
					case 'disconnected':
					case 'failed':
						this.restartIce('recv', 2000);
						break;

					default:
						if (this._iceRestartState.recv.timer) clearTimeout(this._iceRestartState.recv.timer);
						break;
				}
			});

	}

	async getStats() {
		const res = {
			recv : null,
			send : null
		};

		if (this.recv) {
			res.recv = await this.api.getTransportStats({ transportId: this.recv.id });
		}
		if (this.send) {
			res.send = await this.api.getTransportStats({ transportId: this.send.id });
		}

		return res;
	}
	private async restartIce(transportName: 'send'|'recv', delay: number) {
		const transport = transportName === 'send' ? this.send : this.recv;
		const iceState = this._iceRestartState[transportName];

		logger.debug('restartIce() [transport:%o ice:%o delay:%d]', transport, iceState, delay);
		if (!transport) {
			logger.error('restartIce(): missing valid transport object');

			return;
		}

		if (iceState.timer) clearTimeout(iceState.timer);
		iceState.timer = setTimeout(async () => {
			try {
				if (iceState.restarting) {
					return;
				}
				iceState.restarting = true;

				const iceParameters = await this.api.restartIce({ transportId: transport.id });

				await transport.restartIce({ iceParameters });
				iceState.restarting = false;
				logger.debug('ICE restarted');
			} catch (error) {
				logger.error('restartIce() [failed:%o]', error);

				iceState.restarting = false;
				iceState.timer = setTimeout(() => {
					this.restartIce(transportName, delay * 2);
				}, delay);
			}
		}, delay);
	}



	private _chooseEncodings(simulcastProfiles: {[width: number]: RtpEncodingParameters[]}, size: number) {
		let encodings: RtpEncodingParameters[] = [];

		const sortedMap: Map<string, RtpEncodingParameters[]> = new Map([ ...Object.entries(simulcastProfiles) ]
			.sort((a, b) => parseInt(b[0]) - parseInt(a[0])));
	
		// console.log(sortedMap)
		for(const [resolution,profile] of Array.from(sortedMap.entries())) {
			if (parseInt(resolution) < size)
			{
				if (encodings === null)
				{
					encodings = profile;
				}
	
				break;
			} else {
				encodings = profile;
			}
		}
		
		// // hack as there is a bug in mediasoup
		if (encodings.length === 1)
		{
			encodings.push({ ...encodings[0] });
		}
	
		return encodings;
	}

	getSimulcastEncodings(width: number, height: number, isScreenSharing: boolean = false): mediasoupClient.types.RtpEncodingParameters[] {
		// if (!this.simulcastConfig.enabled) {
		// 	return undefined;
		// }
		// If VP9 is the only available video codec then use SVC.
		const firstVideoCodec = this.mediasoupDevice
			.rtpCapabilities
			.codecs
			?.find((c) => c.kind === 'video');

		let encodings: mediasoupClient.types.RtpEncodingParameters[];

		const size = (width > height ? width : height);

		if (firstVideoCodec?.mimeType.toLowerCase() === 'video/vp9')
			encodings = isScreenSharing ? VIDEO_SVC_ENCODINGS : VIDEO_KSVC_ENCODINGS;
		else if (this.simulcastConfig.profiles)
			encodings = this._chooseEncodings(this.simulcastConfig.profiles, size);
		else
			encodings = this._chooseEncodings(VIDEO_SIMULCAST_PROFILES, size);

		return encodings;
	}

	close() {
		if (this.recv) this.recv.close();
		if (this.send) this.send.close();
	}
}
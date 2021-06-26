import * as mediasoupClient from 'mediasoup-client';
import Bowser from 'bowser';
import hark from 'hark';
import { stringArrayEqual } from './utils';
import { EventEmitterTyped, IEventsDescriptor } from './EventEmitter';
import EdumeetTransport from './Transport';
import EdumeetSignalingAPI from './SignalingAPI';
import { IEdumeetConfig, IEdumeetConsumer, INotificationNewConsumer } from './types';
import Logger from './Logger';
import { opusReceiverTransform, directReceiverTransform } from './transforms/receiver'
const logger = new Logger('Consumers');

type ConsumerExtended = mediasoupClient.types.Consumer & {hark?: hark.Harker}
type Devices = {[deviceId: string]: MediaDeviceInfo}

interface ConsumerEvents extends IEventsDescriptor {
	consumerAdded: (consumer: IEdumeetConsumer) => void
	consumerRemoved: (payload: {id: string, peerId: string}) => void
	consumerPaused: (payload: {id: string, originator: 'local'|'remote'}) => void
	consumerResumed: (payload: {id: string, originator: 'local'|'remote'}) => void
	consumerUpdate: (payload: Partial<IEdumeetConsumer> & {id: string}) => void
	audioDevicesUpdate: (payload: {devices: Devices}) => void
	selectedPeerRemoved: (payload: {peerId: string }) => void
	peerVolumeChange: (payload: { peerId: string, volume: number}) => void
	consumerOpusConfigChange: (payload: { id: string, opusConfig: string }) => void
}

export default class EdumeetConsumers extends EventEmitterTyped<ConsumerEvents> {
	private config: IEdumeetConfig
	private api: EdumeetSignalingAPI
	private transport: EdumeetTransport
	private bowser: Bowser.Parser.Parser
	private _audioDevices: Devices = {}

	// Internal mediasoup Consumer
	_mediasoupConsumers: Map<string, ConsumerExtended> = new Map()

	// Public facing edumeet consumer
	_edumeetConsumers: Map<string, IEdumeetConsumer> = new Map()

	get consumers(): IEdumeetConsumer[] {
		return Array.from(this._edumeetConsumers.values())
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
		this.transport = props.transport;
		this.config = props.config;

		this.api.on('disconnect', (reason: string) => {
		});

		this.api.on('notification:newConsumer', (payload) => this.addConsumer(payload));
		this.api.on('notification:peerClosed', ({ peerId }) => {
			for (const consumer of this.findPeerConsumers(peerId)) {
				this.closeConsumer(consumer.id);
			}
		});
		this.api.on('notification:consumerClosed', ({ consumerId }) => {
			this.closeConsumer(consumerId);
		});
		this.api.on('notification:consumerPaused', ({ consumerId }) => {
			const consumer = this._mediasoupConsumers.get(consumerId);

			if (consumer) this.pauseConsumer(consumer, 'remote');
		});
		this.api.on('notification:consumerResumed', ({ consumerId }) => {
			const consumer = this._mediasoupConsumers.get(consumerId);

			if (consumer) this.resumeConsumer(consumer, { originator: 'remote' });
		});
		this.api.on('notification:consumerLayersChanged', ({ consumerId, spatialLayer, temporalLayer }) => {
			this.updateConsumer(consumerId, {
				currentSpatialLayer  : spatialLayer,
				currentTemporalLayer : temporalLayer
			});
		});
		this.api.on('notification:consumerScore', ({ consumerId, score }) => {
			this.updateConsumer(consumerId, { score: score.score })
		})
	}
	private findPeerConsumers(peerId: string): ConsumerExtended[] {
		const consumers = Array.from(this._mediasoupConsumers.values());

		return consumers.filter((consumer) => consumer.appData.peerId === peerId);
	}
	private findPeerConsumer(peerId: string, type: 'mic'|'webcam'|'screen'): ConsumerExtended|undefined {
		const consumers = this.findPeerConsumers(peerId);

		return consumers.find((consumer) => consumer.appData.source === type);
	}
	private updateConsumer(consumerId: string, changes: Partial<IEdumeetConsumer>) {
		const consumer = this._edumeetConsumers.get(consumerId);

		if (!consumer) throw new Error('could not find consumer');
		Object.assign(consumer, changes);
		this.emit('consumerUpdate', {
			id : consumerId,
			...changes
		});
	}

	async updateDevices() {
		const audioDevices: {[deviceId: string]: MediaDeviceInfo} = {};
		const devices = await navigator.mediaDevices.enumerateDevices();

		for (const device of devices) {
			if (device.kind == 'audiooutput') {
				audioDevices[device.deviceId] = device;
			}
		}
		if (!stringArrayEqual(Object.keys(audioDevices), Object.keys(this._audioDevices))) {
			this.emit('audioDevicesUpdate', {
				devices : audioDevices
			});
		}
		this._audioDevices = audioDevices;
	}
	getAudioDevice(deviceId?: string): MediaDeviceInfo|undefined {
		if (deviceId) return this._audioDevices[deviceId];
		const ids = Object.keys(this._audioDevices);

		return this._audioDevices[ids[0]];
	}

	async addConsumer({
		peerId,
		producerId,
		id,
		kind,
		rtpParameters,
		type,
		appData,
		producerPaused,
		score
	}: INotificationNewConsumer) {
		if (!this.transport.recv) {
			throw new Error('recv transport not started');
		}
		const consumer = await this.transport.recv.consume(
			{
				id,
				producerId,
				kind,
				rtpParameters,
				appData : { ...appData, peerId } // Trick.
			}) as ConsumerExtended;


		if (this.transport.recv.appData.encodedInsertableStreams) {
			if(!consumer.rtpReceiver) {
				throw new Error('Could not decode insertable stream. RTPReceiver is undefined')
			}
			const { opusDetailsEnabled } = this.config

			if (kind === 'audio' && opusDetailsEnabled)
				opusReceiverTransform(consumer.rtpReceiver, (opusConfig) => {
					this.emit('consumerOpusConfigChange', { 
						id: consumer.id,
						opusConfig
					});
				});
			else
				directReceiverTransform(consumer.rtpReceiver);
		}


		// Store in the map.
		this._mediasoupConsumers.set(consumer.id, consumer);

		consumer.on('transportclose', () => {
			this._mediasoupConsumers.delete(consumer.id);
			this._edumeetConsumers.delete(consumer.id);
		});

		const { spatialLayers, temporalLayers } = mediasoupClient.parseScalabilityMode(
			consumer.rtpParameters.encodings?.[0].scalabilityMode
		);

		const edumeetConsumer: IEdumeetConsumer = {
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

		this._edumeetConsumers.set(consumer.id, edumeetConsumer);
		this.emit('consumerAdded', edumeetConsumer);

		await this.resumeConsumer(consumer, { initial: true });

		if (kind === 'audio') {
			let lastVolume = 0;

			const stream = new MediaStream();

			stream.addTrack(consumer.track);

			if (!stream.getAudioTracks()[0])
				throw new Error('request.newConsumer | given stream has no audio track');

			consumer.hark = hark(stream, { play: false, interval: 100 });

			consumer.hark.on('volume_change', (volume) => {
				volume = Math.round(volume);

				// TODO: also update only on significant changes like with micProducer?
				if (consumer && volume !== lastVolume) {
					lastVolume = volume;

					this.emit('peerVolumeChange', { peerId, volume });
				}
			});
		}
	}

	/* TODO private*/ async pauseConsumer(consumer: mediasoupClient.types.Consumer, originator:'remote'|'local' = 'local') {
		logger.debug('pauseConsumer() [consumer:"%o"]', consumer);

		if (consumer.paused || consumer.closed) return;

		try {
			if (originator !== 'remote') {
				await this.api.pauseConsumer({ consumerId: consumer.id });
			}
			consumer.pause();
			this.emit('consumerPaused', { id: consumer.id, originator });
		} catch (error) {
			logger.error('_pauseConsumer() [consumerId: %s; error:"%o"]', consumer.id, error);
			if (error.notFoundInMediasoupError) {
				this.closeConsumer(consumer.id);
			}
		}
	}
	/* TODO private*/ async resumeConsumer(
		consumer: mediasoupClient.types.Consumer,
		{ initial = false, originator = 'local' }: { initial?: boolean, originator?: 'local'|'remote' } = {}) {
		logger.debug('resumeConsumer() [consumer:"%o"]', consumer);

		if ((!initial && !consumer.paused) || consumer.closed)
			return;

		try {
			consumer.resume();
			if (originator !== 'remote') {
				await this.api.resumeConsumer({ consumerId: consumer.id });
			}
			this.emit('consumerResumed', { id: consumer.id, originator: originator });
		} catch (error) {
			logger.error('resumeConsumer() [consumerId: %s; error:"%o"]', consumer.id, error);
			if (error.notFoundInMediasoupError) {
				this.closeConsumer(consumer.id);
			}
		}
	}

	/* TODO private*/ async closeConsumer(consumerId: string) {
		const consumer = this._mediasoupConsumers.get(consumerId);

		if (!consumer) return;
		consumer.close();

		if (consumer.hark) consumer.hark.stop();

		this._mediasoupConsumers.delete(consumerId);
		this._edumeetConsumers.delete(consumerId);

		const { peerId } = consumer.appData;

		this.emit('consumerRemoved', { id: consumerId, peerId: peerId });
	}

	async setEnabledVideoPeers(peerIds: string[]) {
		for (const consumer of Array.from(this._mediasoupConsumers.values())) {
			if (consumer.kind !== 'video') continue;

			if (peerIds.includes(consumer.appData.peerId)) {
				await this.resumeConsumer(consumer);
			} else {
				await this.pauseConsumer(consumer);

				this.emit('selectedPeerRemoved', { peerId: consumer.appData.peerId });
			}
		}
	}

	async mutePeerConsumer(peerId: string, type: 'mic'|'webcam'|'screen') {
		const consumer = this.findPeerConsumer(peerId, type);

		if (consumer) await this.pauseConsumer(consumer);
	}
	async unmutePeerConsumer(peerId: string, type: 'mic'|'webcam'|'screen') {
		const consumer = this.findPeerConsumer(peerId, type);

		if (consumer) await this.resumeConsumer(consumer);
	}

	async setConsumerPreferredLayers(consumerId: string, spatialLayer: number, temporalLayer: number) {
		logger.debug(
			'setConsumerPreferredLayers() [consumerId:"%s", spatialLayer:"%s", temporalLayer:"%s"]',
			consumerId, spatialLayer, temporalLayer);
		try {
			const consumer = this._edumeetConsumers.get(consumerId);

			if (!consumer) throw new Error('consumer not found');
			await this.api.setConsumerPreferedLayers({ consumerId, spatialLayer, temporalLayer });
			this.updateConsumer(consumerId, {
				preferredSpatialLayer  : spatialLayer,
				preferredTemporalLayer : temporalLayer
			});
		} catch (error) {
			logger.error('setConsumerPreferredLayers() [consumerId: %s; error:"%o"]', consumerId, error);
			if (error.notFoundInMediasoupError) {
				this.closeConsumer(consumerId);
			}
		}
	}
	async setConsumerPreferredLayersMax(consumerId: string) {
		const consumer = this._edumeetConsumers.get(consumerId);

		if (!consumer || consumer.type === 'simple') {
			return;
		}

		logger.debug(
			'setConsumerPreferredLayersMax() [consumerId:"%s"]', consumer.id);

		if (consumer.preferredSpatialLayer !== consumer.spatialLayers -1 ||
								consumer.preferredTemporalLayer !== consumer.temporalLayers -1) {
			return await this.setConsumerPreferredLayers(consumer.id,
				consumer.spatialLayers - 1, consumer.temporalLayers - 1);
		}
	}
	async adaptConsumerPreferredLayers(consumerId: string, viewportWidth: number, viewportHeight: number) {
		const consumer = this._edumeetConsumers.get(consumerId);

		if (!consumer || consumer.type === 'simple') {
			return;
		}
		if (!viewportWidth || !viewportHeight) {
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

		if (!resolutionScalings) throw new Error('resolutionScalings are missing');

		const adaptiveScalingFactor = this.config.simulcast.adaptiveScalingFactor;

		logger.debug(
			'adaptConsumerPreferredLayers() [consumerId:"%s", width:"%d", height:"%d" resolutionScalings:[%s] viewportWidth:"%d", viewportHeight:"%d"]',
			consumer.id, width, height, resolutionScalings.join(', '),
			viewportWidth, viewportHeight);

		let newPreferredSpatialLayer = 0;

		for (let i = 0; i < resolutionScalings.length; i++) {
			const levelWidth = adaptiveScalingFactor * width / resolutionScalings[i];
			const levelHeight = adaptiveScalingFactor * height / resolutionScalings[i];

			if (viewportWidth >= levelWidth || viewportHeight >= levelHeight) {
				newPreferredSpatialLayer = i;
			} else {
				break;
			}
		}

		let newPreferredTemporalLayer = consumer.temporalLayers - 1;

		if (newPreferredSpatialLayer === 0 && newPreferredTemporalLayer > 0) {
			const lowestLevelWidth = width / resolutionScalings[0];
			const lowestLevelHeight = height / resolutionScalings[0];

			if (viewportWidth < lowestLevelWidth * 0.5
												&& viewportHeight < lowestLevelHeight * 0.5) {
				newPreferredTemporalLayer -= 1;
			}
			if (newPreferredTemporalLayer > 0
													&& viewportWidth < lowestLevelWidth * 0.25
													&& viewportHeight < lowestLevelHeight * 0.25) {
				newPreferredTemporalLayer -= 1;
			}
		}

		if (preferredSpatialLayer !== newPreferredSpatialLayer ||
													preferredTemporalLayer !== newPreferredTemporalLayer) {
			return await this.setConsumerPreferredLayers(id,
				newPreferredSpatialLayer, newPreferredTemporalLayer);
		}
	}
	async setPriority(consumerId: string, priority: number) {
		logger.debug(
			'setPriority() [consumerId:"%s", priority:%d]',
			consumerId, priority);

		try {
			await this.api.setConsumerPriority({ consumerId, priority });
			this.updateConsumer(consumerId, {
				id       : consumerId,
				priority : priority
			});
		} catch (error) {
			logger.error('setPriority() [consumerId: %s; error:"%o"]', consumerId, error);
			if (error.notFoundInMediasoupError) {
				this.closeConsumer(consumerId);
			}
		}
	}
	async requestConsumerKeyFrame(consumerId: string) {
		logger.debug('requestConsumerKeyFrame() [consumerId:"%s"]', consumerId);

		try {
			await this.api.requestConsumerKeyFrame({ consumerId });
		} catch (error) {
			logger.error('requestConsumerKeyFrame() [consumerId: %s; error:"%o"]', consumerId, error);
			if (error.notFoundInMediasoupError) {
				this.closeConsumer(consumerId);
			}
		}
	}
}
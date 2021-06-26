import { EventEmitterTyped, IEventsDescriptor } from './EventEmitter';
import Logger from './Logger';
import { arraysEqual } from './utils'
import type Room from './Room'
import { IEdumeetConsumer } from './types';
const logger = new Logger('Spotlight');

interface SpotlightEvents extends IEventsDescriptor {
	update: (payload: {currentSpotlights: string[]}) => void
}

export default class Spotlights extends EventEmitterTyped<SpotlightEvents> {
	private _maxSpotlights: number 
	private _peerList: string[] = []
	private _activeVideoConsumers: Array<{
		consumerId     : string,
		peerId         : string,
		remotelyPaused : boolean
	}> = [];
	private _selectedSpotlights: string[] = []
	private _currentSpotlights: string[] = []
	private _hideNoVideoParticipants: boolean = false

	constructor(maxSpotlights: number, hideNoVideoParticipants: boolean, room: Room) {
		super()
		this._maxSpotlights = maxSpotlights;
		this._hideNoVideoParticipants = hideNoVideoParticipants;

		room.on('disconnect', () => {
			this.clearSpotlights();
		})
		room.on('peerJoined', ({ peer, initial }) => {
			if(peer.isInLobby) return
			this.addPeers([ peer.id ]);
		})
		room.on('peerLeft', ({ peerId }) => {
			this.closePeer(peerId);
		});
		room.on('activeSpeaker', ({ peerId }) => {
			if (peerId && peerId !== room.getMyPeerId()) {
				this.handleActiveSpeaker(peerId);
			}
		});
		room.consumers.on('consumerAdded', (consumer) => {
			this.addVideoConsumer(consumer);
		})
		room.consumers.on('consumerPaused', (consumer) => {
			this.pauseVideoConsumer(consumer.id);
		})
		room.consumers.on('consumerResumed', (consumer) => {
			this.resumeVideoConsumer(consumer.id);
		})
		room.consumers.on('consumerRemoved', (consumer) => {
			this.removeVideoConsumer(consumer.id)
		})
	}
	
	addPeers(peers: string[]) {
		for (const peerId of peers) {
			if (!this._peerList.includes(peerId)) {
				logger.debug('adding peer [peerId: "%s"]', peerId);
				this._peerList.push(peerId);
			}
		}
		this._spotlightsUpdated();
	}
	
	peerInSpotlights(peerId: string) {
		return this._currentSpotlights.includes(peerId)
	}
	
	addPeerToSelectedSpotlights(peerId: string) {
		logger.debug('addPeerToSpotlight() [peerId:"%s"]', peerId);
		
		this._selectedSpotlights = [ ...this._selectedSpotlights, peerId ];
		this._spotlightsUpdated();
	}
	
	removePeerFromSelectedSpotlights(peerId: string) {
		logger.debug('removePeerSpotlight() [peerId:"%s"]', peerId);
		
		this._selectedSpotlights =
		this._selectedSpotlights.filter((peer) =>
		peer !== peerId);
		
		this._spotlightsUpdated();
	}

	clearPeersFromSelectedSpotlights()
	{
		logger.debug('clearPeersFromSpotlights()');

		this._selectedSpotlights = [];

		this._spotlightsUpdated();
	}
	
	clearSpotlights() {
		this._peerList = [];
		this._activeVideoConsumers = [];
		this._selectedSpotlights = [];
		this._currentSpotlights = [];
	}
	closePeer(peerId: string) {
		logger.debug('room "peerClosed" event [peerId:%o]', peerId);
		
		this._peerList = this._peerList.filter((peer) => peer !== peerId);
		this._activeVideoConsumers = this._activeVideoConsumers.filter((consumer) =>
			consumer.peerId !== peerId);
		this._selectedSpotlights = this._selectedSpotlights.filter((peer) => peer !== peerId);
		this._spotlightsUpdated();
	}
		
	addSpeakerList(speakerList: string[]) {
		this._peerList = Array.from(new Set([ ...speakerList, ...this._peerList ]))
		this._spotlightsUpdated();
	}
		
	handleActiveSpeaker(peerId: string) {
		logger.debug('handleActiveSpeaker() [peerId:"%s"]', peerId);
		
		const index = this._peerList.indexOf(peerId);
		
		if (index > -1) {
			this._peerList.splice(index, 1);
			this._peerList = [ peerId ].concat(this._peerList);
			
			this._spotlightsUpdated();
		}
	}
	
	addVideoConsumer(newConsumer: IEdumeetConsumer)
	{
		if (newConsumer.kind === 'video' && (newConsumer.source === 'webcam' ||
			newConsumer.source === 'extravideo' || newConsumer.source === 'screen') &&
			this._activeVideoConsumers.findIndex((consumer) =>
				consumer.consumerId === newConsumer.id) === -1)
		{
			this._activeVideoConsumers.push({
				consumerId     : newConsumer.id,
				peerId         : newConsumer.peerId,
				remotelyPaused : newConsumer.remotelyPaused });

			this._spotlightsUpdated();
		}
	}

	removeVideoConsumer(consumerId: string)
	{
		const oldLength = this._activeVideoConsumers.length;

		this._activeVideoConsumers = this._activeVideoConsumers.filter((consumer) =>
			consumer.consumerId !== consumerId);

		if (oldLength !== this._activeVideoConsumers.length)
			this._spotlightsUpdated();
	}

	resumeVideoConsumer(consumerId: string)
	{
		const videoConsumer = this._activeVideoConsumers.find((consumer) =>
			consumer.consumerId === consumerId);

		if (videoConsumer)
		{
			videoConsumer.remotelyPaused = false;
			this._spotlightsUpdated();
		}
	}

	pauseVideoConsumer(consumerId: string)
	{
		const videoConsumer = this._activeVideoConsumers.find((consumer) =>
			consumer.consumerId === consumerId);

		if (videoConsumer)
		{
			videoConsumer.remotelyPaused = true;
			this._spotlightsUpdated();
		}
	}

	private _hasActiveVideo(peerId: string)
	{
		if (this._activeVideoConsumers.findIndex((consumer) =>
			consumer.peerId === peerId && !consumer.remotelyPaused) !== -1)
		{
			return true;
		}

		return false;
	}


	private _spotlightsUpdated() {
		this.emit('update', {
			currentSpotlights: this._peerList
		})
		// let spotlights;
		
		// if (this._hideNoVideoParticipants)
		// {
		// 	spotlights = this._peerList.filter((peerId) =>
		// 		this._hasActiveVideo(peerId));
		// }
		// else
		// {
		// 	spotlights = this._peerList;
		// }

		
		// while (this._selectedSpotlights.length > this._maxSpotlights) {
		// 	this._selectedSpotlights.shift();
		// }
		
		// if (this._selectedSpotlights.length > 0)
		// {
		// 	spotlights = [ ...new Set([ ...this._selectedSpotlights, ...spotlights ]) ];
		// }
		
		// if (!arraysEqual(this._currentSpotlights, spotlights.slice(0, this._maxSpotlights))) {
		// 	logger.debug('_spotlightsUpdated() | spotlights updated, emitting');

		// 	this._currentSpotlights = spotlights.slice(0, this._maxSpotlights);
		// 	this.emit('update', {
		// 		currentSpotlights: this._currentSpotlights
		// 	})
		// }  else {
		// 	logger.debug('_spotlightsUpdated() | spotlights not updated');
		// }
	}
		
	
	get hideNoVideoParticipants()
	{
		return this._hideNoVideoParticipants;
	}

	set hideNoVideoParticipants(hideNoVideoParticipants)
	{
		const oldHideNoVideoParticipants = this._hideNoVideoParticipants;

		this._hideNoVideoParticipants = hideNoVideoParticipants;

		if (oldHideNoVideoParticipants !== this._hideNoVideoParticipants)
			this._spotlightsUpdated();
	}

	get maxSpotlights(): number {
		return this._maxSpotlights;
	}
	
	set maxSpotlights(maxSpotlights: number) {
		const oldMaxSpotlights = this._maxSpotlights;
		
		this._maxSpotlights = maxSpotlights;
		
		if (oldMaxSpotlights !== this._maxSpotlights)
		this._spotlightsUpdated();
	}
}
	
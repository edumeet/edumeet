import Logger from './Logger';

const logger = new Logger('Spotlight');

export default class Spotlights
{
	constructor(maxSpotlights, hideNoVideoParticipants, roomClient)
	{
		this._maxSpotlights = maxSpotlights;
		this._peerList = [];
		this._activeVideoConsumers = [];
		this._selectedSpotlights = [];
		this._currentSpotlights = [];
		this._roomClient = roomClient;
		this._hideNoVideoParticipants = hideNoVideoParticipants;
	}

	addPeers(peers)
	{
		for (const peer of peers)
		{
			if (this._peerList.indexOf(peer.id) === -1)
			{
				logger.debug('adding peer [peerId: "%s"]', peer.id);
				this._peerList.push(peer.id);
			}
		}
		this._spotlightsUpdated();
	}

	peerInSpotlights(peerId)
	{
		return this._currentSpotlights.indexOf(peerId) !== -1;
	}

	addPeerToSelectedSpotlights(peerId)
	{
		logger.debug('addPeerToSpotlight() [peerId:"%s"]', peerId);

		this._selectedSpotlights = [ ...this._selectedSpotlights, peerId ];
		this._spotlightsUpdated();
	}

	removePeerFromSelectedSpotlights(peerId)
	{
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

	clearSpotlights()
	{
		this._peerList = [];
		this._activeVideoConsumers = [];
		this._selectedSpotlights = [];
		this._currentSpotlights = [];
	}

	newPeer(id)
	{
		logger.debug(
			'room "newpeer" event [id: "%s"]', id);

		if (this._peerList.indexOf(id) === -1) // We don't have this peer in the list
		{
			logger.debug('_handlePeer() | adding peer [peerId: "%s"]', id);

			this._peerList.push(id);

			this._spotlightsUpdated();
		}
	}

	closePeer(id)
	{
		logger.debug(
			'room "peerClosed" event [peerId:%o]', id);

		this._peerList = this._peerList.filter((peer) => peer !== id);
		this._activeVideoConsumers = this._activeVideoConsumers.filter((consumer) =>
			consumer.peerId !== id);
		this._selectedSpotlights = this._selectedSpotlights.filter((peer) => peer !== id);
		this._spotlightsUpdated();
	}

	addSpeakerList(speakerList)
	{
		this._peerList = [ ...new Set([ ...speakerList, ...this._peerList ]) ];
		this._spotlightsUpdated();
	}

	handleActiveSpeaker(peerId)
	{
		logger.debug('handleActiveSpeaker() [peerId:"%s"]', peerId);

		const index = this._peerList.indexOf(peerId);

		if (index > -1)
		{
			this._peerList.splice(index, 1);
			this._peerList = [ peerId ].concat(this._peerList);

			this._spotlightsUpdated();
		}
	}

	addVideoConsumer(newConsumer)
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

	removeVideoConsumer(consumerId)
	{
		const oldLength = this._activeVideoConsumers.length;

		this._activeVideoConsumers = this._activeVideoConsumers.filter((consumer) =>
			consumer.consumerId !== consumerId);

		if (oldLength !== this._activeVideoConsumers.length)
			this._spotlightsUpdated();
	}

	resumeVideoConsumer(consumerId)
	{
		const videoConsumer = this._activeVideoConsumers.find((consumer) =>
			consumer.consumerId === consumerId);

		if (videoConsumer)
		{
			videoConsumer.remotelyPaused = false;
			this._spotlightsUpdated();
		}
	}

	pauseVideoConsumer(consumerId)
	{
		const videoConsumer = this._activeVideoConsumers.find((consumer) =>
			consumer.consumerId === consumerId);

		if (videoConsumer)
		{
			videoConsumer.remotelyPaused = true;
			this._spotlightsUpdated();
		}
	}

	_hasActiveVideo(peerId)
	{
		if (this._activeVideoConsumers.findIndex((consumer) =>
			consumer.peerId === peerId && !consumer.remotelyPaused) !== -1)
		{
			return true;
		}

		return false;
	}

	_spotlightsUpdated()
	{
		let spotlights;

		if (this._hideNoVideoParticipants)
		{
			spotlights = this._peerList.filter((peerId) =>
				this._hasActiveVideo(peerId));
		}
		else
		{
			spotlights = this._peerList;
		}

		while (this._selectedSpotlights.length > this._maxSpotlights)
		{
			this._selectedSpotlights.shift();
		}

		if (this._selectedSpotlights.length > 0)
		{
			spotlights = [ ...new Set([ ...this._selectedSpotlights, ...spotlights ]) ];
		}

		if (!this._arraysEqual(
			this._currentSpotlights, spotlights.slice(0, this._maxSpotlights)))
		{
			logger.debug('_spotlightsUpdated() | spotlights updated, emitting');

			this._currentSpotlights = spotlights.slice(0, this._maxSpotlights);
			this._roomClient.updateSpotlights(this._currentSpotlights);
		}
		else
		{
			logger.debug('_spotlightsUpdated() | spotlights not updated');
		}

	}

	_arraysEqual(arr1, arr2)
	{
		if (arr1.length !== arr2.length)
			return false;

		for (let i = arr1.length; i--;)
		{
			if (arr1[i] !== arr2[i])
				return false;
		}

		return true;
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

	get maxSpotlights()
	{
		return this._maxSpotlights;
	}

	set maxSpotlights(maxSpotlights)
	{
		const oldMaxSpotlights = this._maxSpotlights;

		this._maxSpotlights = maxSpotlights;

		if (oldMaxSpotlights !== this._maxSpotlights)
			this._spotlightsUpdated();
	}
}

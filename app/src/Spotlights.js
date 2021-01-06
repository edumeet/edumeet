import Logger from './Logger';
import { makePeerConsumerSelector } from './components/Selectors';

const logger = new Logger('Spotlight');

export default class Spotlights
{
	constructor(maxSpotlights, roomClient)
	{
		this._maxSpotlights = maxSpotlights;
		this._peerList = [];
		this._selectedSpotlights = [];
		this._currentSpotlights = [];
		this._roomClient = roomClient;
		this._consumersStoreUnsubscriber = null;
		this._hideNoVideoParticipantsStoreUnsubscriber = null;
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

	addPeerToSpotlight(peerId)
	{
		logger.debug('addPeerToSpotlight() [peerId:"%s"]', peerId);

		this._selectedSpotlights = [ ...this._selectedSpotlights, peerId ];
		this._spotlightsUpdated();
	}

	removePeerSpotlight(peerId)
	{
		logger.debug('removePeerSpotlight() [peerId:"%s"]', peerId);

		this._selectedSpotlights =
			this._selectedSpotlights.filter((peer) =>
				peer !== peerId);

		this._spotlightsUpdated();
	}

	clearSpotlights()
	{
		this._peerList = [];
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

	_hasVideoContent(state, getPeerConsumers)
	{
		return function(peerId, index, array)
		{
			const peer = state.peers[peerId];

			if (peer)
			{
				const consumers = { ...getPeerConsumers(state, peerId) };

				const videoVisible = (
					Boolean(consumers.webcamConsumer) &&
					!consumers.webcamConsumer.remotelyPaused
				);

				const screenVisible = (
					Boolean(consumers.screenConsumer) &&
					!consumers.screenConsumer.remotelyPaused
				);

				if (videoVisible || screenVisible)
				{
					return true;
				}
			}

			return false;
		};
	}

	_spotlightsUpdated()
	{
		const getPeerConsumers = makePeerConsumerSelector();

		const state = this._roomClient.getState();

		let spotlights;

		if (state.settings.hideNoVideoParticipants)
		{
			spotlights = this._peerList.filter(
				this._hasVideoContent(state, getPeerConsumers));
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

	onStoreChanged(that, newVal, oldVal, objectPath)
	{
		switch (objectPath)
		{
			case 'consumers':
			case 'settings.hideNoVideoParticipants':
			{
				that._spotlightsUpdated();
				break;
			}
		}
	}

	createStoreSubscribers()
	{
		this.removeStoreSubscribers();
		this._consumersStoreUnsubscriber = this._roomClient.subscribeStoreWatch(
			'consumers', this);
		this._hideNoVideoParticipantsStoreUnsubscriber = this._roomClient.subscribeStoreWatch(
			'settings.hideNoVideoParticipants', this);
	}

	removeStoreSubscribers()
	{
		if (this._consumersStoreUnsubscriber)
		{
			this._consumersStoreUnsubscriber();
		}

		if (this._hideNoVideoParticipantsStoreUnsubscriber)
		{
			this._hideNoVideoParticipantsStoreUnsubscriber();
		}
	}

}

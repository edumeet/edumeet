import { EventEmitter } from 'events';
import Logger from './Logger';

const logger = new Logger('Spotlight');

export default class Spotlights extends EventEmitter
{
	constructor(maxSpotlights, signalingSocket)
	{
		super();

		this._signalingSocket = signalingSocket;
		this._maxSpotlights = maxSpotlights;
		this._peerList = [];
		this._selectedSpotlights = [];
		this._currentSpotlights = [];
		this._started = false;
	}

	start()
	{
		this._handleSignaling();

		this._started = true;
		this._spotlightsUpdated();
	}

	addPeers(peers)
	{
		for (const peer of peers)
		{
			this._newPeer(peer.id);
		}
	}

	peerInSpotlights(peerId)
	{
		if (this._started)
		{
			return this._currentSpotlights.indexOf(peerId) !== -1;
		}
		else
		{
			return false;
		}
	}

	setPeerSpotlight(peerId)
	{
		logger.debug('setPeerSpotlight() [peerId:"%s"]', peerId);

		const index = this._selectedSpotlights.indexOf(peerId);
		
		if (index !== -1)
		{
			this._selectedSpotlights = [];
		}
		else
		{
			this._selectedSpotlights = [ peerId ];
		}

		/*
		if (index === -1) // We don't have this peer in the list, adding
		{
			this._selectedSpotlights.push(peerId);
		}
		else // We have this peer, remove
		{
			this._selectedSpotlights.splice(index, 1);
		}
		*/

		if (this._started)
			this._spotlightsUpdated();
	}

	_handleSignaling()
	{
		this._signalingSocket.on('notification', (notification) =>
		{
			if (notification.method === 'newPeer')
			{
				const { id } = notification.data;

				this._newPeer(id);
			}

			if (notification.method === 'peerClosed')
			{
				const { peerId } = notification.data;

				this._closePeer(peerId);
			}
		});
	}

	_newPeer(id)
	{
		logger.debug(
			'room "newpeer" event [id: "%s"]', id);
		
		if (this._peerList.indexOf(id) === -1) // We don't have this peer in the list
		{
			logger.debug('_handlePeer() | adding peer [peerId: "%s"]', id);

			this._peerList.push(id);

			if (this._started)
				this._spotlightsUpdated();
		}
	}

	_closePeer(id)
	{
		logger.debug(
			'room "peerClosed" event [peerId:%o]', id);

		let index = this._peerList.indexOf(id);

		if (index !== -1) // We have this peer in the list, remove
		{
			this._peerList.splice(index, 1);
		}

		index = this._selectedSpotlights.indexOf(id);

		if (index !== -1) // We have this peer in the list, remove
		{
			this._selectedSpotlights.splice(index, 1);
		}

		if (this._started)
			this._spotlightsUpdated();
	}

	addSpeakerList(speakerList)
	{
		this._peerList = [ ...new Set([ ...speakerList, ...this._peerList ]) ];

		if (this._started)
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

	_spotlightsUpdated()
	{
		let spotlights;

		if (this._selectedSpotlights.length > 0)
		{
			spotlights = [ ...new Set([ ...this._selectedSpotlights, ...this._peerList ]) ];
		}
		else
		{
			spotlights = this._peerList;
		}

		if (
			!this._arraysEqual(
				this._currentSpotlights, spotlights.slice(0, this._maxSpotlights)
			)
		)
		{
			logger.debug('_spotlightsUpdated() | spotlights updated, emitting');

			this._currentSpotlights = spotlights.slice(0, this._maxSpotlights);
			this.emit('spotlights-updated', this._currentSpotlights);
		}
		else
			logger.debug('_spotlightsUpdated() | spotlights not updated');
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
}

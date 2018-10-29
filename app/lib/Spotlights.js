import { EventEmitter } from 'events';
import Logger from './Logger';

const logger = new Logger('Spotlight');

export default class Spotlights extends EventEmitter
{
	constructor(maxSpotlights, room)
	{
		super();

		this._room = room;
		this._maxSpotlights = maxSpotlights;
		this._peerList = [];
		this._currentSpotlights = [];
		this._started = false;
	}

	start()
	{
		const peers = this._room.peers;

		for (const peer of peers)
		{
			this._handlePeer(peer);
		}

		this._handleRoom();

		this._started = true;
		this._spotlightsUpdated();
	}

	peerInSpotlights(peerName)
	{
		if (this._started)
		{
			return this._currentSpotlights.indexOf(peerName) !== -1;
		}
		else
		{
			return false;
		}
	}

	_handleRoom()
	{
		this._room.on('newpeer', (peer) =>
		{
			logger.debug(
				'room "newpeer" event [name:"%s", peer:%o]', peer.name, peer);
			this._handlePeer(peer);
		});
	}

	addSpeakerList(speakerList)
	{
		this._peerList = [ ...new Set([ ...speakerList, ...this._peerList ]) ];

		if (this._started)
			this._spotlightsUpdated();
	}

	_handlePeer(peer)
	{
		logger.debug('_handlePeer() [peerName:"%s"]', peer.name);

		if (this._peerList.indexOf(peer.name) === -1) // We don't have this peer in the list
		{
			peer.on('close', () =>
			{
				const index = this._peerList.indexOf(peer.name);

				if (index > -1) // We have this peer in the list, remove
				{
					this._peerList.splice(index, 1);

					this._spotlightsUpdated();
				}
			});

			logger.debug('_handlePeer() | adding peer [peerName:"%s"]', peer.name);

			this._peerList.push(peer.name);

			this._spotlightsUpdated();
		}
	}

	handleActiveSpeaker(peerName)
	{
		logger.debug('handleActiveSpeaker() [peerName:"%s"]', peerName);

		const index = this._peerList.indexOf(peerName);

		if (index > -1)
		{
			this._peerList.splice(index, 1);
			this._peerList = [ peerName ].concat(this._peerList);

			this._spotlightsUpdated();
		}
	}

	_spotlightsUpdated()
	{
		if (
			!this._arraysEqual(
				this._currentSpotlights, this._peerList.slice(0, this._maxSpotlights)
			)
		)
		{
			logger.debug('_spotlightsUpdated() | spotlights updated, emitting');

			this._currentSpotlights = this._peerList.slice(0, this._maxSpotlights);
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

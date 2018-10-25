import { EventEmitter } from 'events';
import Logger from './Logger';

const logger = new Logger('LastN');

export default class LastN extends EventEmitter
{
	constructor(lastNCount, room)
	{
		super();

		this._room = room;
		this._lastNCount = lastNCount;
		this._peerList = [];
		this._currentLastN = [];
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
		this._lastNUpdated();
	}

	_handleRoom()
	{
		this._room.on('newpeer', (peer) =>
		{
			logger.debug(
				'lastN room "newpeer" event [name:"%s", peer:%o]', peer.name, peer);
			this._handlePeer(peer);
		});
	}

	addSpeakerList(speakerList)
	{
		this._peerList = [ ...new Set([ ...speakerList, ...this._peerList ]) ];

		if (this._started)
			this._lastNUpdated();
	}

	_handlePeer(peer)
	{
		logger.debug('_lastN _handlePeer() [peerName:"%s"]', peer.name);

		if (this._peerList.indexOf(peer.name) === -1) // We don't have this peer in the list
		{
			peer.on('close', () =>
			{
				const index = this._peerList.indexOf(peer.name);

				if (index > -1) // We have this peer in the list, remove
				{
					this._peerList.splice(index, 1);

					this._lastNUpdated();
				}
			});

			logger.debug('_handlePeer() | adding peer [peerName:"%s"]', peer.name);

			this._peerList.push(peer.name);

			this._lastNUpdated();
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

			this._lastNUpdated();
		}
	}

	_lastNUpdated()
	{
		if (
			!this._arraysEqual(
				this._currentLastN, this._peerList.slice(0, this._lastNCount)
			)
		)
		{
			logger.debug('_lastNUpdated() | lastN is updated, emitting');

			this._currentLastN = this._peerList.slice(0, this._lastNCount);
			this.emit('lastn-updated', this._currentLastN);
		}
		else
			logger.debug('_lastNUpdated() | lastN not updated');
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

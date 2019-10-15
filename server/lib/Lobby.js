'use strict';

const EventEmitter = require('events').EventEmitter;
const Logger = require('./Logger');

const logger = new Logger('Lobby');

class Lobby extends EventEmitter
{
	constructor()
	{
		logger.info('constructor()');

		super();

		this._peers = new Map();
	}

	close()
	{
		logger.info('close()');

		// Close the peers
		if (this._peers)
		{
			this._peers.forEach((peer) =>
			{
				if (peer.socket)
					peer.socket.disconnect();
			});
		}

		this._peers.clear();
	}

	peerList()
	{
		logger.info('peerList()');

		return this._peers;
	}

	promoteAllPeers()
	{
		logger.info('promoteAllPeers()');

		if (this._peers)
		{
			this._peers.forEach((peer) =>
			{
				if (peer.socket)
					this.promotePeer(peer.peerId);
			});
		}
	}

	promotePeer(peerId)
	{
		logger.info('promotePeer() [peerId: %s]', peerId);

		const peer = this._peers.get(peerId);

		this._peers.delete(peerId);

		this.emit('promotePeer', peer);
	}

	parkPeer({ peerId, consume, socket })
	{
		logger.info('parkPeer()');

		const peer = { peerId, socket, consume };

		socket.emit('notification', { method: 'enteredLobby', data: {} });

		this._peers.set(peerId, peer);
	}
}

module.exports = Lobby;
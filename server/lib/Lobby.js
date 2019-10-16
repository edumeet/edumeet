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

		// Closed flag.
		this._closed = false;

		this._peers = new Map();
	}

	close()
	{
		logger.info('close()');

		this._closed = true;

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

		this.emit('promotePeer', peer);

		this._peers.delete(peerId);
	}

	parkPeer({ peerId, consume, socket })
	{
		logger.info('parkPeer()');

		const peer = { peerId, socket, consume };

		socket.emit('notification', { method: 'enteredLobby', data: {} });

		this._peers.set(peerId, peer);

		socket.on('request', (request, cb) =>
		{
			logger.debug(
				'Peer "request" event [method:%s, peerId:%s]',
				request.method, peer.peerId);

			this._handleSocketRequest(peer, request, cb)
				.catch((error) =>
				{
					logger.error('request failed:%o', error);

					cb(error);
				});
		});

		socket.on('disconnect', () =>
		{
			if (this._closed)
				return;

			logger.debug('Peer "close" event [peerId:%s]', peer.peerId);

			this.emit('peerClosed', peer);

			this._peers.delete(peer.peerId);
		});
	}

	async _handleSocketRequest(peer, request, cb)
	{
		switch (request.method)
		{
			case 'changeDisplayName':
			{
				const { displayName } = request.data;

				peer.displayName = displayName;

				this.emit('lobbyPeerDisplayNameChanged', peer);

				cb();

				break;
			}
		}
	}
}

module.exports = Lobby;
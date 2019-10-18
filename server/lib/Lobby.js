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

		this._peers = {};
	}

	close()
	{
		logger.info('close()');

		this._closed = true;

		Object.values(this._peers).forEach((peer) =>
		{
			if (peer.socket)
				peer.socket.disconnect();
		});

		this._peers = {};
	}

	authCallback(data, roomLocked)
	{
		logger.debug('authCallback() | [data:"%o", roomLocked:"%s"]', data, roomLocked);

		const {
			peerId,
			displayName,
			picture
		} = data;

		const peer = this._peers[peerId];

		if (peer)
		{
			this._notification(peer.socket, 'auth', {
				displayName : displayName,
				picture     : picture
			});

			if (!roomLocked)
			{
				this.promotePeer(peerId);
			}
		}
	}

	peerList()
	{
		logger.info('peerList()');

		return Object.values(this._peers).map((peer) => ({ peerId: peer.peerId, displayName: peer.displayName }));
	}

	hasPeer(peerId)
	{
		return Boolean(this._peers[peerId]);
	}

	promoteAllPeers()
	{
		logger.info('promoteAllPeers()');

		Object.values(this._peers).forEach((peer) =>
		{
			if (peer.socket)
				this.promotePeer(peer.peerId);
		});
	}

	promotePeer(peerId)
	{
		logger.info('promotePeer() [peerId: %s]', peerId);

		const peer = this._peers[peerId];

		if (peer)
		{
			this.emit('promotePeer', peer);

			delete this._peers[peerId];
		}
	}

	parkPeer({ peerId, consume, socket })
	{
		logger.info('parkPeer()');

		const peer = { peerId, socket, consume };

		socket.emit('notification', { method: 'enteredLobby', data: {} });

		this._peers[peerId] = peer;

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

			delete this._peers[peer.peerId];
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

	_notification(socket, method, data = {}, broadcast = false)
	{
		if (broadcast)
		{
			socket.broadcast.to(this._roomId).emit(
				'notification', { method, data }
			);
		}
		else
		{
			socket.emit('notification', { method, data });
		}
	}
}

module.exports = Lobby;
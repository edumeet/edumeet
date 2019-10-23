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

	checkEmpty()
	{
		logger.info('checkEmpty()');
		if (Object.keys(this._peers).length == 0)
			return true
		else return false;
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

		if ( this._closed ) return;

		const peer = { peerId, socket, consume };

		socket.emit('notification', { method: 'enteredLobby', data: {} });

		this._peers[peerId] = peer;

		socket.on('request', (request, cb) =>
		{
			logger.debug(
				'Peer "request" event [method:%s, peerId:%s]',
				request.method, peer.peerId);
			
			if (this._closed) return;
			this._handleSocketRequest(peer, request, cb)
				.catch((error) =>
				{
					logger.error('request failed:%o', error);

					cb(error);
				});
		});

		socket.on('disconnect', () =>
		{
			logger.debug('Peer "close" event [peerId:%s]', peer.peerId);

			if (this._closed) return;

			this.emit('peerClosed', peer);

			delete this._peers[peer.peerId];

			if ( this.checkEmpty() ) this.emit('lobbyEmpty');
		});
	}

	async _handleSocketRequest(peer, request, cb)
	{
		logger.debug('_handleSocketRequest [peer:%o], [request:%o]', peer, request);
		if (this._closed) return;
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
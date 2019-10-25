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

		this._peers.forEach((peer) =>
		{
			if (!peer.closed)
				peer.close();
		});

		this._peers.clear();
	}

	checkEmpty()
	{
		logger.info('checkEmpty()');
		
		return this._peers.size === 0;
	}

	peerList()
	{
		logger.info('peerList()');

		return Array.from(this._peers.values()).map((peer) =>
			({
				peerId      : peer.id,
				displayName : peer.displayName 
			}));
	}

	hasPeer(peerId)
	{
		return this._peers.has(peerId);
	}

	promoteAllPeers()
	{
		logger.info('promoteAllPeers()');

		this._peers.forEach((peer) =>
		{
			if (peer.socket)
				this.promotePeer(peer.id);
		});
	}

	promotePeer(peerId)
	{
		logger.info('promotePeer() [peer:"%s"]', peerId);

		const peer = this._peers.get(peerId);

		if (peer)
		{
			this.emit('promotePeer', peer);

			this._peers.delete(peerId);
		}
	}

	parkPeer(peer)
	{
		logger.info('parkPeer() [peer:"%s"]', peer.id);

		if (this._closed)
			return;

		this._notification(peer.socket, 'enteredLobby');

		this._peers.set(peer.id, peer);

		peer.on('authenticationChanged', () =>
		{
			logger.info('parkPeer() | authenticationChange [peer:"%s"]', peer.id);

			peer.authenticated && this.emit('peerAuthenticated', peer);
		});

		peer.on('displayNameChanged', () =>
		{
			this.emit('displayNameChanged', peer);
		});

		peer.on('pictureChanged', () =>
		{
			this.emit('pictureChanged', peer);
		});

		peer.on('close', () =>
		{
			logger.debug('Peer "close" event [peer:"%s"]', peer.id);

			if (this._closed)
				return;

			this.emit('peerClosed', peer);

			this._peers.delete(peer.id);

			if (this.checkEmpty())
				this.emit('lobbyEmpty');
		});
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
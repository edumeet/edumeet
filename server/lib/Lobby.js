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
			peer.socket.removeListener('request', peer.socketRequestHandler);
			peer.removeListener('rolesChange', peer.roleChangeHandler);
			peer.removeListener('displayNameChanged', peer.displayNameChangeHandler);
			peer.removeListener('pictureChanged', peer.pictureChangeHandler);
			peer.removeListener('close', peer.closeHandler);

			peer.socketRequestHandler = null;
			peer.roleChangeHandler = null;
			peer.displayNameChangeHandler = null;
			peer.pictureChangeHandler = null;
			peer.closeHandler = null;

			this.emit('promotePeer', peer);
			this._peers.delete(peerId);
		}
	}

	parkPeer(peer)
	{
		logger.info('parkPeer() [peer:"%s"]', peer.id);

		if (this._closed)
			return;

		peer.socketRequestHandler = (request, cb) =>
		{
			logger.debug(
				'Peer "request" event [method:"%s", peer:"%s"]',
				request.method, peer.id);
			
			if (this._closed)
				return;

			this._handleSocketRequest(peer, request, cb)
				.catch((error) =>
				{
					logger.error('request failed [error:"%o"]', error);

					cb(error);
				});
		};

		peer.roleChangeHandler = () =>
		{
			logger.info('parkPeer() | rolesChange [peer:"%s"]', peer.id);

			this.emit('peerRolesChanged', peer);
		};

		peer.displayNameChangeHandler = () =>
		{
			logger.info('parkPeer() | displayNameChange [peer:"%s"]', peer.id);

			this.emit('changeDisplayName', peer);
		};

		peer.pictureChangeHandler = () =>
		{
			logger.info('parkPeer() | pictureChange [peer:"%s"]', peer.id);

			this.emit('changePicture', peer);
		};

		peer.closeHandler = () =>
		{
			logger.debug('Peer "close" event [peer:"%s"]', peer.id);

			if (this._closed)
				return;

			this.emit('peerClosed', peer);

			this._peers.delete(peer.id);

			if (this.checkEmpty())
				this.emit('lobbyEmpty');
		};

		this._notification(peer.socket, 'enteredLobby');

		this._peers.set(peer.id, peer);

		peer.on('rolesChange', peer.roleChangeHandler);
		peer.on('displayNameChanged', peer.displayNameChangeHandler);
		peer.on('pictureChanged', peer.pictureChangeHandler);

		peer.socket.on('request', peer.socketRequestHandler);

		peer.on('close', peer.closeHandler);
	}

	async _handleSocketRequest(peer, request, cb)
	{
		logger.debug(
			'_handleSocketRequest [peer:"%s"], [request:"%s"]',
			peer.id,
			request.method
		);

		if (this._closed)
			return;

		switch (request.method)
		{
			case 'changeDisplayName':
			{
				const { displayName } = request.data;

				peer.displayName = displayName;

				cb();

				break;
			}			
			case 'changePicture':
			{
				const { picture } = request.data;

				peer.picture = picture;

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
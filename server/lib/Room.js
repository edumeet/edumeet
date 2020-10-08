const EventEmitter = require('events').EventEmitter;
const AwaitQueue = require('awaitqueue');
const axios = require('axios');
const Logger = require('./Logger');
const Lobby = require('./Lobby');
const { SocketTimeoutError } = require('./errors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const userRoles = require('../userRoles');

const {
	BYPASS_ROOM_LOCK,
	BYPASS_LOBBY
} = require('../access');

const permissions = require('../permissions'), {
	CHANGE_ROOM_LOCK,
	PROMOTE_PEER,
	MODIFY_ROLE,
	SEND_CHAT,
	MODERATE_CHAT,
	SHARE_AUDIO,
	SHARE_VIDEO,
	SHARE_SCREEN,
	EXTRA_VIDEO,
	SHARE_FILE,
	MODERATE_FILES,
	MODERATE_ROOM
} = permissions;

const config = require('../config/config');

const logger = new Logger('Room');

// In case they are not configured properly
const roomAccess =
{
	[BYPASS_ROOM_LOCK] : [ userRoles.ADMIN ],
	[BYPASS_LOBBY]     : [ userRoles.NORMAL ],
	...config.accessFromRoles
};

const roomPermissions =
{
	[CHANGE_ROOM_LOCK] : [ userRoles.NORMAL ],
	[PROMOTE_PEER]     : [ userRoles.NORMAL ],
	[MODIFY_ROLE]      : [ userRoles.MODERATOR ],
	[SEND_CHAT]        : [ userRoles.NORMAL ],
	[MODERATE_CHAT]    : [ userRoles.MODERATOR ],
	[SHARE_AUDIO]      : [ userRoles.NORMAL ],
	[SHARE_VIDEO]      : [ userRoles.NORMAL ],
	[SHARE_SCREEN]     : [ userRoles.NORMAL ],
	[EXTRA_VIDEO]      : [ userRoles.NORMAL ],
	[SHARE_FILE]       : [ userRoles.NORMAL ],
	[MODERATE_FILES]   : [ userRoles.MODERATOR ],
	[MODERATE_ROOM]    : [ userRoles.MODERATOR ],
	...config.permissionsFromRoles
};

const roomAllowWhenRoleMissing = config.allowWhenRoleMissing || [];

const ROUTER_SCALE_SIZE = config.routerScaleSize || 40;

class Room extends EventEmitter
{

	static getLeastLoadedRouter(mediasoupWorkers, peers, mediasoupRouters)
	{

		const routerLoads = new Map();

		const workerLoads = new Map();

		const pipedRoutersIds = new Set();

		for (const peer of peers.values())
		{
			const routerId = peer.routerId;

			if (routerId)
			{
				if (mediasoupRouters.has(routerId))
				{
					pipedRoutersIds.add(routerId);
				}

				if (routerLoads.has(routerId))
				{
					routerLoads.set(routerId, routerLoads.get(routerId) + 1);
				}
				else
				{
					routerLoads.set(routerId, 1);
				}
			}
		}

		for (const worker of mediasoupWorkers)
		{
			for (const router of worker._routers)
			{
				const routerId = router._internal.routerId;

				if (workerLoads.has(worker._pid))
				{
					workerLoads.set(worker._pid, workerLoads.get(worker._pid) +
						(routerLoads.has(routerId)?routerLoads.get(routerId):0));
				}
				else
				{
					workerLoads.set(worker._pid,
						(routerLoads.has(routerId)?routerLoads.get(routerId):0));
				}
			}
		}

		const sortedWorkerLoads = new Map([ ...workerLoads.entries() ].sort(
			(a, b) => a[1] - b[1]));

		// we don't care about if router is piped, just choose the least loaded worker
		if (pipedRoutersIds.size === 0 ||
			pipedRoutersIds.size === mediasoupRouters.size)
		{
			const workerId = sortedWorkerLoads.keys().next().value;

			for (const worker of mediasoupWorkers)
			{
				if (worker._pid === workerId)
				{
					for (const router of worker._routers)
					{
						const routerId = router._internal.routerId;

						if (mediasoupRouters.has(routerId))
						{
							return routerId;
						}
					}
				}
			}
		}
		else
		{
			// find if there is a piped router that is on a worker that is below limit
			for (const [ workerId, workerLoad ] of sortedWorkerLoads.entries())
			{
				for (const worker of mediasoupWorkers)
				{
					if (worker._pid === workerId)
					{
						for (const router of worker._routers)
						{
							const routerId = router._internal.routerId;

							// on purpose we check if the worker load is below the limit,
							// as in reality the worker load is imortant,
							// not the router load
							if (mediasoupRouters.has(routerId) &&
								pipedRoutersIds.has(routerId) &&
								workerLoad < ROUTER_SCALE_SIZE)
							{
								return routerId;
							}
						}
					}
				}
			}

			// no piped router found, we need to return router from least loaded worker
			const workerId = sortedWorkerLoads.keys().next().value;

			for (const worker of mediasoupWorkers)
			{
				if (worker._pid === workerId)
				{
					for (const router of worker._routers)
					{
						const routerId = router._internal.routerId;

						if (mediasoupRouters.has(routerId))
						{
							return routerId;
						}
					}
				}
			}
		}
	}

	/**
	 * Factory function that creates and returns Room instance.
	 *
	 * @async
	 *
	 * @param {mediasoup.Worker} mediasoupWorkers - The mediasoup Worker in which a new
	 *   mediasoup Router must be created.
	 * @param {String} roomId - Id of the Room instance.
	 */
	static async create({ mediasoupWorkers, roomId, peers })
	{
		logger.info('create() [roomId:"%s"]', roomId);

		// Router media codecs.
		const mediaCodecs = config.mediasoup.router.mediaCodecs;

		const mediasoupRouters = new Map();

		for (const worker of mediasoupWorkers)
		{
			const router = await worker.createRouter({ mediaCodecs });

			mediasoupRouters.set(router.id, router);
		}

		const firstRouter = mediasoupRouters.get(Room.getLeastLoadedRouter(
			mediasoupWorkers, peers, mediasoupRouters));

		// Create a mediasoup AudioLevelObserver on first router
		const audioLevelObserver = await firstRouter.createAudioLevelObserver(
			{
				maxEntries : 1,
				threshold  : -80,
				interval   : 800
			});

		return new Room({
			roomId,
			mediasoupRouters,
			audioLevelObserver,
			mediasoupWorkers,
			peers
		});
	}

	constructor({
		roomId,
		mediasoupRouters,
		audioLevelObserver,
		mediasoupWorkers,
		peers
	})
	{
		logger.info('constructor() [roomId:"%s"]', roomId);

		super();
		this.setMaxListeners(Infinity);

		this._uuid = uuidv4();

		this._mediasoupWorkers = mediasoupWorkers;

		this._allPeers = peers;

		// Room ID.
		this._roomId = roomId;

		// Closed flag.
		this._closed = false;

		// Joining queue
		this._queue = new AwaitQueue();

		// Locked flag.
		this._locked = false;

		// if true: accessCode is a possibility to open the room
		this._joinByAccesCode = true;

		// access code to the room,
		// applicable if ( _locked == true and _joinByAccessCode == true )
		this._accessCode = '';

		this._lobby = new Lobby();

		this._chatHistory = [];

		this._fileHistory = [];

		this._lastN = [];

		this._peers = {};

		this._selfDestructTimeout = null;

		// Array of mediasoup Router instances.
		this._mediasoupRouters = mediasoupRouters;

		// mediasoup AudioLevelObserver.
		this._audioLevelObserver = audioLevelObserver;

		// Current active speaker.
		this._currentActiveSpeaker = null;

		this._handleLobby();
		this._handleAudioLevelObserver();
	}

	isLocked()
	{
		return this._locked;
	}

	close()
	{
		logger.debug('close()');

		this._closed = true;

		this._queue.close();

		this._queue = null;

		if (this._selfDestructTimeout)
			clearTimeout(this._selfDestructTimeout);

		this._selfDestructTimeout = null;

		this._chatHistory = null;

		this._fileHistory = null;

		this._lobby.close();

		this._lobby = null;

		// Close the peers.
		for (const peer in this._peers)
		{
			if (!this._peers[peer].closed)
				this._peers[peer].close();
		}

		this._peers = null;

		// Close the mediasoup Routers.
		for (const router of this._mediasoupRouters.values())
		{
			router.close();
		}

		this._allPeers = null;

		this._mediasoupWorkers = null;

		this._mediasoupRouters.clear();

		this._audioLevelObserver = null;

		// Emit 'close' event.
		this.emit('close');
	}

	verifyPeer({ id, token })
	{
		try
		{
			const decoded = jwt.verify(token, this._uuid);

			logger.info('verifyPeer() [decoded:"%o"]', decoded);

			return decoded.id === id;
		}
		catch (err)
		{
			logger.warn('verifyPeer() | invalid token');
		}

		return false;
	}

	handlePeer({ peer, returning })
	{
		logger.info('handlePeer() [peer:"%s", roles:"%s", returning:"%s"]', peer.id, peer.roles, returning);

		// Should not happen
		if (this._peers[peer.id])
		{
			logger.warn(
				'handleConnection() | there is already a peer with same peerId [peer:"%s"]',
				peer.id);
		}

		// Returning user
		if (returning)
			this._peerJoining(peer, true);
		// Has a role that is allowed to bypass room lock
		else if (this._hasAccess(peer, BYPASS_ROOM_LOCK))
			this._peerJoining(peer);
		else if (
			'maxUsersPerRoom' in config &&
			(
				Object.keys(this._peers).length +
				this._lobby.peerList().length
			) >= config.maxUsersPerRoom)
		{
			this._handleOverRoomLimit(peer);
		}
		else if (this._locked)
			this._parkPeer(peer);
		else
		{
			// Has a role that is allowed to bypass lobby
			this._hasAccess(peer, BYPASS_LOBBY) ?
				this._peerJoining(peer) :
				this._handleGuest(peer);
		}
	}

	_handleOverRoomLimit(peer)
	{
		this._notification(peer.socket, 'overRoomLimit');
	}

	_handleGuest(peer)
	{
		if (config.activateOnHostJoin && !this.checkEmpty())
			this._peerJoining(peer);
		else
		{
			this._parkPeer(peer);
			this._notification(peer.socket, 'signInRequired');
		}
	}

	_handleLobby()
	{
		this._lobby.on('promotePeer', (promotedPeer) =>
		{
			logger.info('promotePeer() [promotedPeer:"%s"]', promotedPeer.id);

			const { id } = promotedPeer;

			this._peerJoining(promotedPeer);

			for (const peer of this._getAllowedPeers(PROMOTE_PEER))
			{
				this._notification(peer.socket, 'lobby:promotedPeer', { peerId: id });
			}
		});

		this._lobby.on('peerRolesChanged', (peer) =>
		{
			// Has a role that is allowed to bypass room lock
			if (this._hasAccess(peer, BYPASS_ROOM_LOCK))
			{
				this._lobby.promotePeer(peer.id);

				return;
			}

			if ( // Has a role that is allowed to bypass lobby
				!this._locked &&
				this._hasAccess(peer, BYPASS_LOBBY)
			)
			{
				this._lobby.promotePeer(peer.id);

				return;
			}
		});

		this._lobby.on('changeDisplayName', (changedPeer) =>
		{
			const { id, displayName } = changedPeer;

			for (const peer of this._getAllowedPeers(PROMOTE_PEER))
			{
				this._notification(peer.socket, 'lobby:changeDisplayName', { peerId: id, displayName });
			}
		});

		this._lobby.on('changePicture', (changedPeer) =>
		{
			const { id, picture } = changedPeer;

			for (const peer of this._getAllowedPeers(PROMOTE_PEER))
			{
				this._notification(peer.socket, 'lobby:changePicture', { peerId: id, picture });
			}
		});

		this._lobby.on('peerClosed', (closedPeer) =>
		{
			logger.info('peerClosed() [closedPeer:"%s"]', closedPeer.id);

			const { id } = closedPeer;

			for (const peer of this._getAllowedPeers(PROMOTE_PEER))
			{
				this._notification(peer.socket, 'lobby:peerClosed', { peerId: id });
			}
		});

		// If nobody left in lobby we should check if room is empty too and initiating
		// rooms selfdestruction sequence  
		this._lobby.on('lobbyEmpty', () =>
		{
			if (this.checkEmpty())
			{
				this.selfDestructCountdown();
			}
		});
	}

	_handleAudioLevelObserver()
	{
		// Set audioLevelObserver events.
		this._audioLevelObserver.on('volumes', (volumes) =>
		{
			const { producer, volume } = volumes[0];

			// Notify all Peers.
			for (const peer of this.getJoinedPeers())
			{
				this._notification(
					peer.socket,
					'activeSpeaker',
					{
						peerId : producer.appData.peerId,
						volume : volume
					});
			}
		});

		this._audioLevelObserver.on('silence', () =>
		{
			// Notify all Peers.
			for (const peer of this.getJoinedPeers())
			{
				this._notification(
					peer.socket,
					'activeSpeaker',
					{ peerId: null }
				);
			}
		});
	}

	logStatus()
	{
		logger.info(
			'logStatus() [room id:"%s", peers:"%s"]',
			this._roomId,
			Object.keys(this._peers).length
		);
	}

	dump()
	{
		return {
			roomId : this._roomId,
			peers  : Object.keys(this._peers).length
		};
	}

	get id()
	{
		return this._roomId;
	}

	selfDestructCountdown()
	{
		logger.debug('selfDestructCountdown() started');

		if (this._selfDestructTimeout)
			clearTimeout(this._selfDestructTimeout);

		this._selfDestructTimeout = setTimeout(() =>
		{
			if (this._closed)
				return;

			if (this.checkEmpty() && this._lobby.checkEmpty())
			{
				logger.info(
					'Room deserted for some time, closing the room [roomId:"%s"]',
					this._roomId);
				this.close();
			}
			else
				logger.debug('selfDestructCountdown() aborted; room is not empty!');
		}, 10000);
	}

	checkEmpty()
	{
		return Object.keys(this._peers).length === 0;
	}

	_parkPeer(parkPeer)
	{
		this._lobby.parkPeer(parkPeer);

		for (const peer of this._getAllowedPeers(PROMOTE_PEER))
		{
			this._notification(peer.socket, 'parkedPeer', { peerId: parkPeer.id });
		}
	}

	_peerJoining(peer, returning = false)
	{
		this._queue.push(async () =>
		{
			peer.socket.join(this._roomId);

			// If we don't have this peer, add to end
			!this._lastN.includes(peer.id) && this._lastN.push(peer.id);

			this._peers[peer.id] = peer;

			// Assign routerId
			peer.routerId = await this._getRouterId();

			this._handlePeer(peer);

			if (returning)
			{
				this._notification(peer.socket, 'roomBack');
			}
			else
			{
				const token = jwt.sign({ id: peer.id }, this._uuid, { noTimestamp: true });

				peer.socket.handshake.session.token = token;

				peer.socket.handshake.session.save();

				let turnServers;

				if ('turnAPIURI' in config)
				{
					try
					{
						const { data } = await axios.get(
							config.turnAPIURI,
							{
								timeout : config.turnAPITimeout || 2000,
								params  : {
									...config.turnAPIparams,
									'api_key' : config.turnAPIKey,
									'ip'      : peer.socket.request.connection.remoteAddress
								}
							});

						turnServers = [ {
							urls       : data.uris,
							username   : data.username,
							credential : data.password
						} ];
					}
					catch (error)
					{
						if ('backupTurnServers' in config)
							turnServers = config.backupTurnServers;

						logger.error('_peerJoining() | error on REST turn [error:"%o"]', error);
					}
				}
				else if ('backupTurnServers' in config)
				{
					turnServers = config.backupTurnServers;
				}

				this._notification(peer.socket, 'roomReady', { turnServers });

				if (config.activateOnHostJoin && this._lobby.peerList().length > 0 &&
					!this._locked && peer.roles.some((role) =>
					config.permissionsFromRoles.PROMOTE_PEER.includes(role)))
				{
					this._lobby.promoteAllPeers();
				}
			}
		})
			.catch((error) =>
			{
				logger.error('_peerJoining() [error:"%o"]', error);
			});
	}

	_handlePeer(peer)
	{
		logger.debug('_handlePeer() [peer:"%s"]', peer.id);

		peer.on('close', () =>
		{
			this._handlePeerClose(peer);
		});

		peer.on('displayNameChanged', ({ oldDisplayName }) =>
		{
			// Ensure the Peer is joined.
			if (!peer.joined)
				return;

			// Spread to others
			this._notification(peer.socket, 'changeDisplayName', {
				peerId         : peer.id,
				displayName    : peer.displayName,
				oldDisplayName : oldDisplayName
			}, true);
		});

		peer.on('pictureChanged', () =>
		{
			// Ensure the Peer is joined.
			if (!peer.joined)
				return;

			// Spread to others
			this._notification(peer.socket, 'changePicture', {
				peerId  : peer.id,
				picture : peer.picture
			}, true);
		});

		peer.on('gotRole', ({ newRole }) =>
		{
			// Ensure the Peer is joined.
			if (!peer.joined)
				return;

			// Spread to others
			this._notification(peer.socket, 'gotRole', {
				peerId : peer.id,
				roleId : newRole.id
			}, true, true);

			// Got permission to promote peers, notify peer of
			// peers in lobby
			if (roomPermissions.PROMOTE_PEER.some((role) => role.id === newRole.id))
			{
				const lobbyPeers = this._lobby.peerList();

				lobbyPeers.length > 0 && this._notification(peer.socket, 'parkedPeers', {
					lobbyPeers
				});
			}
		});

		peer.on('lostRole', ({ oldRole }) =>
		{
			// Ensure the Peer is joined.
			if (!peer.joined)
				return;

			// Spread to others
			this._notification(peer.socket, 'lostRole', {
				peerId : peer.id,
				roleId : oldRole.id
			}, true, true);
		});

		peer.socket.on('request', (request, cb) =>
		{
			logger.debug(
				'Peer "request" event [method:"%s", peerId:"%s"]',
				request.method, peer.id);

			this._handleSocketRequest(peer, request, cb)
				.catch((error) =>
				{
					logger.error('"request" failed [error:"%o"]', error);

					cb(error);
				});
		});

		// Peer left before we were done joining
		if (peer.closed)
			this._handlePeerClose(peer);
	}

	_handlePeerClose(peer)
	{
		logger.debug('_handlePeerClose() [peer:"%s"]', peer.id);

		if (this._closed)
			return;

		// If the Peer was joined, notify all Peers.
		if (peer.joined)
			this._notification(peer.socket, 'peerClosed', { peerId: peer.id }, true);

		// Remove from lastN
		this._lastN = this._lastN.filter((id) => id !== peer.id);

		// Need this to know if this peer was the last with PROMOTE_PEER
		const hasPromotePeer = peer.roles.some((role) =>
			roomPermissions[PROMOTE_PEER].some((roomRole) => role.id === roomRole.id)
		);

		delete this._peers[peer.id];

		// No peers left with PROMOTE_PEER, might need to give
		// lobbyPeers to peers that are left.
		if (
			hasPromotePeer &&
			!this._lobby.checkEmpty() &&
			roomAllowWhenRoleMissing.includes(PROMOTE_PEER) &&
			this._getPeersWithPermission(PROMOTE_PEER).length === 0
		)
		{
			const lobbyPeers = this._lobby.peerList();

			for (const allowedPeer of this._getAllowedPeers(PROMOTE_PEER))
			{
				this._notification(allowedPeer.socket, 'parkedPeers', { lobbyPeers });
			}
		}

		// If this is the last Peer in the room and
		// lobby is empty, close the room after a while.
		if (this.checkEmpty() && this._lobby.checkEmpty())
			this.selfDestructCountdown();
	}

	async _handleSocketRequest(peer, request, cb)
	{
		const router =
			this._mediasoupRouters.get(peer.routerId);

		switch (request.method)
		{
			case 'getRouterRtpCapabilities':
			{
				cb(null, router.rtpCapabilities);

				break;
			}

			case 'join':
			{
				// Ensure the Peer is not already joined.
				if (peer.joined)
					throw new Error('Peer already joined');

				const {
					displayName,
					picture,
					rtpCapabilities
				} = request.data;

				// Store client data into the Peer data object.
				peer.displayName = displayName;
				peer.picture = picture;
				peer.rtpCapabilities = rtpCapabilities;

				// Tell the new Peer about already joined Peers.
				// And also create Consumers for existing Producers.

				const joinedPeers = this.getJoinedPeers(peer);

				const peerInfos = joinedPeers
					.map((joinedPeer) => (joinedPeer.peerInfo));

				let lobbyPeers = [];

				// Allowed to promote peers, notify about lobbypeers
				if (this._hasPermission(peer, PROMOTE_PEER))
					lobbyPeers = this._lobby.peerList();

				cb(null, {
					roles                : peer.roles.map((role) => role.id),
					peers                : peerInfos,
					tracker              : config.fileTracker,
					authenticated        : peer.authenticated,
					roomPermissions      : roomPermissions,
					userRoles            : userRoles,
					allowWhenRoleMissing : roomAllowWhenRoleMissing,
					chatHistory          : this._chatHistory,
					fileHistory          : this._fileHistory,
					lastNHistory         : this._lastN,
					locked               : this._locked,
					lobbyPeers           : lobbyPeers,
					accessCode           : this._accessCode
				});

				// Mark the new Peer as joined.
				peer.joined = true;

				for (const joinedPeer of joinedPeers)
				{
					// Create Consumers for existing Producers.
					for (const producer of joinedPeer.producers.values())
					{
						this._createConsumer(
							{
								consumerPeer : peer,
								producerPeer : joinedPeer,
								producer
							});
					}
				}

				// Notify the new Peer to all other Peers.
				for (const otherPeer of this.getJoinedPeers(peer))
				{
					this._notification(
						otherPeer.socket,
						'newPeer',
						peer.peerInfo
					);
				}

				logger.debug(
					'peer joined [peer: "%s", displayName: "%s", picture: "%s"]',
					peer.id, displayName, picture);

				break;
			}

			case 'createWebRtcTransport':
			{
				// NOTE: Don't require that the Peer is joined here, so the client can
				// initiate mediasoup Transports and be ready when he later joins.

				const { forceTcp, producing, consuming } = request.data;

				const webRtcTransportOptions =
				{
					...config.mediasoup.webRtcTransport,
					appData : { producing, consuming }
				};

				webRtcTransportOptions.enableTcp = true;

				if (forceTcp)
					webRtcTransportOptions.enableUdp = false;
				else
				{
					webRtcTransportOptions.enableUdp = true;
					webRtcTransportOptions.preferUdp = true;
				}

				const transport = await router.createWebRtcTransport(
					webRtcTransportOptions
				);

				transport.on('dtlsstatechange', (dtlsState) =>
				{
					if (dtlsState === 'failed' || dtlsState === 'closed')
						logger.warn('WebRtcTransport "dtlsstatechange" event [dtlsState:%s]', dtlsState);
				});

				// Store the WebRtcTransport into the Peer data Object.
				peer.addTransport(transport.id, transport);

				cb(
					null,
					{
						id             : transport.id,
						iceParameters  : transport.iceParameters,
						iceCandidates  : transport.iceCandidates,
						dtlsParameters : transport.dtlsParameters
					});

				const { maxIncomingBitrate } = config.mediasoup.webRtcTransport;

				// If set, apply max incoming bitrate limit.
				if (maxIncomingBitrate)
				{
					try { await transport.setMaxIncomingBitrate(maxIncomingBitrate); }
					catch (error) {}
				}

				break;
			}

			case 'connectWebRtcTransport':
			{
				const { transportId, dtlsParameters } = request.data;
				const transport = peer.getTransport(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				await transport.connect({ dtlsParameters });

				cb();

				break;
			}

			case 'restartIce':
			{
				const { transportId } = request.data;
				const transport = peer.getTransport(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				const iceParameters = await transport.restartIce();

				cb(null, iceParameters);

				break;
			}

			case 'produce':
			{
				let { appData } = request.data;

				if (
					!appData.source ||
					![ 'mic', 'webcam', 'screen', 'extravideo' ]
						.includes(appData.source)
				)
					throw new Error('invalid producer source');

				if (
					appData.source === 'mic' &&
					!this._hasPermission(peer, SHARE_AUDIO)
				)
					throw new Error('peer not authorized');

				if (
					appData.source === 'webcam' &&
					!this._hasPermission(peer, SHARE_VIDEO)
				)
					throw new Error('peer not authorized');

				if (
					appData.source === 'screen' &&
					!this._hasPermission(peer, SHARE_SCREEN)
				)
					throw new Error('peer not authorized');

				if (
					appData.source === 'extravideo' &&
					!this._hasPermission(peer, EXTRA_VIDEO)
				)
					throw new Error('peer not authorized');

				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { transportId, kind, rtpParameters } = request.data;
				const transport = peer.getTransport(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				// Add peerId into appData to later get the associated Peer during
				// the 'loudest' event of the audioLevelObserver.
				appData = { ...appData, peerId: peer.id };

				const producer =
					await transport.produce({ kind, rtpParameters, appData });

				const pipeRouters = this._getRoutersToPipeTo(peer.routerId);

				for (const [ routerId, destinationRouter ] of this._mediasoupRouters)
				{
					if (pipeRouters.includes(routerId))
					{
						await router.pipeToRouter({
							producerId : producer.id,
							router     : destinationRouter
						});
					}
				}

				// Store the Producer into the Peer data Object.
				peer.addProducer(producer.id, producer);

				// Set Producer events.
				producer.on('score', (score) =>
				{
					this._notification(peer.socket, 'producerScore', { producerId: producer.id, score });
				});

				producer.on('videoorientationchange', (videoOrientation) =>
				{
					logger.debug(
						'producer "videoorientationchange" event [producerId:"%s", videoOrientation:"%o"]',
						producer.id, videoOrientation);
				});

				cb(null, { id: producer.id });

				// Optimization: Create a server-side Consumer for each Peer.
				for (const otherPeer of this.getJoinedPeers(peer))
				{
					this._createConsumer(
						{
							consumerPeer : otherPeer,
							producerPeer : peer,
							producer
						});
				}

				// Add into the audioLevelObserver.
				if (kind === 'audio')
				{
					this._audioLevelObserver.addProducer({ producerId: producer.id })
						.catch(() => {});
				}

				break;
			}

			case 'closeProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.getProducer(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				producer.close();

				// Remove from its map.
				peer.removeProducer(producer.id);

				cb();

				break;
			}

			case 'pauseProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.getProducer(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				await producer.pause();

				cb();

				break;
			}

			case 'resumeProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.getProducer(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				await producer.resume();

				cb();

				break;
			}

			case 'pauseConsumer':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.getConsumer(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.pause();

				cb();

				break;
			}

			case 'resumeConsumer':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.getConsumer(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.resume();

				cb();

				break;
			}

			case 'setConsumerPreferedLayers':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { consumerId, spatialLayer, temporalLayer } = request.data;
				const consumer = peer.getConsumer(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.setPreferredLayers({ spatialLayer, temporalLayer });

				cb();

				break;
			}

			case 'setConsumerPriority':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { consumerId, priority } = request.data;
				const consumer = peer.getConsumer(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.setPriority(priority);

				cb();

				break;
			}

			case 'requestConsumerKeyFrame':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.getConsumer(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.requestKeyFrame();

				cb();

				break;
			}

			case 'getTransportStats':
			{
				const { transportId } = request.data;
				const transport = peer.getTransport(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				const stats = await transport.getStats();

				cb(null, stats);

				break;
			}

			case 'getProducerStats':
			{
				const { producerId } = request.data;
				const producer = peer.getProducer(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				const stats = await producer.getStats();

				cb(null, stats);

				break;
			}

			case 'getConsumerStats':
			{
				const { consumerId } = request.data;
				const consumer = peer.getConsumer(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				const stats = await consumer.getStats();

				cb(null, stats);

				break;
			}

			case 'changeDisplayName':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { displayName } = request.data;

				peer.displayName = displayName;

				// This will be spread through events from the peer object

				// Return no error
				cb();

				break;
			}

			/* case 'changePicture':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');

				const { picture } = request.data;

				peer.picture = picture;

				// Spread to others
				this._notification(peer.socket, 'changePicture', {
					peerId  : peer.id,
					picture : picture
				}, true);

				// Return no error
				cb();

				break;
			} */

			case 'chatMessage':
			{
				if (!this._hasPermission(peer, SEND_CHAT))
					throw new Error('peer not authorized');

				const { chatMessage } = request.data;

				this._chatHistory.push(chatMessage);

				// Spread to others
				this._notification(peer.socket, 'chatMessage', {
					peerId      : peer.id,
					chatMessage : chatMessage
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'moderator:giveRole':
			{
				if (!this._hasPermission(peer, MODIFY_ROLE))
					throw new Error('peer not authorized');

				const { peerId, roleId } = request.data;

				const userRole = Object.values(userRoles).find((role) => role.id === roleId);

				if (!userRole || !userRole.promotable)
					throw new Error('no such role');

				if (!peer.roles.some((role) => role.level >= userRole.level))
					throw new Error('peer not authorized for this level');

				const giveRolePeer = this._peers[peerId];

				if (!giveRolePeer)
					throw new Error(`peer with id "${peerId}" not found`);

				// This will propagate the event automatically
				giveRolePeer.addRole(userRole);

				// Return no error
				cb();

				break;
			}

			case 'moderator:removeRole':
			{
				if (!this._hasPermission(peer, MODIFY_ROLE))
					throw new Error('peer not authorized');

				const { peerId, roleId } = request.data;

				const userRole = Object.values(userRoles).find((role) => role.id === roleId);

				if (!userRole || !userRole.promotable)
					throw new Error('no such role');

				if (!peer.roles.some((role) => role.level >= userRole.level))
					throw new Error('peer not authorized for this level');

				const removeRolePeer = this._peers[peerId];

				if (!removeRolePeer)
					throw new Error(`peer with id "${peerId}" not found`);

				// This will propagate the event automatically
				removeRolePeer.removeRole(userRole);

				// Return no error
				cb();

				break;
			}

			case 'moderator:clearChat':
			{
				if (!this._hasPermission(peer, MODERATE_CHAT))
					throw new Error('peer not authorized');

				this._chatHistory = [];

				// Spread to others
				this._notification(peer.socket, 'moderator:clearChat', null, true);

				// Return no error
				cb();

				break;
			}

			case 'lockRoom':
			{
				if (!this._hasPermission(peer, CHANGE_ROOM_LOCK))
					throw new Error('peer not authorized');

				this._locked = true;

				// Spread to others
				this._notification(peer.socket, 'lockRoom', {
					peerId : peer.id
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'unlockRoom':
			{
				if (!this._hasPermission(peer, CHANGE_ROOM_LOCK))
					throw new Error('peer not authorized');

				this._locked = false;

				// Spread to others
				this._notification(peer.socket, 'unlockRoom', {
					peerId : peer.id
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'setAccessCode':
			{
				const { accessCode } = request.data;

				this._accessCode = accessCode;

				// Spread to others
				// if (request.public) {
				this._notification(peer.socket, 'setAccessCode', {
					peerId     : peer.id,
					accessCode : accessCode
				}, true);
				// }

				// Return no error
				cb();

				break;
			}

			case 'setJoinByAccessCode':
			{
				const { joinByAccessCode } = request.data;

				this._joinByAccessCode = joinByAccessCode;

				// Spread to others
				this._notification(peer.socket, 'setJoinByAccessCode', {
					peerId           : peer.id,
					joinByAccessCode : joinByAccessCode
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'promotePeer':
			{
				if (!this._hasPermission(peer, PROMOTE_PEER))
					throw new Error('peer not authorized');

				const { peerId } = request.data;

				this._lobby.promotePeer(peerId);

				// Return no error
				cb();

				break;
			}

			case 'promoteAllPeers':
			{
				if (!this._hasPermission(peer, PROMOTE_PEER))
					throw new Error('peer not authorized');

				this._lobby.promoteAllPeers();

				// Return no error
				cb();

				break;
			}

			case 'sendFile':
			{
				if (!this._hasPermission(peer, SHARE_FILE))
					throw new Error('peer not authorized');

				const { magnetUri } = request.data;

				this._fileHistory.push({ peerId: peer.id, magnetUri: magnetUri });

				// Spread to others
				this._notification(peer.socket, 'sendFile', {
					peerId    : peer.id,
					magnetUri : magnetUri
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'moderator:clearFileSharing':
			{
				if (!this._hasPermission(peer, MODERATE_FILES))
					throw new Error('peer not authorized');

				this._fileHistory = [];

				// Spread to others
				this._notification(peer.socket, 'moderator:clearFileSharing', null, true);

				// Return no error
				cb();

				break;
			}

			case 'raisedHand':
			{
				const { raisedHand } = request.data;

				peer.raisedHand = raisedHand;

				// Spread to others
				this._notification(peer.socket, 'raisedHand', {
					peerId              : peer.id,
					raisedHand          : raisedHand,
					raisedHandTimestamp : peer.raisedHandTimestamp
				}, true);

				// Return no error
				cb();

				break;
			}

			case 'moderator:mute':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				const { peerId } = request.data;

				const mutePeer = this._peers[peerId];

				if (!mutePeer)
					throw new Error(`peer with id "${peerId}" not found`);

				this._notification(mutePeer.socket, 'moderator:mute');

				cb();

				break;
			}

			case 'moderator:muteAll':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				// Spread to others
				this._notification(peer.socket, 'moderator:mute', null, true);

				cb();

				break;
			}

			case 'moderator:stopVideo':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				const { peerId } = request.data;

				const stopVideoPeer = this._peers[peerId];

				if (!stopVideoPeer)
					throw new Error(`peer with id "${peerId}" not found`);

				this._notification(stopVideoPeer.socket, 'moderator:stopVideo');

				cb();

				break;
			}

			case 'moderator:stopAllVideo':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				// Spread to others
				this._notification(peer.socket, 'moderator:stopVideo', null, true);

				cb();

				break;
			}

			case 'moderator:stopAllScreenSharing':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				// Spread to others
				this._notification(peer.socket, 'moderator:stopScreenSharing', null, true);

				cb();

				break;
			}

			case 'moderator:stopScreenSharing':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				const { peerId } = request.data;

				const stopVideoPeer = this._peers[peerId];

				if (!stopVideoPeer)
					throw new Error(`peer with id "${peerId}" not found`);

				this._notification(stopVideoPeer.socket, 'moderator:stopScreenSharing');

				cb();

				break;
			}

			case 'moderator:closeMeeting':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				this._notification(peer.socket, 'moderator:kick', null,	true);

				cb();

				// Close the room
				this.close();

				break;
			}

			case 'moderator:kickPeer':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				const { peerId } = request.data;

				const kickPeer = this._peers[peerId];

				if (!kickPeer)
					throw new Error(`peer with id "${peerId}" not found`);

				this._notification(kickPeer.socket, 'moderator:kick');

				kickPeer.close();

				cb();

				break;
			}

			case 'moderator:lowerHand':
			{
				if (!this._hasPermission(peer, MODERATE_ROOM))
					throw new Error('peer not authorized');

				const { peerId } = request.data;

				const lowerPeer = this._peers[peerId];

				if (!lowerPeer)
					throw new Error(`peer with id "${peerId}" not found`);

				this._notification(lowerPeer.socket, 'moderator:lowerHand');

				cb();

				break;
			}

			default:
			{
				logger.error('unknown request.method "%s"', request.method);

				cb(500, `unknown request.method "${request.method}"`);
			}
		}
	}

	/**
	 * Creates a mediasoup Consumer for the given mediasoup Producer.
	 *
	 * @async
	 */
	async _createConsumer({ consumerPeer, producerPeer, producer })
	{
		logger.debug(
			'_createConsumer() [consumerPeer:"%s", producerPeer:"%s", producer:"%s"]',
			consumerPeer.id,
			producerPeer.id,
			producer.id
		);

		const router = this._mediasoupRouters.get(producerPeer.routerId);

		// Optimization:
		// - Create the server-side Consumer. If video, do it paused.
		// - Tell its Peer about it and wait for its response.
		// - Upon receipt of the response, resume the server-side Consumer.
		// - If video, this will mean a single key frame requested by the
		//   server-side Consumer (when resuming it).

		// NOTE: Don't create the Consumer if the remote Peer cannot consume it.
		if (
			!consumerPeer.rtpCapabilities ||
			!router.canConsume(
				{
					producerId      : producer.id,
					rtpCapabilities : consumerPeer.rtpCapabilities
				})
		)
		{
			return;
		}

		// Must take the Transport the remote Peer is using for consuming.
		const transport = consumerPeer.getConsumerTransport();

		// This should not happen.
		if (!transport)
		{
			logger.warn('_createConsumer() | Transport for consuming not found');

			return;
		}

		// Create the Consumer in paused mode.
		let consumer;

		try
		{
			consumer = await transport.consume(
				{
					producerId      : producer.id,
					rtpCapabilities : consumerPeer.rtpCapabilities,
					paused          : producer.kind === 'video'
				});

			if (producer.kind === 'audio')
				await consumer.setPriority(255);
		}
		catch (error)
		{
			logger.warn('_createConsumer() | [error:"%o"]', error);

			return;
		}

		// Store the Consumer into the consumerPeer data Object.
		consumerPeer.addConsumer(consumer.id, consumer);

		// Set Consumer events.
		consumer.on('transportclose', () =>
		{
			// Remove from its map.
			consumerPeer.removeConsumer(consumer.id);
		});

		consumer.on('producerclose', () =>
		{
			// Remove from its map.
			consumerPeer.removeConsumer(consumer.id);

			this._notification(consumerPeer.socket, 'consumerClosed', { consumerId: consumer.id });
		});

		consumer.on('producerpause', () =>
		{
			this._notification(consumerPeer.socket, 'consumerPaused', { consumerId: consumer.id });
		});

		consumer.on('producerresume', () =>
		{
			this._notification(consumerPeer.socket, 'consumerResumed', { consumerId: consumer.id });
		});

		consumer.on('score', (score) =>
		{
			this._notification(consumerPeer.socket, 'consumerScore', { consumerId: consumer.id, score });
		});

		consumer.on('layerschange', (layers) =>
		{
			this._notification(
				consumerPeer.socket,
				'consumerLayersChanged',
				{
					consumerId    : consumer.id,
					spatialLayer  : layers ? layers.spatialLayer : null,
					temporalLayer : layers ? layers.temporalLayer : null
				}
			);
		});

		// Send a request to the remote Peer with Consumer parameters.
		try
		{
			await this._request(
				consumerPeer.socket,
				'newConsumer',
				{
					peerId         : producerPeer.id,
					kind           : consumer.kind,
					producerId     : producer.id,
					id             : consumer.id,
					rtpParameters  : consumer.rtpParameters,
					type           : consumer.type,
					appData        : producer.appData,
					producerPaused : consumer.producerPaused
				}
			);

			// Now that we got the positive response from the remote Peer and, if
			// video, resume the Consumer to ask for an efficient key frame.
			await consumer.resume();

			this._notification(
				consumerPeer.socket,
				'consumerScore',
				{
					consumerId : consumer.id,
					score      : consumer.score
				}
			);
		}
		catch (error)
		{
			logger.warn('_createConsumer() | [error:"%o"]', error);
		}
	}

	_hasPermission(peer, permission)
	{
		const hasPermission = peer.roles.some((role) =>
			roomPermissions[permission].some((roomRole) => role.id === roomRole.id)
		);

		if (hasPermission)
			return true;

		// Allow if config is set, and no one is present
		if (
			roomAllowWhenRoleMissing.includes(permission) &&
			this._getPeersWithPermission(permission).length === 0
		)
			return true;

		return false;
	}

	_hasAccess(peer, access)
	{
		return peer.roles.some((role) =>
			roomAccess[access].some((roomRole) => role.id === roomRole.id)
		);
	}

	/**
	 * Get the list of joined peers.
	 */
	getJoinedPeers(excludePeer = undefined)
	{
		return Object.values(this._peers)
			.filter((peer) => peer.joined && peer !== excludePeer);
	}

	_getAllowedPeers(permission = null, excludePeer = undefined, joined = true)
	{
		const peers = this._getPeersWithPermission(permission, excludePeer, joined);

		if (peers.length > 0)
			return peers;

		// Allow if config is set, and no one is present
		if (roomAllowWhenRoleMissing.includes(permission))
			return Object.values(this._peers);

		return peers;
	}

	_getPeersWithPermission(permission = null, excludePeer = undefined, joined = true)
	{
		return Object.values(this._peers)
			.filter(
				(peer) =>
					peer.joined === joined &&
					peer !== excludePeer &&
					peer.roles.some(
						(role) =>
							roomPermissions[permission].some((roomRole) =>
								role.id === roomRole.id)
					)
			);
	}

	_timeoutCallback(callback)
	{
		let called = false;

		const interval = setTimeout(
			() =>
			{
				if (called)
					return;
				called = true;
				callback(new SocketTimeoutError('Request timed out'));
			},
			config.requestTimeout || 20000
		);

		return (...args) =>
		{
			if (called)
				return;
			called = true;
			clearTimeout(interval);

			callback(...args);
		};
	}

	_sendRequest(socket, method, data = {})
	{
		return new Promise((resolve, reject) =>
		{
			socket.emit(
				'request',
				{ method, data },
				this._timeoutCallback((err, response) =>
				{
					if (err)
					{
						reject(err);
					}
					else
					{
						resolve(response);
					}
				})
			);
		});
	}

	async _request(socket, method, data)
	{
		logger.debug('_request() [method:"%s", data:"%o"]', method, data);

		const {
			requestRetries = 3
		} = config;

		for (let tries = 0; tries < requestRetries; tries++)
		{
			try
			{
				return await this._sendRequest(socket, method, data);
			}
			catch (error)
			{
				if (
					error instanceof SocketTimeoutError &&
					tries < requestRetries
				)
					logger.warn('_request() | timeout, retrying [attempt:"%s"]', tries);
				else
					throw error;
			}
		}
	}

	_notification(socket, method, data = {}, broadcast = false, includeSender = false)
	{
		if (broadcast)
		{
			socket.broadcast.to(this._roomId).emit(
				'notification', { method, data }
			);

			if (includeSender)
				socket.emit('notification', { method, data });
		}
		else
		{
			socket.emit('notification', { method, data });
		}
	}

	async _pipeProducersToRouter(routerId)
	{
		const router = this._mediasoupRouters.get(routerId);

		const peersToPipe =
			Object.values(this._peers)
				.filter((peer) => peer.routerId !== routerId && peer.routerId !== null);

		for (const peer of peersToPipe)
		{
			const srcRouter = this._mediasoupRouters.get(peer.routerId);

			for (const producerId of peer.producers.keys())
			{
				if (router._producers.has(producerId))
				{
					continue;
				}

				await srcRouter.pipeToRouter({
					producerId : producerId,
					router     : router
				});
			}
		}
	}

	async _getRouterId()
	{
		const routerId = Room.getLeastLoadedRouter(
			this._mediasoupWorkers, this._allPeers, this._mediasoupRouters);

		await this._pipeProducersToRouter(routerId);

		return routerId;
	}

	// Returns an array of router ids we need to pipe to
	_getRoutersToPipeTo(originRouterId)
	{
		return Object.values(this._peers)
			.map((peer) => peer.routerId)
			.filter((routerId, index, self) =>
				routerId !== originRouterId && self.indexOf(routerId) === index
			);
	}

}

module.exports = Room;

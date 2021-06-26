import { EventEmitterTyped, IEventsDescriptor } from './EventEmitter';
import Logger from './Logger';

import Bowser from 'bowser';

import SignalingAPI from './SignalingAPI';
import Transport from './Transport';
import EdumeetProducers from './Producers';
import { IEdumeetChatMessage, IEdumeetConfig, IEdumeetPeer, IEdumeetRole } from './types';
import EdumeetConsumers from './Consumers';
import EdumeetFiles from './Files';
import Spotlights from './Spotlights';
const logger = new Logger('Room');

interface RoomEvents extends IEventsDescriptor {
	// closed: (payload: {}) => void
	disconnect: (payload: { reason: string}) => void
	reconnect: () => void
	reconnect_failed: () => void

	joined: () => void
	kicked: () => void,
	roomUpdate: (payload: Partial<Room>) => void
	peerVolumeChange: (payload: { peerId: string, volume: number}) => void
	peerSpeaking: (payload: { peerId: string }) => void
	peerStoppedSpeaking: (payload: { peerId: string }) => void

	peerJoined: (payload: {peer: IEdumeetPeer, initial: boolean }) => void
	peerLeft: (payload: { peerId: string, wasInLobby: boolean }) => void
	peerChanged: (payload: { prev: IEdumeetPeer, peer: IEdumeetPeer }) => void,
	peerRoleAdded: (payload: { peerId: string, role: IEdumeetRole }) => void
	peerRoleRemoved: (payload: { peerId: string, role: IEdumeetRole }) => void

	handUpdate: (payload: { peerId: string, handRaised: boolean, timestamp: number }) => void

	activeSpeaker: (payload: { peerId: string }) => void

	newDeviceDetected: () => void

	chatMessage: (payload: IEdumeetChatMessage) => void
	chatCleared: () => void

	/**
	 * @deprecated
	 */
	_roomReady: () => void
}

interface IRoomProps {
	peerId: string
	isProduceEnabled: boolean,
	forceTcp: boolean
}

// @ts-ignore
const insertableStreamsSupported = Boolean(RTCRtpSender.prototype.createEncodedStreams);


export default class Room extends EventEmitterTyped<RoomEvents> {
	private config: IEdumeetConfig
	private _peerId: string
	private _roomId?: string
	private api: SignalingAPI
	private bowser: Bowser.Parser.Parser

	transport: Transport
	files: EdumeetFiles
	producers: EdumeetProducers
	consumers: EdumeetConsumers
	spotlights: Spotlights

	private _peers: Map<string, IEdumeetPeer> = new Map()

	name = ''
	state: 'new'|'connecting'|'connected'|'disconnected'|'closed' = 'new'
	isLoggedIn = false
	isLocked = false
	isInLobby = false
	isSignInRequired = false
	isOverRoomLimit = false
	// access code to the room if locked and joinByAccessCode == true
	accessCode = ''
	// if true: accessCode is a possibility to open the room
	isJoinByAccessCode = true
	// selectedPeers                 : [],
	// spotlights                    : [],
	// rolesManagerPeer              : null, // peerId
	// settingsOpen                  : boolean
	// extraVideoOpen                : boolean
	// hideSelfView                  : boolean
	// rolesManagerOpen              : boolean
	// helpOpen                      : boolean
	// aboutOpen                     : boolean
	// currentSettingsTab            : 'media', // media, appearance, advanced
	// lockDialogOpen                : boolean
	// joined                        : boolean
	// muteAllInProgress             : boolean
	// lobbyPeersPromotionInProgress : boolean
	// stopAllVideoInProgress        : boolean
	// closeMeetingInProgress        : boolean
	// clearChatInProgress           : boolean
	// clearFileSharingInProgress    : boolean
	// roomPermissions               : null,
	// roles                     : null,
	allowWhenRoleMissing: string[] = []

	roomPermissions: {[permission: string]: number[]} = {}
	roles: Map<number, IEdumeetRole> = new Map()

	private chatMessages: IEdumeetChatMessage[] = []
	private raisedHands: Map<string, { timestamp: number }> = new Map()

	constructor(config: IEdumeetConfig, props: IRoomProps) {
		super();
		this.config = config;
		this._peerId = props.peerId;

		this.bowser = Bowser.getParser(navigator.userAgent);

		// SignalingAPI
		this.api = new SignalingAPI({
			hostname       : config.hostname,
			port           : config.port,
			peerId         : props.peerId,
			requestRetries : config.requestRetries,
			requestTimeout : config.requestTimeout
		});
		this.api.on('disconnect', (reason: string) => {
			this.update({ state: 'connecting' });
			this.emit('disconnect', { reason });
			if (reason === 'io server disconnect') {
				this.close();
			}
		});
		this.api.on('reconnect_failed', () => {
			this.emit('reconnect_failed');
			this.close();
		});
		this.api.on('reconnect', () => {
			this.update({ state: 'connected' });
			this.emit('reconnect');
		});
		this.api.on('notification:roomReady', ( { turnServers }) => {
			this.transport.turnServers = turnServers;
			this.emit('_roomReady')
			this.update({
				isInLobby: false
			})
			this.connect();
		})
		this.api.on('notification:roomBack', () => {
			this.connect();
		})
		this.api.on('notification:peerClosed', ({ peerId }) => {
			this.handlePeerRemove(peerId)
		});
		this.api.on('notification:lobby:peerClosed', ({ peerId }) => {
			this.handlePeerRemove(peerId)
		});
		this.api.on('notification:signInRequired', () => {
			this.update({ isSignInRequired: true });
		});
		this.api.on('notification:overRoomLimit', () => {
			this.update({ isOverRoomLimit: true });
		});
		this.api.on('notification:lockRoom', () => {
			this.update({ isLocked: true });
		});
		this.api.on('notification:unlockRoom', () => {
			this.update({ isLocked: false });
		});
		this.api.on('notification:setAccessCode', ({ accessCode }) => {
			this.update({ accessCode });
		});
		this.api.on('notification:enteredLobby', async () => {
			this.update({ isInLobby: true });
			const me = this.getMe()
			if (me.displayName) await this.api.changeDisplayName({ displayName: me.displayName });
			if (me.avatarUrl) await this.api.changePicture({ picture: me.avatarUrl });
		});
		this.api.on('notification:newPeer', ({ id, displayName, picture, roles }) => {
			this.handlePeerAdd({
				id,
				displayName,
				avatarUrl: picture,
				roles,
				isInLobby : false
			});
		});
		this.api.on('notification:lobby:promotedPeer', ({ peerId }) => {
			this.handlePeerRemove(peerId)
		})
		this.api.on('notification:lobby:changeDisplayName', ({peerId, displayName}) => {
			this.handlePeerUpdate(peerId, { displayName })
		})
		this.api.on('notification:changeDisplayName', ({peerId, displayName}) => {
			this.handlePeerUpdate(peerId, { displayName })
		})
		this.api.on('notification:lobby:changePicture', ({peerId, picture}) => {
			this.handlePeerUpdate(peerId, { avatarUrl: picture })
		})
		this.api.on('notification:changePicture', ({peerId, picture}) => {
			this.handlePeerUpdate(peerId, { avatarUrl: picture })
		})
		this.api.on('notification:parkedPeer', ({ peerId }) => {
			this.handlePeerAdd({
				id          : peerId,
				displayName : '',
				avatarUrl     : '',
				isInLobby   : true,
				roles       : new Set()
			});
		});
		this.api.on('notification:parkedPeers', ({ lobbyPeers }) => {
			for (const peer of lobbyPeers) {
				this.handlePeerAdd({
					id          : peer.id,
					displayName : '',
					avatarUrl     : '',
					isInLobby   : true,
					roles       : new Set()
				});
			}
		});
		this.api.on('notification:activeSpeaker', ({ peerId }) => {
			this.emit('activeSpeaker', { peerId })
		})
		this.api.on('notification:raisedHand', ({ peerId, raisedHand, raisedHandTimestamp }) => {
			if(raisedHand) {
				this.raisedHands.set(peerId, { timestamp: raisedHandTimestamp })
			} else {
				this.raisedHands.delete(peerId)
			}
			this.emit('handUpdate', { 
				peerId,
				handRaised: raisedHand,
				timestamp: raisedHandTimestamp
			})
		})
		this.api.on('notification:moderator:lowerHand', () => {
			this.setHandRaised(false)
		})
		this.api.on('notification:chatMessage', ({ peerId, chatMessage }) => {
			const message: IEdumeetChatMessage = {
				type: chatMessage.type,
				sender: chatMessage.sender,
				content: chatMessage.text,
				time: chatMessage.time,
				peerId: peerId,
				profileName: chatMessage.name,
				picture: chatMessage.picture
			}
			this.chatMessages.push(message)
			this.emit('chatMessage', message)
		})
		this.api.on('notification:moderator:clearChat', () => {
			this.chatMessages = []
			this.emit('chatCleared')
		})
		this.api.on('notification:moderator:kick', () => {
			this.emit('kicked')
			this.close()
		})
		this.api.on('notification:gotRole', ({ peerId, roleId }) => {
			this.handlePeerRoleAdd(peerId, roleId)
		})
		this.api.on('notification:lostRole', ({ peerId, roleId }) => {
			this.handlePeerRoleRemove(peerId, roleId)
		})

		// Transport
		this.transport = new Transport({
			api              : this.api,
			isProduceEnabled : props.isProduceEnabled,
			forceTcp         : props.forceTcp,
			simulcastConfig  : config.simulcast,

			// because of an issue with firefox, we always enforce
			// usage of TURN
			// https://github.com/edumeet/edumeet/issues/72
			iceTransportPolicy : this.bowser.satisfies({ firefox: '>0' }) ? 'relay' : 'all',

			insertableStreamsEnabled: insertableStreamsSupported && this.config.opusDetailsEnabled
		});

		// Producers
		this.producers = new EdumeetProducers({
			transport : this.transport,
			bowser    : this.bowser,
			config    : this.config,
			api       : this.api
		});
		this.producers.on('micVolumeChange', ({ volume }) => {
			this.emit('peerVolumeChange', {
				peerId : this._peerId,
				volume
			});
		});

		// Consumers
		this.consumers = new EdumeetConsumers({
			transport : this.transport,
			bowser    : this.bowser,
			config    : this.config,
			api       : this.api
		});
		this.consumers.on('peerVolumeChange', (payload) => {
			this.emit('peerVolumeChange', payload);
		});

		// Files
		this.files = new EdumeetFiles({
			api : this.api,
			room: this
		});

		// Spotlights
		this.spotlights = new Spotlights(config.spotlights.lastN, config.spotlights.hideNoVideoParticipants, this)
		this.spotlights.on('update', async ({currentSpotlights}) => {
			try {
				await this.consumers.setEnabledVideoPeers(currentSpotlights);
			} catch (error) {
				logger.error('updateSpotlights() [error:"%o"]', error);
			}
		})

		this._peers.set(this._peerId, {
			id: this._peerId,
			displayName: '',
			avatarUrl: '',
			isInLobby: false,
			roles: new Set()
		})

		navigator.mediaDevices.addEventListener('devicechange', async () => {
			await this.updateDevices();
			this.emit('newDeviceDetected');
		});
	}
	private update(changes: Partial<Room>, updateOnly = false) {
		Object.assign(this, changes);
		if (!updateOnly) this.emit('roomUpdate', changes);
	}

	async join({ roomId }: {roomId: string}) {
		this._roomId = roomId;
		this.update({
			name: roomId,
			state: 'connecting'
		})
		this.api.connectToRoomId(roomId);
	}

	async connect() {
		await this.updateDevices();
		await this.transport.connect();
		const me = this.getMe()
		const res = await this.api.join({
			displayName     : me.displayName || '',
			picture         : me.avatarUrl,
			rtpCapabilities : this.transport.mediasoupDevice.rtpCapabilities
		});

		logger.debug(
			'connect() joined [authenticated:"%s", peers:"%o", roles:"%o", userRoles:"%o"]',
			res.authenticated,
			res.peers,
			res.roles,
			res.userRoles
		);

		for (const peer of res.peers) {
			this.handlePeerAdd({
				...peer,
				isInLobby : false
			}, true);
		}
		for (const peer of res.lobbyPeers) {
			this.handlePeerAdd({
				...peer,
				isInLobby : true
			}, true);
		}
		const roomPermissions: {[permission: string]: number[]} = {};

		for (const permission in res.roomPermissions) {
			roomPermissions[permission] = res.roomPermissions[permission].map((p) => p.id);
		}

		for (const key in res.userRoles) {
			const role = res.userRoles[key];

			if(!this.roles.has(role.id)) this.roles.set(role.id, role);
		}
		for (const roleId of res.roles) {
			this.handlePeerRoleAdd(this._peerId, roleId);
		}

		this.update({
			isLocked             : res.locked,
			accessCode           : res.accessCode,
			allowWhenRoleMissing : res.allowWhenRoleMissing
		}, true);

		this.update({
			state           : 'connected',
			roles           : this.roles,
			roomPermissions : roomPermissions,
			isLoggedIn      : res.authenticated
		});

		if (this.config.torrentsEnabled) {
			await this.files.connect(this.transport.turnServers);
			this.files.torrentTrackers = [ res.tracker ];
		}

		if(res.fileHistory) {
			this.files.handleFileHistory(res.fileHistory)
		}

		if(res.chatHistory) {
			this.chatMessages = []
			for(let m of res.chatHistory) {
				this.chatMessages.push({
					type: m.type,
					sender: 'response',
					content: m.text,
					time: m.time,
					peerId: '',
					profileName: m.name,
					picture: m.picture
				}) 
			}
		}

		if (res.lastNHistory.length > 0) {
			this.spotlights.addSpeakerList(
				res.lastNHistory.filter((peerId) => peerId !== this._peerId)
			);
		}

		this.emit('joined');

		return res;
	}

	/**
		* @deprecated
		*/
	canProduce(type: 'audio'|'video') {
		return this.transport.mediasoupDevice.canProduce(type);
	}

	close(): void {
		if (this.state === 'closed') return;
		this.update({ state: 'closed' });
		this.api.close();
		this.transport.close();
	}
	async updateDevices() {
		await this.consumers.updateDevices();
		await this.producers.updateDevices();
	}

	async changeDisplayName(displayName: string) {
		const me = this.getMe()
		if (displayName === me.displayName) return;
		me.displayName = displayName;
		if (this.state == 'connected') {
			await this.api.changeDisplayName({ displayName });
		}
	}
	async changeAvatar(avatarUrl: string) {
		const me = this.getMe()
		if (avatarUrl === me.avatarUrl) return;
		me.avatarUrl = avatarUrl;
		if (this.state == 'connected') {
			await this.api.changePicture({ picture: avatarUrl });
		}
	}
	getRoomId() {
		return this._roomId;
	}

	/**
	 * @deprecated
	 */
	sendRequest(method: string, payload: any) {
		return this.api.sendRequest(method, payload)
	}

	/**
	  * @deprecated
	  */
	getMyPeerId() {
		return this._peerId;
	}
	getMe() {
		const me = this._peers.get(this._peerId)
		if(!me) throw new Error('getMe(): missing in peer list. this is unexpected')
		return me
	}

	getPeers(): IEdumeetPeer[] {
		return Array.from(this._peers.values())
			.filter(p => !p.isInLobby)
			.filter(p => p.id !== this._peerId)
	}

	getChatHistory(): IEdumeetChatMessage[] {
		return this.chatMessages
	}

	private handlePeerAdd(peerInput: IEdumeetPeer, initial = false) {
		const peer = {
			raisedHand : false,
			...peerInput
		};

		this._peers.set(peer.id, peer);
		this.emit('peerJoined', { peer, initial });
	}
	private handlePeerUpdate(peerId: string, changes: { displayName?: string, avatarUrl?: string}) {
		const peer = this._peers.get(peerId)
		if(!peer) return
		const prev = Object.assign({}, peer)

		if(changes.displayName) peer.displayName = changes.displayName
		if(changes.avatarUrl) peer.avatarUrl = changes.avatarUrl

		this.emit('peerChanged', {
			prev,
			peer
		})

	}
	private handlePeerRoleAdd(peerId: string, roleId: number) {
		const role = this.roles.get(roleId);

		if (!role) {
			throw new Error(`role with roleId '${roleId}' does not exist`);
		}

		const peer = this._peers.get(peerId)
		if(!peer) return


		const alreadyProvided = peer.roles.has(role)
		if (alreadyProvided) return

		peer.roles.add(role)
		this.emit('peerRoleAdded', {
			peerId,
			role
		});
	}
	private handlePeerRoleRemove(peerId: string, roleId: number) {
		const role = this.roles.get(roleId);

		if (!role) {
			throw new Error(`role with roleId '${roleId}' does not exist`);
		}
		const peer = this._peers.get(peerId)
		if(!peer || !peer.roles.has(role)) return

		peer.roles.delete(role)
		this.emit('peerRoleRemoved', {
			peerId,
			role
		});
	}
	private handlePeerRemove(peerId: string) {
		const peer = this._peers.get(peerId)
		if(!peer) return
		this._peers.delete(peerId)
		this.emit('peerLeft', { peerId, wasInLobby: peer.isInLobby });
	}

	async setHandRaised(raisedHand: boolean) {
		await this.api.setRaisedHand({ raisedHand })
		if(raisedHand) {
			this.raisedHands.set(this._peerId, { timestamp: Date.now() })
		} else {
			this.raisedHands.delete(this._peerId)
		}
		this.emit('handUpdate', { 
			peerId: this._peerId,
			handRaised: raisedHand,
			timestamp: Date.now()
		})
	}

	async sendChatMessage(text: string) {
		const me = this.getMe()
		const message: IEdumeetChatMessage = {
			type: 'message',
			sender: 'client',
			content: text,
			time: Date.now(),
			peerId: me.id,
			profileName: me.displayName,
			picture: me.avatarUrl
		}
		await this.api.chatMessage({
			type: message.type,
			sender: message.sender,
			text: message.content,
			time: message.time,
			name: message.profileName,
			picture: message.picture
		})
		this.chatMessages.push(message)
		this.emit('chatMessage', message)
	}

	
	async setRoomLock(lock: boolean) {
		if(lock) {
			await this.api.lockRoom()
		} else {
			await this.api.unlockRoom()
		}
		this.update({
			isLocked: lock
		})
	}
	async setAccessCode(code: string) {
		await this.api.setAccessCode({ accessCode: code });
		this.update({
			accessCode: code
		})
	}

	async promoteAllLobbyPeers() {
		await this.api.promoteAllPeers();
	}
	
	async promoteLobbyPeer(peerId: string) {
		await this.api.promoteLobbyPeer({ peerId });
	}
	
	async clearChat() {
		await this.api.moderatorClearChat();
		this.emit('chatCleared')
	}
		
	async givePeerRole(peerId: string, roleId: number) {
		await this.api.moderatorGiveRole({ peerId, roleId });
	}
	
	async removePeerRole(peerId: string, roleId: number) {
		await this.api.moderatorRemovePeerRole({ peerId, roleId });
	}
	
	async kickPeer(peerId: string) {
		await this.api.moderatorKickPeer({ peerId });
	}
	
	async mutePeer(peerId: string) {
		await this.api.moderatorMute({ peerId });
	}
	
	async stopPeerVideo(peerId: string) {
		await this.api.moderatorStopVideo({ peerId });
	}
	
	async stopPeerScreenSharing(peerId: string) {
		await this.api.moderatorStopScreenSharing({ peerId });
	}
	
	async muteAllPeers() {
		await this.api.moderatorMuteAllPeers()
	}
	
	async stopAllPeerVideo() {
		await this.api.moderatorStopAllVideo()
	}
	
	async stopAllPeerScreenSharing() {
		await this.api.moderatorStopAllScreenSharing()
	}
	
	async closeMeeting() {
		await this.api.moderatorCloseMeeting()
	}
	
	async lowerPeerHand(peerId: string) {
		await this.api.moderatorLowerPeerHand({ peerId })
	}

	havePermission(permission: string) {
		const permissionRoleIds = this.roomPermissions[permission];

		if (!permissionRoleIds) return false;

		const me = this.getMe()

		if (permissionRoleIds.some((roleId) => {
			const role = this.roles.get(roleId)
			return role && me.roles.has(role)
		})) {
			return true;
		}

		if (this.allowWhenRoleMissing.includes(permission)) {
			const peers = Array.from(this._peers.values());
			const peersWithThisPermission = peers.filter((peer) => {
				return Array.from(peer.roles).some((role) => permissionRoleIds.includes(role.id));
			});

			if (peersWithThisPermission.length === 0) {
				return true;
			}
		}

		return false;
	}
}

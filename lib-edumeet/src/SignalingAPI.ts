import SocketIOClient from 'socket.io-client';
import Logger from './Logger';
import { EventEmitterTyped, IEventsDescriptor } from './EventEmitter';
import { SocketTimeoutError, timeoutCallback, getSignalingUrl } from './utils';

import * as mediasoupClient from 'mediasoup-client';
import { IEdumeetPeer, IEdumeetRole, IMediasoupProducerScore, INotificationNewConsumer } from './types';

const logger = new Logger('SignalingAPI');

interface APIEvents extends IEventsDescriptor {
    disconnect: (reason: string) => void
    reconnect_failed: () => void
    reconnect: () => void
    ['notification:roomReady']: (payload: { turnServers: RTCIceServer[] }) => void
    ['notification:roomBack']: () => void,
    ['notification:newConsumer']: (payload: INotificationNewConsumer) => void,
    ['notification:peerClosed']: (payload: {peerId: string}) => void
    ['notification:consumerClosed']: (payload: {consumerId: string}) => void
    ['notification:consumerPaused']: (payload: {consumerId: string}) => void
    ['notification:consumerResumed']: (payload: {consumerId: string}) => void
    ['notification:consumerLayersChanged']: (payload: {consumerId: string, spatialLayer: number, temporalLayer: number}) => void
    ['notification:signInRequired']: () => void
    ['notification:overRoomLimit']: () => void
    ['notification:lockRoom']: () => void
    ['notification:unlockRoom']: () => void
    ['notification:setAccessCode']: (payload: { accessCode: string }) => void
    ['notification:enteredLobby']: () => void
    ['notification:newPeer']: (payload: IEdumeetPeer & {picture: string}) => void
    ['notification:parkedPeer']: (payload: {peerId: string}) => void
    ['notification:parkedPeers']: (payload: {lobbyPeers: IEdumeetPeer[]}) => void,
    ['notification:sendFile']: (payload: { 
        type: 'file',
        time: number,
        sender: 'response',
        name: string,
        picture: string|undefined,
        peerId: string
        magnetUri: string
    }) => void
    ['notification:activeSpeaker']: (payload: { peerId: string }) => void
    ['notification:raisedHand']: (payload: { 
        peerId: string
        raisedHand: boolean
        raisedHandTimestamp: number
    }) => void
    ['notification:moderator:lowerHand']: () => void
    ['notification:chatMessage']: (payload: { peerId: string, chatMessage: {
        type : 'message',
        text: string
        time: number
        name: string
        sender: 'response'
        picture: string
    }}) => void
    ['notification:lobby:peerClosed']: (payload: { peerId: string }) => void
    ['notification:lobby:promotedPeer']: (payload: { peerId: string }) => void
    ['notification:lobby:changeDisplayName']: (payload: { peerId: string, displayName: string }) => void
    ['notification:lobby:changePicture']: (payload: { peerId: string, picture: string }) => void
    ['notification:lobby:changePicture']: (payload: { peerId: string, picture: string }) => void
    ['notification:changeDisplayName']: (payload: { peerId: string, displayName: string, oldDisplayName: string }) => void
    ['notification:changePicture']: (payload: { peerId: string, picture: string }) => void
    ['notification:producerScore']: (payload: { producerId: string, score: IMediasoupProducerScore[] }) => void
    ['notification:consumerScore']: (payload: { consumerId: string, score: { score: number } }) => void
    ['notification:moderator:mute']: () => void
    ['notification:moderator:stopVideo']: () => void
    ['notification:moderator:stopScreenSharing']: () => void
    ['notification:moderator:kick']: () => void
    ['notification:gotRole']: (payload: { peerId: string, roleId: number }) => void
    ['notification:lostRole']: (payload: { peerId: string, roleId: number }) => void
}

interface SignalingAPIConfig {
    hostname: string
    port: number
    peerId: string
    requestRetries: number
    requestTimeout: number
}
interface IServerChatMessage {
    type : 'message',
    text: string
    time: number
    name: string
    sender: string
    picture?: string
}

export default class SigalingAPI extends EventEmitterTyped<APIEvents> {
    private _socket?: SocketIOClient.Socket
    get socket(): SocketIOClient.Socket {
    	if (!this._socket) throw new Error('signaling socket is used, but not defined. call Room.join() first');

    	return this._socket;
    }
    constructor(private readonly config: SignalingAPIConfig) {
    	super();
    }

    connectToRoomId(roomId: string) {
    	console.log('connectToRoomId');
    	const signalingUrl = getSignalingUrl({
    		hostname : this.config.hostname,
    		port     : this.config.port,
    		peerId   : this.config.peerId,
    		roomId   : roomId
    	});
    	const socket = SocketIOClient(signalingUrl);

    	this._socket = socket;

    	socket.on('connect', () => {
    		logger.debug('signaling Peer "connect" event');
    	});

    	socket.on('disconnect', (reason: string) => {
    		logger.warn('signaling Peer "disconnect" event [reason:"%s"]', reason);
    		this.emit('disconnect', reason);
    		if (reason === 'io server disconnect') {
    			socket.close();
    			this._socket = undefined;
    		}
    	});
    	socket.on('reconnect_failed', () => {
    		logger.warn('signaling Peer "reconnect_failed" event');
    		this.emit('reconnect_failed');
    		socket.close();
    	});

    	socket.on('reconnect', (attemptNumber: number) => {
    		logger.debug('signaling Peer "reconnect" event [attempts:"%s"]', attemptNumber);
    		this.emit('reconnect');
    	});
    	socket.on('request', async (request: any, cb: Function) => {
    		logger.debug(
    			'socket "request" event [method:"%s", data:"%o"]',
    			request.method, request.data);
    	});

		socket.on('notification', async (notification: { method: string; data: any; }) => {
			logger.debug(
				'socket "notification" event [method:"%s", data:"%o"]',
				notification.method, notification.data
			);

			const eventName = `notification:${notification.method}`;

			if (!this.listenerCount(eventName)) {
				logger.error('unknown notification.method "%s"', notification.method);
				return
			}
			// forward events
			this.emit(eventName, notification.data);
		});
		this.on('error', (error) => {
			logger.error('error on socket "notification" event [error:"%o"]', error);
		})
    }

    async sendRequest(method: string, data: any = {}, tries = 0): Promise<any> {
    	logger.debug('sendRequest() [method:"%s", data:"%o"]', method, data);

    	try {
    		return await new Promise((resolve, reject) => {
    			this.socket.emit(
    				'request',
    				{ method, data },
    				timeoutCallback((err, response) => {
    					if (err)
    						reject(err);
    					else
    						resolve(response);
    				}, this.config.requestTimeout)
    			);
    		});
    	} catch (error) {
    		if (error instanceof SocketTimeoutError && tries+1 < this.config.requestRetries) {
    			logger.warn('sendRequest() | timeout, retrying [attempt:"%s"]', tries);

    			return await this.sendRequest(method, data, tries+1);
    		} else {
    			throw error;
    		}
    	}
    }
    close() {
    	if (this.socket) this.socket.close();
    }

    async getRouterRtpCapabilities() {
    	return await this.sendRequest('getRouterRtpCapabilities') as mediasoupClient.types.RtpCapabilities;
    }

    async createWebRtcTransport(payload: {
                forceTcp: boolean,
                producing: boolean,
                consuming: boolean
            }) {

    	const transportInfo = await this.sendRequest('createWebRtcTransport', payload);

    	return transportInfo as {
                    id: string,
                    iceParameters: mediasoupClient.types.IceParameters
                    iceCandidates: mediasoupClient.types.IceCandidate[],
                    dtlsParameters: mediasoupClient.types.DtlsParameters,
                };
    }

    async connectWebRtcTransport(payload: {
                transportId: string,
                dtlsParameters: mediasoupClient.types.DtlsParameters
            }) {
    	return await this.sendRequest('connectWebRtcTransport', payload);
    }

    async join(payload: {
                displayName : string
                picture? : string
                rtpCapabilities : mediasoupClient.types.RtpCapabilities
            }) {
    	return await this.sendRequest('join', payload) as {
                    authenticated: boolean
                    roles: number[]
                    peers: IEdumeetPeer[]
                    tracker: string
                    roomPermissions: {[key: string]: IEdumeetRole[]}
                    userRoles: {[key: string]: IEdumeetRole}
                    allowWhenRoleMissing: string[]
                    chatHistory: IServerChatMessage[]
                    fileHistory: Array<{peerId: string, magnetUri: string}>
                    lastNHistory: string[]
                    locked?: any
                    lobbyPeers: any
                    accessCode: string
                };
    }

    async produce(payload: {
                transportId: string
                kind: any
                rtpParameters: mediasoupClient.types.RtpParameters
                appData: any
            }) {
    	return await this.sendRequest('produce', payload) as {
                    id: string
                };
    }

    async pauseProducer(payload: { producerId: string }) {
    	return await this.sendRequest('pauseProducer', payload) as void;
    }
    async resumeProducer(payload: { producerId: string }) {
    	return await this.sendRequest('resumeProducer', payload) as void;
    }
    async closeProducer(payload: { producerId: string }) {
    	return await this.sendRequest('closeProducer', payload) as void;

    }

    async pauseConsumer(payload: { consumerId: string }) {
    	return await this.sendRequest('pauseConsumer', payload) as void;
    }
    async resumeConsumer(payload: { consumerId: string }) {
    	return await this.sendRequest('resumeConsumer', payload) as void;
    }
    async setConsumerPreferedLayers(payload: { consumerId: string, spatialLayer: number, temporalLayer: number }) {
    	return await this.sendRequest('setConsumerPreferedLayers', payload) as void;
    }
    async setConsumerPriority(payload: { consumerId: string, priority: number }) {
    	return await this.sendRequest('setConsumerPriority', payload) as void;
    }
    async requestConsumerKeyFrame(payload: { consumerId: string }) {
    	return await this.sendRequest('requestConsumerKeyFrame', payload) as void;
    }

    async restartIce(payload: { transportId: string }) {
    	return await this.sendRequest('restartIce', payload) as mediasoupClient.types.IceParameters;
    }

    async getTransportStats(payload: { transportId: string }) {
    	return await this.sendRequest('getTransportStats', payload);
    }
    async changeDisplayName(payload: { displayName: string }) {
    	return await this.sendRequest('changeDisplayName', payload) as void;
    }
    async changePicture(payload: { picture: string }) {
    	return await this.sendRequest('changePicture', payload) as void;
    }

    async sendFile(payload: { 
        type: 'file',
        time: number,
        sender: 'response',
        name: string,
        picture: string|undefined,
        peerId: string
        magnetUri: string
    }) {
    	return await this.sendRequest('sendFile', payload) as void;
    }

    async chatMessage(chatMessage: IServerChatMessage) {
        return await this.sendRequest('chatMessage', { chatMessage }) as void
    }

    async setRaisedHand(payload: { raisedHand: boolean }) {
        return await this.sendRequest('raisedHand', payload) as void
    }
    async lockRoom() {
        return await this.sendRequest('lockRoom') as void
    }
    async unlockRoom() {
        return await this.sendRequest('unlockRoom') as void
    }
    async setAccessCode(payload: { accessCode: string }) {
        return await this.sendRequest('setAccessCode', payload) as void
    }
    async promoteAllPeers() {
        return await this.sendRequest('promoteAllPeers') as void
    }
    async promoteLobbyPeer(payload: { peerId: string }) {
        return await this.sendRequest('promoteLobbyPeer', payload) as void
    }
    async moderatorClearChat() {
        return await this.sendRequest('moderator:clearChat') as void
    }
    async moderatorGiveRole(payload: { peerId: string, roleId: number }) {
        return await this.sendRequest('moderator:giveRole', payload) as void
    }
    async moderatorRemovePeerRole(payload: { peerId: string, roleId: number }) {
        return await this.sendRequest('moderator:removePeerRole', payload) as void
    }
    async moderatorKickPeer(payload: { peerId: string }) {
        return await this.sendRequest('moderator:kickPeer', payload) as void
    }
    async moderatorMute(payload: { peerId: string }) {
        return await this.sendRequest('moderator:mute', payload) as void
    }
    async moderatorStopVideo(payload: { peerId: string }) {
        return await this.sendRequest('moderator:stopVideo', payload) as void
    }
    async moderatorStopScreenSharing(payload: { peerId: string }) {
        return await this.sendRequest('moderator:stopScreenSharing', payload) as void
    }
    async moderatorMuteAllPeers() {
        return await this.sendRequest('moderator:muteAll') as void
    }
    async moderatorStopAllVideo() {
        return await this.sendRequest('moderator:stopAllVideo') as void
    }
    async moderatorStopAllScreenSharing() {
        return await this.sendRequest('moderator:stopAllScreenSharing') as void
    }
    async moderatorCloseMeeting() {
        return await this.sendRequest('moderator:closeMeeting') as void
    }
    async moderatorLowerPeerHand(payload: { peerId: string }) {
        return await this.sendRequest('moderator:lowerHand', payload) as void
    }

}
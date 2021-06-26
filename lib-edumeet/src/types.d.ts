import * as mediasoupClient from 'mediasoup-client';
import { Torrent } from 'webtorrent';


export type IEdumeetSimulastProfiles  = {[width: number]: mediasoupClient.types.RtpEncodingParameters[]}
export type RtpEncodingParameters = mediasoupClient.types.RtpEncodingParameters
export interface IEdumeetSimulcastConfig {
    enabled: boolean,
    screenSharing: boolean,
    adaptiveScalingFactor: number
    profiles: IEdumeetSimulastProfiles
}

export interface IMediasoupProducerScore {
    encodingIdx: number
    ssrc: number
    rid?: string
    score: number
}

export type VideoResolution = 'low'|'medium'|'high'|'veryhigh'|'ultra'

type networkPriority = mediasoupClient.types.RtpEncodingParameters['networkPriority'] & string
export interface IEdumeetConfig {
    hostname: string
    port: number
    requestRetries: number
    requestTimeout: number
    simulcast: IEdumeetSimulcastConfig
    torrentsEnabled: boolean
    opusDetailsEnabled: boolean
    spotlights: {
        lastN: number
        hideNoVideoParticipants: boolean
    }
    networkPriorities: {
        audio: networkPriority,
        mainVideo: networkPriority,
        additionalVideos: networkPriority,
        screenShare: networkPriority
    },
    defaults: {
        audio: {
            autoGainControl: boolean,
            echoCancellation: boolean,
            noiseSuppression: boolean,
            noiseThreshold: number

            sampleRate: number
            channelCount: number
            sampleSize: number
            opusStereo: boolean
            opusDtx: boolean
            opusFec: boolean
            opusPtime: number
            opusMaxPlaybackRate: number
        }
        video: {
            resolution: VideoResolution,
            aspectRatio: number
            frameRate: number
        },
        screenshare: {
            resolution: VideoResolution,
            frameRate: number
        }
    }
}

export interface IEdumeetPeer {
    id: string
    displayName: string
    avatarUrl: string
    isInLobby: boolean
    roles: Set<IEdumeetRole>
    raisedHand?: boolean
    raisedHandTimestamp?: number
}
interface IEdumeetRole {
    id: number
    label: string
    level: number
    promoteable: false
}

export interface IEdumeetProducer {
    id: string
    deviceLabel?: string
    source: string
    paused: boolean
    track: MediaStreamTrack|null
    rtpParameters: mediasoupClient.types.RtpParameters
    codec: string
}

export interface IEdumeetConsumer {
    id : string
    peerId : string
    kind : 'video'|'audio',
    score?: number
    type : any
    locallyPaused : boolean
    remotelyPaused : boolean
    rtpParameters : mediasoupClient.types.RtpParameters
    source : string
    width : number
    height : number
    resolutionScalings : number[]|undefined
    spatialLayers : number
    temporalLayers : number
    currentSpatialLayer? : any
    currentTemporalLayer? : any
    preferredSpatialLayer : number
    preferredTemporalLayer : number
    priority : number
    codec : string
    track : MediaStreamTrack
    score                  : any,
    audioGain              : any,
    opusConfig             : any
}

export interface INotificationNewConsumer {
    peerId: string
    producerId: string
    id: string
    kind: 'video'|'audio',
    rtpParameters: mediasoupClient.types.RtpParameters
    type: any
    appData: any
    producerPaused: any,
    score: any
}

export interface IEdumeetFile {

    active    : boolean,
    progress  : number,
    files     : any,
    peerId    : string,
    magnetUri : string
    torrent?  : Torrent
}

export interface IEdumeetChatMessage {
    type: 'message',
    sender: 'client'|'response'
    content: string
    time: number
    peerId: string
    profileName: string
    picture?: string
}

import { RtpEncodingParameters } from 'mediasoup-client/src/RtpParameters';

export const PC_PROPRIETARY_CONSTRAINTS =
{
	optional : [ { googDscp: true } ]
};

export const VIDEO_SIMULCAST_PROFILES: {[width: number]: RtpEncodingParameters[]} =
{
	3840 :
	[
		{ scaleResolutionDownBy: 4, maxBitrate: 1500000 },
		{ scaleResolutionDownBy: 2, maxBitrate: 4000000 },
		{ scaleResolutionDownBy: 1, maxBitrate: 10000000 }
	],
	1920 :
	[
		{ scaleResolutionDownBy: 4, maxBitrate: 750000 },
		{ scaleResolutionDownBy: 2, maxBitrate: 1500000 },
		{ scaleResolutionDownBy: 1, maxBitrate: 4000000 }
	],
	1280 :
	[
		{ scaleResolutionDownBy: 4, maxBitrate: 250000 },
		{ scaleResolutionDownBy: 2, maxBitrate: 900000 },
		{ scaleResolutionDownBy: 1, maxBitrate: 3000000 }
	],
	640 :
	[
		{ scaleResolutionDownBy: 2, maxBitrate: 250000 },
		{ scaleResolutionDownBy: 1, maxBitrate: 900000 }
	],
	320 :
	[
		{ scaleResolutionDownBy: 1, maxBitrate: 250000 }
	]
};


// Used for VP9 webcam video.
export const VIDEO_KSVC_ENCODINGS: RtpEncodingParameters[] =
[
	{ scalabilityMode: 'S3T3_KEY' }
];

// Used for VP9 desktop sharing.
export const VIDEO_SVC_ENCODINGS: RtpEncodingParameters[] =
[
	{ scalabilityMode: 'S3T3', dtx: true }
];

export const VIDEO_CONSTRAINTS_WIDTHS: {[name: string]: number} = {
	low      : 320,
	medium   : 640,
	high     : 1280,
	veryhigh : 1920,
	ultra    : 3840
};

export const PERMISSIONS = {
	// The role(s) have permission to lock/unlock a room
	CHANGE_ROOM_LOCK : 'CHANGE_ROOM_LOCK',
	// The role(s) have permission to promote a peer from the lobby
	PROMOTE_PEER     : 'PROMOTE_PEER',
	// The role(s) have permission to give/remove other peers roles
	MODIFY_ROLE      : 'MODIFY_ROLE',
	// The role(s) have permission to send chat messages
	SEND_CHAT        : 'SEND_CHAT',
	// The role(s) have permission to moderate chat
	MODERATE_CHAT    : 'MODERATE_CHAT',
	// The role(s) have permission to share audio
	SHARE_AUDIO      : 'SHARE_AUDIO',
	// The role(s) have permission to share video
	SHARE_VIDEO      : 'SHARE_VIDEO',
	// The role(s) have permission to share screen
	SHARE_SCREEN     : 'SHARE_SCREEN',
	// The role(s) have permission to produce extra video
	EXTRA_VIDEO      : 'EXTRA_VIDEO',
	// The role(s) have permission to share files
	SHARE_FILE       : 'SHARE_FILE',
	// The role(s) have permission to moderate files
	MODERATE_FILES   : 'MODERATE_FILES',
	// The role(s) have permission to moderate room (e.g. kick user)
	MODERATE_ROOM    : 'MODERATE_ROOM'
};
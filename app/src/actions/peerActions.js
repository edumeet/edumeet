export const addPeer = (peer) =>
	({
		type    : 'ADD_PEER',
		payload : { peer }
	});

export const removePeer = (peerId) =>
	({
		type    : 'REMOVE_PEER',
		payload : { peerId }
	});

export const clearPeers = () =>
	({
		type : 'CLEAR_PEERS'
	});

export const setPeerDisplayName = (displayName, peerId) =>
	({
		type    : 'SET_PEER_DISPLAY_NAME',
		payload : { displayName, peerId }
	});

export const setPeerVideoInProgress = (peerId, flag) =>
	({
		type    : 'SET_PEER_VIDEO_IN_PROGRESS',
		payload : { peerId, flag }
	});

export const setPeerAudioInProgress = (peerId, flag) =>
	({
		type    : 'SET_PEER_AUDIO_IN_PROGRESS',
		payload : { peerId, flag }
	});

export const setPeerScreenInProgress = (peerId, flag) =>
	({
		type    : 'SET_PEER_SCREEN_IN_PROGRESS',
		payload : { peerId, flag }
	});

export const setPeerRaisedHand = (peerId, raisedHand, raisedHandTimestamp) =>
	({
		type    : 'SET_PEER_RAISED_HAND',
		payload : { peerId, raisedHand, raisedHandTimestamp }
	});

export const setPeerRaisedHandInProgress = (peerId, flag) =>
	({
		type    : 'SET_PEER_RAISED_HAND_IN_PROGRESS',
		payload : { peerId, flag }
	});

export const setPeerPicture = (peerId, picture) =>
	({
		type    : 'SET_PEER_PICTURE',
		payload : { peerId, picture }
	});

export const addPeerRole = (peerId, roleId) =>
	({
		type    : 'ADD_PEER_ROLE',
		payload : { peerId, roleId }
	});

export const removePeerRole = (peerId, roleId) =>
	({
		type    : 'REMOVE_PEER_ROLE',
		payload : { peerId, roleId }
	});

export const setPeerModifyRolesInProgress = (peerId, flag) =>
	({
		type    : 'SET_PEER_MODIFY_ROLES_IN_PROGRESS',
		payload : { peerId, flag }
	});

export const setPeerKickInProgress = (peerId, flag) =>
	({
		type    : 'SET_PEER_KICK_IN_PROGRESS',
		payload : { peerId, flag }
	});

export const setMutePeerInProgress = (peerId, flag) =>
	({
		type    : 'STOP_PEER_AUDIO_IN_PROGRESS',
		payload : { peerId, flag }
	});

export const setStopPeerVideoInProgress = (peerId, flag) =>
	({
		type    : 'STOP_PEER_VIDEO_IN_PROGRESS',
		payload : { peerId, flag }
	});

export const setStopPeerScreenSharingInProgress = (peerId, flag) =>
	({
		type    : 'STOP_PEER_SCREEN_SHARING_IN_PROGRESS',
		payload : { peerId, flag }
	});

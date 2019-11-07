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

export const setPeerRaiseHandState = (peerId, raiseHandState) =>
	({
		type    : 'SET_PEER_RAISE_HAND_STATE',
		payload : { peerId, raiseHandState }
	});

export const setPeerPicture = (peerId, picture) =>
	({
		type    : 'SET_PEER_PICTURE',
		payload : { peerId, picture }
	});

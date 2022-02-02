export const addLobbyPeer = (peerId) =>
	({
		type    : 'ADD_LOBBY_PEER',
		payload : { peerId }
	});

export const removeLobbyPeer = (peerId) =>
	({
		type    : 'REMOVE_LOBBY_PEER',
		payload : { peerId }
	});

export const setLobbyPeerDisplayName = (displayName, peerId) =>
	({
		type    : 'SET_LOBBY_PEER_DISPLAY_NAME',
		payload : { displayName, peerId }
	});

export const setLobbyPeerPicture = (picture, peerId) =>
	({
		type    : 'SET_LOBBY_PEER_PICTURE',
		payload : { picture, peerId }
	});

export const setLobbyPeerPromotionInProgress = (peerId, flag) =>
	({
		type    : 'SET_LOBBY_PEER_PROMOTION_IN_PROGRESS',
		payload : { peerId, flag }
	});
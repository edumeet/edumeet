export const setRoomName = (name) =>
	({
		type    : 'SET_ROOM_NAME',
		payload : { name }

	});

export const setRoomState = (state) =>
	({
		type    : 'SET_ROOM_STATE',
		payload : { state }

	});

export const setRoomActiveSpeaker = (peerId) =>
	({
		type    : 'SET_ROOM_ACTIVE_SPEAKER',
		payload : { peerId }
	});

export const setRoomLocked = () =>
	({
		type : 'SET_ROOM_LOCKED'
	});

export const setRoomUnLocked = () =>
	({
		type : 'SET_ROOM_UNLOCKED'
	});

export const setInLobby = (inLobby) =>
	({
		type    : 'SET_IN_LOBBY',
		payload : { inLobby }
	});

export const setSignInRequired = (signInRequired) =>
	({
		type    : 'SET_SIGN_IN_REQUIRED',
		payload : { signInRequired }
	});

export const setAccessCode = (accessCode) =>
	({
		type    : 'SET_ACCESS_CODE',
		payload : { accessCode }
	});

export const setJoinByAccessCode = (joinByAccessCode) =>
	({
		type    : 'SET_JOIN_BY_ACCESS_CODE',
		payload : { joinByAccessCode }
	});

export const setSettingsOpen = ({ settingsOpen }) =>
	({
		type    : 'SET_SETTINGS_OPEN',
		payload : { settingsOpen }
	});

export const setLockDialogOpen = ({ lockDialogOpen }) =>
	({
		type    : 'SET_LOCK_DIALOG_OPEN',
		payload : { lockDialogOpen }
	});

export const setFileSharingSupported = (supported) =>
	({
		type    : 'FILE_SHARING_SUPPORTED',
		payload : { supported }
	});

export const toggleConsumerWindow = (consumerId) =>
	({
		type    : 'TOGGLE_WINDOW_CONSUMER',
		payload : { consumerId }
	});

export const setToolbarsVisible = (toolbarsVisible) =>
	({
		type    : 'SET_TOOLBARS_VISIBLE',
		payload : { toolbarsVisible }
	});

export const setDisplayMode = (mode) =>
	({
		type    : 'SET_DISPLAY_MODE',
		payload : { mode }
	});

export const setSelectedPeer = (selectedPeerId) =>
	({
		type    : 'SET_SELECTED_PEER',
		payload : { selectedPeerId }
	});

export const setSpotlights = (spotlights) =>
	({
		type    : 'SET_SPOTLIGHTS',
		payload : { spotlights }
	});

export const toggleJoined = () =>
	({
		type : 'TOGGLE_JOINED'
	});

export const toggleConsumerFullscreen = (consumerId) =>
	({
		type    : 'TOGGLE_FULLSCREEN_CONSUMER',
		payload : { consumerId }
	});
export const setRoomUrl = (url) =>
{
	return {
		type    : 'SET_ROOM_URL',
		payload : { url }
	};
};

export const setRoomState = (state) =>
{
	return {
		type    : 'SET_ROOM_STATE',
		payload : { state }
	};
};

export const setRoomActiveSpeaker = (peerName) =>
{
	return {
		type    : 'SET_ROOM_ACTIVE_SPEAKER',
		payload : { peerName }
	};
};

export const setRoomLocked = () =>
{
	return {
		type : 'SET_ROOM_LOCKED'
	};
};

export const setRoomUnLocked = () =>
{
	return {
		type : 'SET_ROOM_UNLOCKED'
	};
};

export const setRoomLockedOut = () =>
{
	return {
		type : 'SET_ROOM_LOCKED_OUT'
	};
};

export const setAudioSuspended = ({ audioSuspended }) =>
{
	return {
		type    : 'SET_AUDIO_SUSPENDED',
		payload : { audioSuspended }
	};
};

export const setSettingsOpen = ({ settingsOpen }) =>
({
	type    : 'SET_SETTINGS_OPEN',
	payload : { settingsOpen }
});

export const setMe = ({ peerName, displayName, displayNameSet, device, loginEnabled }) =>
{
	return {
		type    : 'SET_ME',
		payload : { peerName, displayName, displayNameSet, device, loginEnabled }
	};
};

export const setMediaCapabilities = ({ canSendMic, canSendWebcam }) =>
{
	return {
		type    : 'SET_MEDIA_CAPABILITIES',
		payload : { canSendMic, canSendWebcam }
	};
};

export const setScreenCapabilities = ({	canShareScreen, needExtension }) =>
{
	return {
		type    : 'SET_SCREEN_CAPABILITIES',
		payload : { canShareScreen, needExtension }
	};
};

export const setCanChangeAudioDevice = (flag) =>
{
	return {
		type    : 'SET_CAN_CHANGE_AUDIO_DEVICE',
		payload : flag
	};
};

export const setAudioDevices = (devices) =>
{
	return {
		type    : 'SET_AUDIO_DEVICES',
		payload : { devices }
	};
};

export const setWebcamDevices = (devices) =>
{
	return {
		type    : 'SET_WEBCAM_DEVICES',
		payload : { devices }
	};
};

export const setFileSharingSupported = (supported) =>
{
	return {
		type    : 'FILE_SHARING_SUPPORTED',
		payload : { supported }
	};
};

export const setDisplayName = (displayName) =>
{
	return {
		type    : 'SET_DISPLAY_NAME',
		payload : { displayName }
	};
};

export const toggleAdvancedMode = () =>
{
	return {
		type : 'TOGGLE_ADVANCED_MODE'
	};
};

export const setDisplayMode = (mode) =>
	({
		type    : 'SET_DISPLAY_MODE',
		payload : { mode }
	});

export const setAudioOnlyState = (enabled) =>
{
	return {
		type    : 'SET_AUDIO_ONLY_STATE',
		payload : { enabled }
	};
};

export const setAudioOnlyInProgress = (flag) =>
{
	return {
		type    : 'SET_AUDIO_ONLY_IN_PROGRESS',
		payload : { flag }
	};
};

export const setPeerVideoInProgress = (peerName, flag) =>
{
	return {
		type    : 'SET_PEER_VIDEO_IN_PROGRESS',
		payload : { peerName, flag }
	};
};

export const setPeerAudioInProgress = (peerName, flag) =>
{
	return {
		type    : 'SET_PEER_AUDIO_IN_PROGRESS',
		payload : { peerName, flag }
	};
};

export const setPeerScreenInProgress = (peerName, flag) =>
{
	return {
		type    : 'SET_PEER_SCREEN_IN_PROGRESS',
		payload : { peerName, flag }
	};
};

export const setMyRaiseHandState = (flag) =>
{
	return {
		type    : 'SET_MY_RAISE_HAND_STATE',
		payload : { flag }
	};
};

export const toggleSettings = () =>
{
	return {
		type : 'TOGGLE_SETTINGS'
	};
};

export const toggleToolArea = () =>
{
	return {
		type : 'TOGGLE_TOOL_AREA'
	};
};

export const openToolArea = () =>
{
	return {
		type : 'OPEN_TOOL_AREA'
	};
};

export const closeToolArea = () =>
{
	return {
		type : 'CLOSE_TOOL_AREA'
	};
};

export const setToolTab = (toolTab) =>
{
	return {
		type    : 'SET_TOOL_TAB',
		payload : { toolTab }
	};
};

export const setMyRaiseHandStateInProgress = (flag) =>
{
	return {
		type    : 'SET_MY_RAISE_HAND_STATE_IN_PROGRESS',
		payload : { flag }
	};
};

export const setPeerRaiseHandState = (peerName, raiseHandState) =>
{
	return {
		type    : 'SET_PEER_RAISE_HAND_STATE',
		payload : { peerName, raiseHandState }
	};
};

export const setRestartIceInProgress = (flag) =>
{
	return {
		type    : 'SET_RESTART_ICE_IN_PROGRESS',
		payload : { flag }
	};
};

export const addProducer = (producer) =>
{
	return {
		type    : 'ADD_PRODUCER',
		payload : { producer }
	};
};

export const removeProducer = (producerId) =>
{
	return {
		type    : 'REMOVE_PRODUCER',
		payload : { producerId }
	};
};

export const setProducerPaused = (producerId, originator) =>
{
	return {
		type    : 'SET_PRODUCER_PAUSED',
		payload : { producerId, originator }
	};
};

export const setProducerResumed = (producerId, originator) =>
{
	return {
		type    : 'SET_PRODUCER_RESUMED',
		payload : { producerId, originator }
	};
};

export const setProducerTrack = (producerId, track) =>
{
	return {
		type    : 'SET_PRODUCER_TRACK',
		payload : { producerId, track }
	};
};

export const setAudioInProgress = (flag) =>
{
	return {
		type    : 'SET_AUDIO_IN_PROGRESS',
		payload : { flag }
	};
};

export const setWebcamInProgress = (flag) =>
{
	return {
		type    : 'SET_WEBCAM_IN_PROGRESS',
		payload : { flag }
	};
};

export const setScreenShareInProgress = (flag) =>
{
	return {
		type    : 'SET_SCREEN_SHARE_IN_PROGRESS',
		payload : { flag }
	};
};

export const addPeer = (peer) =>
{
	return {
		type    : 'ADD_PEER',
		payload : { peer }
	};
};

export const removePeer = (peerName) =>
{
	return {
		type    : 'REMOVE_PEER',
		payload : { peerName }
	};
};

export const setPeerDisplayName = (displayName, peerName) =>
{
	return {
		type    : 'SET_PEER_DISPLAY_NAME',
		payload : { displayName, peerName }
	};
};

export const addConsumer = (consumer, peerName) =>
{
	return {
		type    : 'ADD_CONSUMER',
		payload : { consumer, peerName }
	};
};

export const removeConsumer = (consumerId, peerName) =>
{
	return {
		type    : 'REMOVE_CONSUMER',
		payload : { consumerId, peerName }
	};
};

export const setConsumerPaused = (consumerId, originator) =>
{
	return {
		type    : 'SET_CONSUMER_PAUSED',
		payload : { consumerId, originator }
	};
};

export const setConsumerResumed = (consumerId, originator) =>
{
	return {
		type    : 'SET_CONSUMER_RESUMED',
		payload : { consumerId, originator }
	};
};

export const setConsumerEffectiveProfile = (consumerId, profile) =>
{
	return {
		type    : 'SET_CONSUMER_EFFECTIVE_PROFILE',
		payload : { consumerId, profile }
	};
};

export const setConsumerTrack = (consumerId, track) =>
{
	return {
		type    : 'SET_CONSUMER_TRACK',
		payload : { consumerId, track }
	};
};

export const setConsumerVolume = (consumerId, volume) =>
{
	return {
		type    : 'SET_CONSUMER_VOLUME',
		payload : { consumerId, volume }
	};
};

export const setProducerVolume = (producerId, volume) =>
{
	return {
		type    : 'SET_PRODUCER_VOLUME',
		payload : { producerId, volume }
	};
};

export const addNotification = (notification) =>
{
	return {
		type    : 'ADD_NOTIFICATION',
		payload : { notification }
	};
};

export const removeNotification = (notificationId) =>
{
	return {
		type    : 'REMOVE_NOTIFICATION',
		payload : { notificationId }
	};
};

export const removeAllNotifications = () =>
{
	return {
		type : 'REMOVE_ALL_NOTIFICATIONS'
	};
};

export const toggleChat = () =>
{
	return {
		type : 'TOGGLE_CHAT'
	};
};

export const toggleConsumerFullscreen = (consumerId) =>
{
	return {
		type    : 'TOGGLE_FULLSCREEN_CONSUMER',
		payload : { consumerId }
	};
};

export const toggleConsumerWindow = (consumerId) =>
{
	return {
		type    : 'TOGGLE_WINDOW_CONSUMER',
		payload : { consumerId }
	};
};

export const setToolbarsVisible = (toolbarsVisible) => ({
	type    : 'SET_TOOLBARS_VISIBLE',
	payload : { toolbarsVisible }
});

export const increaseBadge = () =>
{
	return {
		type : 'INCREASE_BADGE'
	};
};

export const toggleInputDisabled = () =>
{
	return {
		type : 'TOGGLE_INPUT_DISABLED'
	};
};

export const addUserMessage = (text) =>
{
	return {
		type    : 'ADD_NEW_USER_MESSAGE',
		payload : { text }
	};
};

export const addUserFile = (file) =>
{
	return {
		type    : 'ADD_NEW_USER_FILE',
		payload : { file }
	};
};

export const addResponseMessage = (message) =>
{
	return {
		type    : 'ADD_NEW_RESPONSE_MESSAGE',
		payload : { message }
	};
};

export const addChatHistory = (chatHistory) =>
{
	return {
		type    : 'ADD_CHAT_HISTORY',
		payload : { chatHistory }
	};
};

export const dropMessages = () =>
{
	return {
		type : 'DROP_MESSAGES'
	};
};

export const addFile = (file) =>
{
	return {
		type    : 'ADD_FILE',
		payload : { file }
	};
};

export const addFileHistory = (fileHistory) =>
{
	return {
		type    : 'ADD_FILE_HISTORY',
		payload : { fileHistory }
	};
};

export const setFileActive = (magnetUri) =>
{
	return {
		type    : 'SET_FILE_ACTIVE',
		payload : { magnetUri }
	};
};

export const setFileInActive = (magnetUri) =>
{
	return {
		type    : 'SET_FILE_INACTIVE',
		payload : { magnetUri }
	};
};

export const setFileProgress = (magnetUri, progress) =>
{
	return {
		type    : 'SET_FILE_PROGRESS',
		payload : { magnetUri, progress }
	};
};

export const setFileDone = (magnetUri, sharedFiles) =>
{
	return {
		type    : 'SET_FILE_DONE',
		payload : { magnetUri, sharedFiles }
	};
};

export const setPicture = (picture) =>
	({
		type    : 'SET_PICTURE',
		payload : { picture }
	});

export const setPeerPicture = (peerName, picture) =>
	({
		type    : 'SET_PEER_PICTURE',
		payload : { peerName, picture }
	});

export const loggedIn = () =>
	({
		type : 'LOGGED_IN'
	});

export const setSelectedPeer = (selectedPeerName) =>
	({
		type    : 'SET_SELECTED_PEER',
		payload : { selectedPeerName }
	});

export const setSpotlights = (spotlights) =>
	({
		type    : 'SET_SPOTLIGHTS',
		payload : { spotlights }
	});

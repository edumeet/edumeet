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

export const setMe = ({ peerName, displayName, displayNameSet, device }) =>
{
	return {
		type    : 'SET_ME',
		payload : { peerName, displayName, displayNameSet, device }
	};
};

export const setMediaCapabilities = ({ canSendMic, canSendWebcam }) =>
{
	return {
		type    : 'SET_MEDIA_CAPABILITIES',
		payload : { canSendMic, canSendWebcam }
	};
};

export const setCanChangeWebcam = (flag) =>
{
	return {
		type    : 'SET_CAN_CHANGE_WEBCAM',
		payload : flag
	};
};

export const setDisplayName = (displayName) =>
{
	return {
		type    : 'SET_DISPLAY_NAME',
		payload : { displayName }
	};
};

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

export const setWebcamInProgress = (flag) =>
{
	return {
		type    : 'SET_WEBCAM_IN_PROGRESS',
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

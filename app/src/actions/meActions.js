export const setMe = ({ peerId, loginEnabled }) =>
	({
		type    : 'SET_ME',
		payload : { peerId, loginEnabled }
	});

export const loggedIn = (flag) =>
	({
		type    : 'LOGGED_IN',
		payload : { flag }
	});

export const setPicture = (picture) =>
	({
		type    : 'SET_PICTURE',
		payload : { picture }
	});

export const setMediaCapabilities = ({
		canSendMic,
		canSendWebcam,
		canShareScreen,
		canShareFiles
	}) =>
	({
		type    : 'SET_MEDIA_CAPABILITIES',
		payload : { canSendMic, canSendWebcam, canShareScreen, canShareFiles }
	});

export const setAudioDevices = (devices) =>
	({
		type    : 'SET_AUDIO_DEVICES',
		payload : { devices }
	});

export const setWebcamDevices = (devices) =>
	({
		type    : 'SET_WEBCAM_DEVICES',
		payload : { devices }
	});

export const setMyRaiseHandState = (flag) =>
	({
		type    : 'SET_MY_RAISE_HAND_STATE',
		payload : { flag }
	});

export const setAudioInProgress = (flag) =>
	({
		type    : 'SET_AUDIO_IN_PROGRESS',
		payload : { flag }
	});
	
export const setWebcamInProgress = (flag) =>
	({
		type    : 'SET_WEBCAM_IN_PROGRESS',
		payload : { flag }
	});
	
export const setScreenShareInProgress = (flag) =>
	({
		type    : 'SET_SCREEN_SHARE_IN_PROGRESS',
		payload : { flag }
	});

export const setMyRaiseHandStateInProgress = (flag) =>
	({
		type    : 'SET_MY_RAISE_HAND_STATE_IN_PROGRESS',
		payload : { flag }
	});

export const setDisplayNameInProgress = (flag) =>
	({
		type    : 'SET_DISPLAY_NAME_IN_PROGRESS',
		payload : { flag }
	});

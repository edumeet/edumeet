export const setMe = ({ peerId, loginEnabled }) =>
	({
		type    : 'SET_ME',
		payload : { peerId, loginEnabled }
	});

export const setBrowser = (browser) =>
	({
		type    : 'SET_BROWSER',
		payload : { browser }
	});

export const loggedIn = (flag) =>
	({
		type    : 'LOGGED_IN',
		payload : { flag }
	});

export const addRole = (roleId) =>
	({
		type    : 'ADD_ROLE',
		payload : { roleId }
	});

export const removeRole = (roleId) =>
	({
		type    : 'REMOVE_ROLE',
		payload : { roleId }
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

export const setAudioOutputDevices = (devices) =>
	({
		type    : 'SET_AUDIO_OUTPUT_DEVICES',
		payload : { devices }
	});

export const setWebcamDevices = (devices) =>
	({
		type    : 'SET_WEBCAM_DEVICES',
		payload : { devices }
	});

export const setRaisedHand = (flag) =>
	({
		type    : 'SET_RAISED_HAND',
		payload : { flag }
	});

export const setAudioInProgress = (flag) =>
	({
		type    : 'SET_AUDIO_IN_PROGRESS',
		payload : { flag }
	});

export const setAudioOutputInProgress = (flag) =>
	({
		type    : 'SET_AUDIO_OUTPUT_IN_PROGRESS',
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

export const setRaisedHandInProgress = (flag) =>
	({
		type    : 'SET_RAISED_HAND_IN_PROGRESS',
		payload : { flag }
	});

export const setDisplayNameInProgress = (flag) =>
	({
		type    : 'SET_DISPLAY_NAME_IN_PROGRESS',
		payload : { flag }
	});

export const setIsSpeaking = (flag) =>
	({
		type    : 'SET_IS_SPEAKING',
		payload : { flag }
	});

export const setAutoMuted = (flag) =>
	({
		type    : 'SET_AUTO_MUTED',
		payload : { flag }
	});

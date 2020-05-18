export const setSelectedAudioDevice = (deviceId) =>
	({
		type    : 'CHANGE_AUDIO_DEVICE',
		payload : { deviceId }
	});

export const setSelectedAudioOutputDevice = (deviceId) =>
	({
		type    : 'CHANGE_AUDIO_OUTPUT_DEVICE',
		payload : { deviceId }
	});

export const setSelectedWebcamDevice = (deviceId) =>
	({
		type    : 'CHANGE_WEBCAM',
		payload : { deviceId }
	});

export const setVideoResolution = (resolution) =>
	({
		type    : 'SET_VIDEO_RESOLUTION',
		payload : { resolution }
	});

export const setDisplayName = (displayName) =>
	({
		type    : 'SET_DISPLAY_NAME',
		payload : { displayName }
	});

export const toggleAdvancedMode = () =>
	({
		type : 'TOGGLE_ADVANCED_MODE'
	});

export const togglePermanentTopBar = () =>
	({
		type : 'TOGGLE_PERMANENT_TOPBAR'
	});

export const toggleHiddenControls = () =>
	({
		type : 'TOGGLE_HIDDEN_CONTROLS'
	});

export const toggleNotificationSounds = () =>
	({
		type : 'TOGGLE_NOTIFICATION_SOUNDS'
	});

export const setLastN = (lastN) =>
	({
		type    : 'SET_LAST_N',
		payload : { lastN }
	});
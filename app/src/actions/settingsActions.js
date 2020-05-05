export const setSelectedAudioDevice = (deviceId) =>
	({
		type    : 'CHANGE_AUDIO_DEVICE',
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

export const setEchoCancellation = (echoCancellation) =>
	({
		type    : 'SET_ECHO_CANCELLATION',
		payload : { echoCancellation }
	});

export const setAutoGainControl = (autoGainControl) =>
	({
		type    : 'SET_AUTO_GAIN_CONTROL',
		payload : { autoGainControl }
	});

export const setNoiseSuppression = (noiseSuppression) =>
	({
		type    : 'SET_NOISE_SUPPRESSION',
		payload : { noiseSuppression }
	});

export const setDefaultAudio = (defaultAudio) =>
	({
		type    : 'SET_DEFAULT_AUDIO',
		payload : { defaultAudio }
	});

export const toggleEchoCancellation = () =>
	({
		type : 'TOGGLE_ECHO_CANCELLATION'
	});

export const toggleAutoGainControl = () =>
	({
		type : 'TOGGLE_AUTO_GAIN_CONTROL'
	});

export const toggleNoiseSuppression = () =>
	({
		type : 'TOGGLE_NOISE_SUPPRESSION'
	});

export const setLastN = (lastN) =>
	({
		type    : 'SET_LAST_N',
		payload : { lastN }
	});
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

export const setVideoFrameRate = (frameRate) =>
	({
		type    : 'SET_VIDEO_FRAME_RATE',
		payload : { frameRate }
	});

export const setScreenSharingResolution = (screenSharingResolution) =>
	({
		type    : 'SET_SCREEN_SHARING_RESOLUTION',
		payload : { screenSharingResolution }
	});

export const setScreenSharingFrameRate = (screenSharingFrameRate) =>
	({
		type    : 'SET_SCREEN_SHARING_FRAME_RATE',
		payload : { screenSharingFrameRate }
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

export const toggleButtonControlBar = () =>
	({
		type : 'TOGGLE_BUTTON_CONTROL_BAR'
	});

export const toggleDrawerOverlayed = () =>
	({
		type : 'TOGGLE_DRAWER_OVERLAYED'
	});

export const toggleShowNotifications = () =>
	({
		type : 'TOGGLE_SHOW_NOTIFICATIONS'
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

export const setVoiceActivatedUnmute = (voiceActivatedUnmute) =>
	({
		type    : 'SET_VOICE_ACTIVATED_UNMUTE',
		payload : { voiceActivatedUnmute }
	});

export const setNoiseThreshold = (noiseThreshold) =>
	({
		type    : 'SET_NOISE_THRESHOLD',
		payload : { noiseThreshold }
	});

export const setDefaultAudio = (audio) =>
	({
		type    : 'SET_DEFAULT_AUDIO',
		payload : { audio }
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
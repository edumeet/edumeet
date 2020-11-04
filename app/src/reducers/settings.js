const initialState =
{
	displayName             : `Guest ${Math.floor(Math.random() * (100000 - 10000)) + 10000}`,
	selectedWebcam          : null,
	selectedAudioDevice     : null,
	advancedMode            : false,
	autoGainControl         : false,
	echoCancellation        : true,
	noiseSuppression        : true,
	voiceActivatedUnmute    : false,
	noiseThreshold          : -50,
	audioMuted              : false,
	videoMuted              : false,
	// low, medium, high, veryhigh, ultra
	resolution              : window.config.defaultResolution || 'medium',
	frameRate               : window.config.defaultFrameRate || 15,
	screenSharingResolution : window.config.defaultScreenResolution || 'veryhigh',
	screenSharingFrameRate  : window.config.defaultScreenSharingFrameRate || 5,
	lastN                   : 4,
	permanentTopBar         : true,
	hiddenControls          : false,
	showNotifications       : true,
	notificationSounds      : true,
	mirrorOwnVideo          : true,
	buttonControlBar        : window.config.buttonControlBar || false,
	drawerOverlayed         : window.config.drawerOverlayed || true,
	aspectRatio             : window.config.viewAspectRatio || 1.777, // 16 : 9
	mediaPerms              : { audio: true, video: true },
	...window.config.defaultAudio
};

const settings = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'CHANGE_WEBCAM':
		{
			return { ...state, selectedWebcam: action.payload.deviceId };
		}

		case 'CHANGE_AUDIO_DEVICE':
		{
			return { ...state, selectedAudioDevice: action.payload.deviceId };
		}

		case 'CHANGE_AUDIO_OUTPUT_DEVICE':
		{
			return { ...state, selectedAudioOutputDevice: action.payload.deviceId };
		}

		case 'SET_DISPLAY_NAME':
		{
			const { displayName } = action.payload;

			return { ...state, displayName };
		}

		case 'TOGGLE_ADVANCED_MODE':
		{
			const advancedMode = !state.advancedMode;

			return { ...state, advancedMode };
		}

		case 'SET_SAMPLE_RATE':
		{
			const { sampleRate } = action.payload;

			return { ...state, sampleRate };
		}

		case 'SET_CHANNEL_COUNT':
		{
			const { channelCount } = action.payload;

			return { ...state, channelCount };
		}

		case 'SET_VOLUME':
		{
			const { volume } = action.payload;

			return { ...state, volume };
		}

		case 'SET_AUTO_GAIN_CONTROL':
		{
			const { autoGainControl } = action.payload;

			return { ...state, autoGainControl };
		}

		case 'SET_ECHO_CANCELLATION':
		{
			const { echoCancellation } = action.payload;

			return { ...state, echoCancellation };
		}

		case 'SET_NOISE_SUPPRESSION':
		{
			const { noiseSuppression } = action.payload;

			return { ...state, noiseSuppression };
		}

		case 'SET_VOICE_ACTIVATED_UNMUTE':
		{
			const { voiceActivatedUnmute } = action.payload;

			return { ...state, voiceActivatedUnmute };
		}

		case 'SET_NOISE_THRESHOLD':
		{
			const { noiseThreshold } = action.payload;

			return { ...state, noiseThreshold };
		}

		case 'SET_DEFAULT_AUDIO':
		{
			const { audio } = action.payload;

			return { ...state, audio };
		}

		case 'SET_SAMPLE_SIZE':
		{
			const { sampleSize } = action.payload;

			return { ...state, sampleSize };
		}

		case 'SET_ASPECT_RATIO':
		{
			const { aspectRatio } = action.payload;

			return { ...state, aspectRatio };
		}

		case 'SET_LAST_N':
		{
			const { lastN } = action.payload;

			return { ...state, lastN };
		}

		case 'TOGGLE_PERMANENT_TOPBAR':
		{
			const permanentTopBar = !state.permanentTopBar;

			return { ...state, permanentTopBar };
		}

		case 'TOGGLE_BUTTON_CONTROL_BAR':
		{
			const buttonControlBar = !state.buttonControlBar;

			return { ...state, buttonControlBar };
		}

		case 'TOGGLE_DRAWER_OVERLAYED':
		{
			const drawerOverlayed = !state.drawerOverlayed;

			return { ...state, drawerOverlayed };
		}

		case 'TOGGLE_HIDDEN_CONTROLS':
		{
			const hiddenControls = !state.hiddenControls;

			return { ...state, hiddenControls };
		}

		case 'TOGGLE_NOTIFICATION_SOUNDS':
		{
			const notificationSounds = !state.notificationSounds;

			return { ...state, notificationSounds };
		}

		case 'TOGGLE_SHOW_NOTIFICATIONS':
		{
			const showNotifications = !state.showNotifications;

			return { ...state, showNotifications };
		}

		case 'SET_VIDEO_RESOLUTION':
		{
			const { resolution } = action.payload;

			return { ...state, resolution };
		}

		case 'SET_VIDEO_FRAME_RATE':
		{
			const { frameRate } = action.payload;

			return { ...state, frameRate };
		}

		case 'SET_SCREEN_SHARING_RESOLUTION':
		{
			const { screenSharingResolution } = action.payload;

			return { ...state, screenSharingResolution };
		}

		case 'SET_SCREEN_SHARING_FRAME_RATE':
		{
			const { screenSharingFrameRate } = action.payload;

			return { ...state, screenSharingFrameRate };
		}

		case 'TOGGLE_MIRROR_OWN_VIDEO':
		{
			const mirrorOwnVideo = !state.mirrorOwnVideo;

			return { ...state, mirrorOwnVideo };
		}

		case 'SET_MEDIA_PERMS':
		{
			const { mediaPerms } = action.payload;

			return { ...state, mediaPerms };
		}

		case 'SET_AUDIO_MUTED':
		{
			const { audioMuted } = action.payload;

			return { ...state, audioMuted };
		}

		case 'SET_VIDEO_MUTED':
		{
			const { videoMuted } = action.payload;

			return { ...state, videoMuted };
		}

		default:
			return state;
	}
};

export default settings;

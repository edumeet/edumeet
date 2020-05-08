const initialState =
{
	displayName         : 'Guest',
	selectedWebcam      : null,
	selectedAudioDevice : null,
	advancedMode        : false,
	sampleRate          : 48000,
	channelCount        : 1,
	volume              : 1.0,
	autoGainControl     : true,
	echoCancellation    : true,
	noiseSuppression    : true,
	sampleSize          : 16,
	// low, medium, high, veryhigh, ultra
	resolution          : window.config.defaultResolution || 'medium',
	lastN               : 4,
	permanentTopBar     : true,
	hiddenControls      : false,
	showNotifications   : true,
	notificationSounds  : true,
	buttonControlBar    : window.config.buttonControlBar || false,
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

		case 'SET_DEFAULT_AUDIO':
		{
			const { audio } = action.payload;

			return { ...state, audio };
		}

		case 'TOGGLE_AUTO_GAIN_CONTROL':
		{
			const autoGainControl = !state.autoGainControl;

			return { ...state, autoGainControl };
		}

		case 'TOGGLE_ECHO_CANCELLATION':
		{
			const echoCancellation = !state.echoCancellation;

			return { ...state, echoCancellation };
		}

		case 'TOGGLE_NOISE_SUPPRESSION':
		{
			const noiseSuppression = !state.noiseSuppression;

			return { ...state, noiseSuppression };
		}

		case 'SET_SAMPLE_SIZE':
		{
			const { sampleSize } = action.payload;

			return { ...state, sampleSize };
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

		default:
			return state;
	}
};

export default settings;

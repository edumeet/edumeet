const initialState =
{
	displayName         : 'Guest',
	selectedWebcam      : null,
	selectedAudioDevice : null,
	advancedMode        : false,
	// low, medium, high, veryhigh, ultra
	resolution          : window.config.defaultResolution || 'medium',
	lastN               : 4,
	permanentTopBar     : true,
	hiddenControls      : false
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

		case 'TOGGLE_HIDDEN_CONTROLS':
		{
			const hiddenControls = !state.hiddenControls;

			return { ...state, hiddenControls };
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

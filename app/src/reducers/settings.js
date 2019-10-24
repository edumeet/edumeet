const initialState =
{
	displayName         : 'Guest',
	picture             : null,
	selectedWebcam      : null,
	selectedAudioDevice : null,
	advancedMode        : false,
	resolution          : 'high' // low, medium, high, veryhigh, ultra
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

		case 'SET_DISPLAY_NAME':
		{
			const { displayName } = action.payload;

			return { ...state, displayName };
		}

		case 'SET_PICTURE':
		{
			return { ...state, picture: action.payload.picture };
		}

		case 'TOGGLE_ADVANCED_MODE':
		{
			const advancedMode = !state.advancedMode;

			return { ...state, advancedMode };
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

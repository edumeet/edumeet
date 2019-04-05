const initialState =
{
	displayName         : 'Guest',
	picture             : null,
	selectedWebcam      : null,
	selectedAudioDevice : null,
	advancedMode        : false
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
			let { displayName } = action.payload;

			// Be ready for undefined displayName (so keep previous one).
			if (!displayName)
				displayName = state.displayName;

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

		default:
			return state;
	}
};

export default settings;

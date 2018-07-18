const initialState =
{
	name                  : null,
	displayName           : null,
	displayNameSet        : false,
	device                : null,
	canSendMic            : false,
	canSendWebcam         : false,
	canShareScreen        : false,
	needExtension         : false,
	canChangeAudioDevice  : false,
	audioDevices          : null,
	canChangeWebcam       : false,
	webcamDevices         : null,
	webcamInProgress      : false,
	audioInProgress       : false,
	screenShareInProgress : false,
	loginInProgress       : false,
	loginEnabled          : false,
	audioOnly             : false,
	audioOnlyInProgress   : false,
	raiseHand             : false,
	raiseHandInProgress   : false,
	restartIceInProgress  : false,
	picture               : null
};

const me = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'SET_ME':
		{
			const {
				peerName,
				displayName,
				displayNameSet,
				device,
				loginEnabled
			} = action.payload;

			return {
				...state,
				name : peerName,
				displayName,
				displayNameSet,
				device,
				loginEnabled
			};
		}

		case 'SET_MEDIA_CAPABILITIES':
		{
			const {	canSendMic, canSendWebcam } = action.payload;

			return { ...state, canSendMic, canSendWebcam };
		}

		case 'SET_SCREEN_CAPABILITIES':
		{
			const { canShareScreen, needExtension } = action.payload;

			return { ...state, canShareScreen, needExtension };
		}

		case 'SET_CAN_CHANGE_AUDIO_DEVICE':
		{
			const canChangeAudioDevice = action.payload;

			return { ...state, canChangeAudioDevice };
		}

		case 'SET_AUDIO_DEVICES':
		{
			const { devices } = action.payload;

			return { ...state, audioDevices: devices };
		}

		case 'SET_CAN_CHANGE_WEBCAM':
		{
			const canChangeWebcam = action.payload;

			return { ...state, canChangeWebcam };
		}

		case 'SET_WEBCAM_DEVICES':
		{
			const { devices } = action.payload;

			return { ...state, webcamDevices: devices };
		}

		case 'SET_AUDIO_IN_PROGRESS':
		{
			const { flag } = action.payload;

			return { ...state, audioInProgress: flag };
		}

		case 'SET_WEBCAM_IN_PROGRESS':
		{
			const { flag } = action.payload;

			return { ...state, webcamInProgress: flag };
		}

		case 'SET_SCREEN_SHARE_IN_PROGRESS':
		{
			const { flag } = action.payload;

			return { ...state, screenShareInProgress: flag };
		}

		case 'SET_LOGIN_IN_PROGRESS':
		{
			const { flag } = action.payload;

			return { ...state, loginInProgress: flag };
		}

		case 'SET_DISPLAY_NAME':
		{
			let { displayName } = action.payload;

			// Be ready for undefined displayName (so keep previous one).
			if (!displayName)
				displayName = state.displayName;

			return { ...state, displayName, displayNameSet: true };
		}

		case 'SET_AUDIO_ONLY_STATE':
		{
			const { enabled } = action.payload;

			return { ...state, audioOnly: enabled };
		}

		case 'SET_AUDIO_ONLY_IN_PROGRESS':
		{
			const { flag } = action.payload;

			return { ...state, audioOnlyInProgress: flag };
		}

		case 'SET_MY_RAISE_HAND_STATE':
		{
			const { flag } = action.payload;

			return { ...state, raiseHand: flag };
		}

		case 'SET_MY_RAISE_HAND_STATE_IN_PROGRESS':
		{
			const { flag } = action.payload;

			return { ...state, raiseHandInProgress: flag };
		}

		case 'SET_RESTART_ICE_IN_PROGRESS':
		{
			const { flag } = action.payload;

			return { ...state, restartIceInProgress: flag };
		}

		case 'SET_PICTURE':
		{
			return { ...state, picture: action.payload.picture };
		}

		default:
			return state;
	}
};

export default me;

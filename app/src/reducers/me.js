const initialState =
{
	name                  : null,
	device                : null,
	canSendMic            : false,
	canSendWebcam         : false,
	canShareScreen        : false,
	needExtension         : false,
	audioDevices          : null,
	webcamDevices         : null,
	webcamInProgress      : false,
	audioInProgress       : false,
	screenShareInProgress : false,
	loginEnabled          : false,
	raiseHand             : false,
	raiseHandInProgress   : false,
	loggedIn              : false,
	screens               : null,
	members               : [],
	memberIds             : [],
	recordState        			: 0, // 0 关闭 1打开 -1 不支持
	extend           					: null

};

const me = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'SET_ME':
		{
			const {
				peerName,
				device,
				loginEnabled,
				extend
			} = action.payload;

			return {
				...state,
				name : peerName,
				device,
				loginEnabled,
				extend
			};
		}

		case 'LOGGED_IN':
			return { ...state, loggedIn: true };

		case 'USER_LOGOUT':
			return { ...state, loggedIn: false };

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

		case 'SET_AUDIO_DEVICES':
		{
			const { devices } = action.payload;

			return { ...state, audioDevices: devices };
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

		case 'SET_RECORD_STATE':
		{
			return { ...state, recordState: action.payload.recordState };
		}

		case 'SET_SCREEN':
		{
			const { screens } = action.payload;

			return { ...state, screens };
		}

		case 'SET_MEMBERS':
		{
			const { members } = action.payload;

			return { ...state, members };
		}

		case 'SET_MEMBERS_ID':
		{
			const { memberIds } = action.payload;

			return { ...state, memberIds };
		}

		default:
			return state;
	}
};

export default me;

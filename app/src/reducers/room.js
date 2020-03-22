const initialState =
{
	name               : '',
	state              : 'new', // new/connecting/connected/disconnected/closed,
	locked             : false,
	inLobby            : false,
	signInRequired     : false,
	accessCode         : '', // access code to the room if locked and joinByAccessCode == true
	joinByAccessCode   : true, // if true: accessCode is a possibility to open the room
	activeSpeakerId    : null,
	torrentSupport     : false,
	showSettings       : false,
	fullScreenConsumer : null, // ConsumerID
	windowConsumer     : null, // ConsumerID
	toolbarsVisible    : true,
	mode               : 'democratic',
	selectedPeerId     : null,
	spotlights         : [],
	settingsOpen       : false,
	lockDialogOpen     : false,
	joined             : false
};

const room = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'SET_ROOM_NAME':
		{
			const { name } = action.payload;

			return { ...state, name };
		}

		case 'SET_ROOM_STATE':
		{
			const roomState = action.payload.state;

			if (roomState === 'connected')
				return { ...state, state: roomState };
			else
				return { ...state, state: roomState, activeSpeakerId: null };
		}

		case 'SET_ROOM_LOCKED':
		{
			return { ...state, locked: true };
		}

		case 'SET_ROOM_UNLOCKED':
		{
			return { ...state, locked: false };
		}

		case 'SET_IN_LOBBY':
		{
			const { inLobby } = action.payload;

			return { ...state, inLobby };
		}

		case 'SET_SIGN_IN_REQUIRED':
		{
			const { signInRequired } = action.payload;

			return { ...state, signInRequired };
		}

		case 'SET_ACCESS_CODE':
		{
			const { accessCode } = action.payload;

			return { ...state, accessCode };
		}

		case 'SET_JOIN_BY_ACCESS_CODE':
		{
			const { joinByAccessCode } = action.payload;

			return { ...state, joinByAccessCode };
		}

		case 'SET_LOCK_DIALOG_OPEN':
		{
			const { lockDialogOpen } = action.payload;

			return { ...state, lockDialogOpen };
		}
	
		case 'SET_SETTINGS_OPEN':
		{
			const { settingsOpen } = action.payload;

			return { ...state, settingsOpen };
		}

		case 'SET_ROOM_ACTIVE_SPEAKER':
		{
			const { peerId } = action.payload;

			return { ...state, activeSpeakerId: peerId };
		}

		case 'FILE_SHARING_SUPPORTED':
		{
			const { supported } = action.payload;

			return { ...state, torrentSupport: supported };
		}

		case 'TOGGLE_JOINED':
		{
			const joined = !state.joined;

			return { ...state, joined };
		}

		case 'TOGGLE_FULLSCREEN_CONSUMER':
		{
			const { consumerId } = action.payload;
			const currentConsumer = state.fullScreenConsumer;

			return { ...state, fullScreenConsumer: currentConsumer ? null : consumerId };
		}

		case 'TOGGLE_WINDOW_CONSUMER':
		{
			const { consumerId } = action.payload;
			const currentConsumer = state.windowConsumer;

			if (currentConsumer === consumerId)
				return { ...state, windowConsumer: null };
			else
				return { ...state, windowConsumer: consumerId };
		}

		case 'SET_TOOLBARS_VISIBLE':
		{
			const { toolbarsVisible } = action.payload;

			return { ...state, toolbarsVisible };
		}

		case 'SET_DISPLAY_MODE':
			return { ...state, mode: action.payload.mode };

		case 'SET_SELECTED_PEER':
		{
			const { selectedPeerId } = action.payload;

			return {
				...state,

				selectedPeerId : state.selectedPeerId === selectedPeerId ?
					null : selectedPeerId
			};
		}

		case 'SET_SPOTLIGHTS':
		{
			const { spotlights } = action.payload;

			return { ...state, spotlights };
		}

		default:
			return state;
	}
};

export default room;

const initialState =
{
	url                : null,
	state              : 'new', // new/connecting/connected/disconnected/closed,
	locked             : false,
	lockedOut          : false,
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
	joined             : false
};

const room = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'SET_ROOM_URL':
		{
			const { url } = action.payload;

			return { ...state, url };
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

		case 'SET_ROOM_LOCKED_OUT':
		{
			return { ...state, lockedOut: true };
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

		case 'TOGGLE_SETTINGS':
		{
			const showSettings = !state.showSettings;

			return { ...state, showSettings };
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

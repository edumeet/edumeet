const initialState =
{
	name                          : '',
	// new/connecting/connected/disconnected/closed,
	state                         : 'new',
	locked                        : false,
	inLobby                       : false,
	signInRequired                : false,
	overRoomLimit                 : false,
	// access code to the room if locked and joinByAccessCode == true
	accessCode                    : '',
	// if true: accessCode is a possibility to open the room
	joinByAccessCode              : true,
	activeSpeakerId               : null,
	torrentSupport                : false,
	showSettings                  : false,
	fullScreenConsumer            : null, // ConsumerID
	windowConsumer                : null, // ConsumerID
	toolbarsVisible               : true,
	mode                          : window.config.defaultLayout || 'democratic',
	selectedPeerId                : null,
	spotlights                    : [],
	settingsOpen                  : false,
	extraVideoOpen                : false,
	helpOpen                      : false,
	aboutOpen                     : false,
	currentSettingsTab            : 'media', // media, appearence, advanced
	lockDialogOpen                : false,
	joined                        : false,
	muteAllInProgress             : false,
	lobbyPeersPromotionInProgress : false,
	stopAllVideoInProgress        : false,
	closeMeetingInProgress        : false,
	clearChatInProgress           : false,
	clearFileSharingInProgress    : false,
	roomPermissions               : null,
	allowWhenRoleMissing          : null
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
		case 'SET_OVER_ROOM_LIMIT':
		{
			const { overRoomLimit } = action.payload;

			return { ...state, overRoomLimit };
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

		case 'SET_EXTRA_VIDEO_OPEN':
		{
			const { extraVideoOpen } = action.payload;

			return { ...state, extraVideoOpen };
		}

		case 'SET_HELP_OPEN':
		{
			const { helpOpen } = action.payload;

			return { ...state, helpOpen };
		}

		case 'SET_ABOUT_OPEN':
		{
			const { aboutOpen } = action.payload;

			return { ...state, aboutOpen };
		}

		case 'SET_SETTINGS_TAB':
		{
			const { tab } = action.payload;

			return { ...state, currentSettingsTab: tab };
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
			const joined = true;

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

		case 'CLEAR_SPOTLIGHTS':
		{
			return { ...state, spotlights: [] };
		}

		case 'SET_LOBBY_PEERS_PROMOTION_IN_PROGRESS':
			return { ...state, lobbyPeersPromotionInProgress: action.payload.flag };

		case 'MUTE_ALL_IN_PROGRESS':
			return { ...state, muteAllInProgress: action.payload.flag };

		case 'STOP_ALL_VIDEO_IN_PROGRESS':
			return { ...state, stopAllVideoInProgress: action.payload.flag };

		case 'STOP_ALL_SCREEN_SHARING_IN_PROGRESS':
			return { ...state, stopAllScreenSharingInProgress: action.payload.flag };

		case 'CLOSE_MEETING_IN_PROGRESS':
			return { ...state, closeMeetingInProgress: action.payload.flag };

		case 'CLEAR_CHAT_IN_PROGRESS':
			return { ...state, clearChatInProgress: action.payload.flag };

		case 'CLEAR_FILE_SHARING_IN_PROGRESS':
			return { ...state, clearFileSharingInProgress: action.payload.flag };

		case 'SET_ROOM_PERMISSIONS':
		{
			const { roomPermissions } = action.payload;

			return { ...state, roomPermissions };
		}

		case 'SET_ALLOW_WHEN_ROLE_MISSING':
		{
			const { allowWhenRoleMissing } = action.payload;

			return { ...state, allowWhenRoleMissing };
		}

		default:
			return state;
	}
};

export default room;

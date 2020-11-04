const initialState = {};

const peer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_PEER':
			return action.payload.peer;

		case 'SET_PEER_DISPLAY_NAME':
			return { ...state, displayName: action.payload.displayName };

		case 'SET_PEER_VIDEO_IN_PROGRESS':
			return { ...state, peerVideoInProgress: action.payload.flag };

		case 'SET_PEER_AUDIO_IN_PROGRESS':
			return { ...state, peerAudioInProgress: action.payload.flag };

		case 'SET_PEER_SCREEN_IN_PROGRESS':
			return { ...state, peerScreenInProgress: action.payload.flag };

		case 'SET_PEER_KICK_IN_PROGRESS':
			return { ...state, peerKickInProgress: action.payload.flag };

		case 'SET_PEER_MODIFY_ROLES_IN_PROGRESS':
			return { ...state, peerModifyRolesInProgress: action.payload.flag };

		case 'SET_PEER_RAISED_HAND':
			return {
				...state,
				raisedHand          : action.payload.raisedHand,
				raisedHandTimestamp : action.payload.raisedHandTimestamp
			};

		case 'SET_PEER_RAISED_HAND_IN_PROGRESS':
			return {
				...state,
				raisedHandInProgress : action.payload.flag
			};

		case 'ADD_CONSUMER':
		{
			const consumers = [ ...state.consumers, action.payload.consumer.id ];

			return { ...state, consumers };
		}

		case 'REMOVE_CONSUMER':
		{
			const consumers = state.consumers.filter((consumer) =>
				consumer !== action.payload.consumerId);

			return { ...state, consumers };
		}

		case 'SET_PEER_PICTURE':
		{
			return { ...state, picture: action.payload.picture };
		}

		case 'ADD_PEER_ROLE':
		{
			const roles = [ ...state.roles, action.payload.roleId ];

			return { ...state, roles };
		}

		case 'REMOVE_PEER_ROLE':
		{
			const roles = state.roles.filter((roleId) =>
				roleId !== action.payload.roleId);

			return { ...state, roles };
		}

		case 'STOP_PEER_AUDIO_IN_PROGRESS':
			return {
				...state,
				stopPeerAudioInProgress : action.payload.flag
			};

		case 'STOP_PEER_VIDEO_IN_PROGRESS':
			return {
				...state,
				stopPeerVideoInProgress : action.payload.flag
			};

		case 'STOP_PEER_SCREEN_SHARING_IN_PROGRESS':
			return {
				...state,
				stopPeerScreenSharingInProgress : action.payload.flag
			};
		default:
			return state;
	}
};

const peers = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_PEER':
		{
			return { ...state, [action.payload.peer.id]: peer(undefined, action) };
		}

		case 'REMOVE_PEER':
		{
			const { peerId } = action.payload;
			const newState = { ...state };

			delete newState[peerId];

			return newState;
		}

		case 'SET_PEER_DISPLAY_NAME':
		case 'SET_PEER_VIDEO_IN_PROGRESS':
		case 'SET_PEER_AUDIO_IN_PROGRESS':
		case 'SET_PEER_SCREEN_IN_PROGRESS':
		case 'SET_PEER_RAISED_HAND':
		case 'SET_PEER_RAISED_HAND_IN_PROGRESS':
		case 'SET_PEER_PICTURE':
		case 'ADD_CONSUMER':
		case 'ADD_PEER_ROLE':
		case 'REMOVE_PEER_ROLE':
		case 'STOP_PEER_AUDIO_IN_PROGRESS':
		case 'STOP_PEER_VIDEO_IN_PROGRESS':
		case 'STOP_PEER_SCREEN_SHARING_IN_PROGRESS':
		case 'SET_PEER_KICK_IN_PROGRESS':
		case 'SET_PEER_MODIFY_ROLES_IN_PROGRESS':
		case 'REMOVE_CONSUMER':
		{
			const oldPeer = state[action.payload.peerId];

			// NOTE: This means that the Peer was closed before, so it's ok.
			if (!oldPeer)
				return state;

			return { ...state, [oldPeer.id]: peer(oldPeer, action) };
		}

		case 'CLEAR_PEERS':
		{
			return initialState;
		}

		default:
			return state;
	}
};

export default peers;

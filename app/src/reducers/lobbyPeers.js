const lobbyPeer = (state = {}, action) =>
{
	switch (action.type)
	{
		case 'ADD_LOBBY_PEER':
			return { id: action.payload.peerId };

		case 'SET_LOBBY_PEER_DISPLAY_NAME':
			return { ...state, displayName: action.payload.displayName };
		case 'SET_LOBBY_PEER_PICTURE':
			return { ...state, picture: action.payload.picture };
		case 'SET_LOBBY_PEER_PROMOTION_IN_PROGRESS':
			return { ...state, promotionInProgress: action.payload.flag };

		default:
			return state;
	}
};

const lobbyPeers = (state = {}, action) =>
{
	switch (action.type)
	{
		case 'ADD_LOBBY_PEER':
		{
			return { ...state, [action.payload.peerId]: lobbyPeer(undefined, action) };
		}

		case 'REMOVE_LOBBY_PEER':
		{
			const { peerId } = action.payload;
			const newState = { ...state };

			delete newState[peerId];

			return newState;
		}

		case 'SET_LOBBY_PEER_DISPLAY_NAME':
		case 'SET_LOBBY_PEER_PICTURE':
		case 'SET_LOBBY_PEER_PROMOTION_IN_PROGRESS':
		{
			const oldLobbyPeer = state[action.payload.peerId];

			if (!oldLobbyPeer)
			{
				// Tried to update non-existent lobbyPeer. Has probably been promoted, or left.
				return state;
			}

			return { ...state, [oldLobbyPeer.id]: lobbyPeer(oldLobbyPeer, action) };
		}

		default:
			return state;
	}
};

export default lobbyPeers;

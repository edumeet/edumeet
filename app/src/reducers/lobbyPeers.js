const lobbyPeer = (state = {}, action) =>
{
	switch (action.type) 
	{
		case 'ADD_LOBBY_PEER':
			return action.payload.lobbyPeer;

		case 'SET_LOBBY_PEER_DISPLAY_NAME':
			return { ...state, displayName: action.payload.displayName };

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
			return { ...state, [action.payload.lobbyPeer.id]: lobbyPeer(undefined, action) };
		}

		case 'REMOVE_LOBBY_PEER':
		{
			const { peerId } = action.payload;
			const newState = { ...state };

			delete newState[peerId];

			return newState;
		}

		case 'SET_LOBBY_PEER_DISPLAY_NAME':
		{
			const oldLobbyPeer = state[action.payload.peerId];

			if (!oldLobbyPeer) 
			{
				throw new Error('no Peer found');
			}

			return { ...state, [oldLobbyPeer.id]: lobbyPeer(oldLobbyPeer, action) };
		}

		default:
			return state;
	}
};

export default lobbyPeers;

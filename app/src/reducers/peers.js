const peer = (state = {}, action) =>
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
		
		case 'SET_PEER_RAISE_HAND_STATE':
			return { ...state, raiseHandState: action.payload.raiseHandState };
		
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

		default:
			return state;
	}
};

const peers = (state = {}, action) =>
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
		case 'SET_PEER_RAISE_HAND_STATE':
		case 'SET_PEER_PICTURE':
		case 'ADD_CONSUMER':
		{
			const oldPeer = state[action.payload.peerId];

			if (!oldPeer) 
			{
				throw new Error('no Peer found');
			}

			return { ...state, [oldPeer.id]: peer(oldPeer, action) };
		}
		
		case 'REMOVE_CONSUMER':
		{
			const oldPeer = state[action.payload.peerId];

			// NOTE: This means that the Peer was closed before, so it's ok.
			if (!oldPeer)
				return state;

			return { ...state, [oldPeer.id]: peer(oldPeer, action) };
		}

		default:
			return state;
	}
};

export default peers;

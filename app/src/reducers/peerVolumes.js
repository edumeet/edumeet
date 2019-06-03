const initialState = {};

const peerVolumes = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'SET_ME':
		{
			const {
				peerId
			} = action.payload;

			return { ...state, [peerId]: 0 };
		}
		case 'ADD_PEER':
		{
			const { peer } = action.payload;

			return { ...state, [peer.id]: 0 };
		}

		case 'REMOVE_PEER':
		{
			const { peerId } = action.payload;
			const newState = { ...state };

			delete newState[peerId];

			return newState;
		}

		case 'SET_PEER_VOLUME':
		{
			const { peerId, volume } = action.payload;

			return { ...state, [peerId]: volume };
		}

		default:
			return state;
	}
};

export default peerVolumes;

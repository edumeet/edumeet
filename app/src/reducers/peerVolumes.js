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

			return { ...state, [peerId]: -100 };
		}
		case 'ADD_PEER':
		{
			const { peer } = action.payload;

			return { ...state, [peer.id]: -100 };
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
			const { peerId } = action.payload;
			const dBs = action.payload.volume < -100 ? -100 : action.payload.volume;

			return { ...state, [peerId]: dBs };
		}

		default:
			return state;
	}
};

export default peerVolumes;

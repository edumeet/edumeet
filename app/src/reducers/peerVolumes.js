const initialState = {};

const peerVolumes = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'SET_ME':
		{
			const {
				peerName
			} = action.payload;

			return { ...state, [peerName]: 0 };
		}
		case 'ADD_PEER':
		{
			const { peer } = action.payload;

			return { ...state, [peer.name]: 0 };
		}

		case 'REMOVE_PEER':
		{
			const { peerName } = action.payload;
			const newState = { ...state };

			delete newState[peerName];

			return newState;
		}

		case 'SET_PEER_VOLUME':
		{
			const { peerName, volume } = action.payload;

			return { ...state, [peerName]: volume };
		}

		default:
			return state;
	}
};

export default peerVolumes;

const initialState = {};

const peers = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_PEER':
		{
			const { peer } = action.payload;

			return { ...state, [peer.name]: peer };
		}

		case 'REMOVE_PEER':
		{
			const { peerName } = action.payload;
			const newState = { ...state };

			delete newState[peerName];

			return newState;
		}

		case 'SET_PEER_DISPLAY_NAME':
		{
			const { displayName, peerName } = action.payload;
			const peer = state[peerName];

			if (!peer)
				throw new Error('no Peer found');

			const newPeer = { ...peer, displayName };

			return { ...state, [newPeer.name]: newPeer };
		}

		case 'ADD_CONSUMER':
		{
			const { consumer, peerName } = action.payload;
			const peer = state[peerName];

			if (!peer)
				throw new Error('no Peer found for new Consumer');

			const newConsumers = [ ...peer.consumers, consumer.id ];
			const newPeer = { ...peer, consumers: newConsumers };

			return { ...state, [newPeer.name]: newPeer };
		}

		case 'REMOVE_CONSUMER':
		{
			const { consumerId, peerName } = action.payload;
			const peer = state[peerName];

			// NOTE: This means that the Peer was closed before, so it's ok.
			if (!peer)
				return state;

			const idx = peer.consumers.indexOf(consumerId);

			if (idx === -1)
				throw new Error('Consumer not found');

			const newConsumers = peer.consumers.slice();

			newConsumers.splice(idx, 1);

			const newPeer = { ...peer, consumers: newConsumers };

			return { ...state, [newPeer.name]: newPeer };
		}

		default:
			return state;
	}
};

export default peers;

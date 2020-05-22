const initialState = {};

const consumers = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_CONSUMER':
		{
			const { consumer } = action.payload;

			return { ...state, [consumer.id]: consumer };
		}

		case 'REMOVE_CONSUMER':
		{
			const { consumerId } = action.payload;
			const newState = { ...state };

			delete newState[consumerId];

			return newState;
		}

		case 'SET_CONSUMER_PAUSED':
		{
			const { consumerId, originator } = action.payload;
			const consumer = state[consumerId];

			let newConsumer;

			if (originator === 'local')
				newConsumer = { ...consumer, locallyPaused: true };
			else
				newConsumer = { ...consumer, remotelyPaused: true };

			return { ...state, [consumerId]: newConsumer };
		}

		case 'SET_CONSUMER_RESUMED':
		{
			const { consumerId, originator } = action.payload;
			const consumer = state[consumerId];

			let newConsumer;

			if (originator === 'local')
				newConsumer = { ...consumer, locallyPaused: false };
			else
				newConsumer = { ...consumer, remotelyPaused: false };

			return { ...state, [consumerId]: newConsumer };
		}

		case 'SET_CONSUMER_CURRENT_LAYERS':
		{
			const { consumerId, spatialLayer, temporalLayer } = action.payload;
			const consumer = state[consumerId];
			const newConsumer =
			{
				...consumer,
				currentSpatialLayer  : spatialLayer,
				currentTemporalLayer : temporalLayer
			};

			return { ...state, [consumerId]: newConsumer };
		}

		case 'SET_CONSUMER_PREFERRED_LAYERS':
		{
			const { consumerId, spatialLayer, temporalLayer } = action.payload;
			const consumer = state[consumerId];
			const newConsumer =
			{
				...consumer,
				preferredSpatialLayer  : spatialLayer,
				preferredTemporalLayer : temporalLayer
			};

			return { ...state, [consumerId]: newConsumer };
		}

		case 'SET_CONSUMER_PRIORITY':
		{
			const { consumerId, priority } = action.payload;
			const consumer = state[consumerId];
			const newConsumer = { ...consumer, priority };

			return { ...state, [consumerId]: newConsumer };
		}

		case 'SET_CONSUMER_TRACK':
		{
			const { consumerId, track } = action.payload;
			const consumer = state[consumerId];
			const newConsumer = { ...consumer, track };

			return { ...state, [consumerId]: newConsumer };
		}

		case 'SET_CONSUMER_SCORE':
		{
			const { consumerId, score } = action.payload;
			const consumer = state[consumerId];

			if (!consumer)
				return state;

			const newConsumer = { ...consumer, score };

			return { ...state, [consumerId]: newConsumer };
		}

		case 'CLEAR_CONSUMERS':
		{
			return initialState;
		}

		default:
			return state;
	}
};

export default consumers;

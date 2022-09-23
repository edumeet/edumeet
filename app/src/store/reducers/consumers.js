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

		case 'SET_CONSUMER_AUDIO_GAIN':
		{
			const { consumerId, audioGain } = action.payload;
			const consumer = state[consumerId];
			const newConsumer = { ...consumer, audioGain };

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

		case 'SET_CONSUMER_OPUS_CONFIG':
		{
			const { consumerId, opusConfig } = action.payload;
			const consumer = state[consumerId];
			const newConsumer =
			{
				...consumer,
				opusConfig
			};

			return { ...state, [consumerId]: newConsumer };
		}

		case 'ADD_PATH_TO_DRAW_CONSUMER':
		{
			const { producerId, path, srcWidth } = action.payload;

			let consumer;

			for (const tmpConsumer of Object.values(state))
			{
				if (producerId === tmpConsumer.producerId)
				{
					consumer = tmpConsumer;

					break;
				}
			}

			if (!consumer)
				return { ...state };

			let newPathsToDraw = consumer.pathsToDraw;

			if (!newPathsToDraw)
			{
				newPathsToDraw = [];
			}

			newPathsToDraw.push({ path: path, srcWidth: srcWidth });

			const newConsumer = { ...consumer, pathsToDraw: newPathsToDraw };

			return { ...state, [consumer.id]: newConsumer };
		}

		case 'REMOVE_DRAWINGS_CONSUMER':
		{
			const { producerId } = action.payload;

			if (!producerId)
			{
				Object.values(state).forEach((consumer) =>
				{
					if (consumer.pathsToDraw)
						consumer.pathsToDraw.length = 0;
				});
			}
			else
			{
				let consumer;

				for (const tmpConsumer of Object.values(state))
				{
					if (producerId === tmpConsumer.producerId)
					{
						consumer = tmpConsumer;

						break;
					}
				}

				if (consumer)
					consumer.pathsToDraw.length = 0;
			}

			return { ...state };
		}

		default:
			return state;
	}
};

export default consumers;

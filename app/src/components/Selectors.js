import { createSelector } from 'reselect';

const producersSelect = (state) => state.producers;
const consumersSelect = (state) => state.consumers;

export const spotlightsSelector = (state) => state.room.spotlights;

export const peersSelector = (state) => state.peers;

export const micProducersSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).filter((producer) => producer.source === 'mic')
);

export const webcamProducersSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).filter((producer) => producer.source === 'webcam')
);

export const screenProducersSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).filter((producer) => producer.source === 'screen')
);

export const micProducerSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).find((producer) => producer.source === 'mic')
);

export const webcamProducerSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).find((producer) => producer.source === 'webcam')
);

export const screenProducerSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).find((producer) => producer.source === 'screen')
);

export const micConsumerSelector = createSelector(
	consumersSelect,
	(consumers) => Object.values(consumers).filter((consumer) => consumer.source === 'mic')
);

export const webcamConsumerSelector = createSelector(
	consumersSelect,
	(consumers) => Object.values(consumers).filter((consumer) => consumer.source === 'webcam')
);

export const screenConsumerSelector = createSelector(
	consumersSelect,
	(consumers) => Object.values(consumers).filter((consumer) => consumer.source === 'screen')
);

export const spotlightsLengthSelector = createSelector(
	spotlightsSelector,
	(spotlights) => (spotlights ? spotlights.length : 0)
);

export const videoBoxesSelector = createSelector(
	spotlightsLengthSelector,
	screenProducersSelector,
	screenConsumerSelector,
	(spotlightsLength, screenProducers, screenConsumers) =>
		spotlightsLength + 1 + screenProducers.length + screenConsumers.length
);

export const meProducersSelector = createSelector(
	micProducerSelector,
	webcamProducerSelector,
	screenProducerSelector,
	(micProducer, webcamProducer, screenProducer) =>
	{
		return {
			micProducer,
			webcamProducer,
			screenProducer
		};
	}
);

const getPeerConsumers = (state, props) => state.peers[props.name].consumers;
const getAllConsumers = (state) => state.consumers;

export const makePeerConsumerSelector = () =>
{
	return createSelector(
		getPeerConsumers,
		getAllConsumers,
		(consumers, allConsumers) =>
		{
			const consumersArray = consumers
				.map((consumerId) => allConsumers[consumerId]);
			const micConsumer =
				consumersArray.find((consumer) => consumer.source === 'mic');
			const webcamConsumer =
				consumersArray.find((consumer) => consumer.source === 'webcam');
			const screenConsumer =
				consumersArray.find((consumer) => consumer.source === 'screen');

			return { micConsumer, webcamConsumer, screenConsumer };
		}
	);
};
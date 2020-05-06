import { createSelector } from 'reselect';

const producersSelect = (state) => state.producers;
const consumersSelect = (state) => state.consumers;
const spotlightsSelector = (state) => state.room.spotlights;
const peersSelector = (state) => state.peers;
const lobbyPeersSelector = (state) => state.lobbyPeers;
const getPeerConsumers = (state, id) =>
	(state.peers[id] ? state.peers[id].consumers : null);
const getAllConsumers = (state) => state.consumers;
const peersKeySelector = createSelector(
	peersSelector,
	(peers) => Object.keys(peers)
);
const peersValueSelector = createSelector(
	peersSelector,
	(peers) => Object.values(peers)
);

export const peersValueSelector = createSelector(
	peersSelector,
	(peers) => Object.values(peers)
);

export const lobbyPeersKeySelector = createSelector(
	lobbyPeersSelector,
	(lobbyPeers) => Object.keys(lobbyPeers)
);

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

export const extraVideoProducersSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).filter((producer) => producer.source === 'extravideo')
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

export const spotlightScreenConsumerSelector = createSelector(
	spotlightsSelector,
	consumersSelect,
	(spotlights, consumers) =>
		Object.values(consumers).filter(
			(consumer) => consumer.source === 'screen' && spotlights.includes(consumer.peerId)
		)
);

export const spotlightExtraVideoConsumerSelector = createSelector(
	spotlightsSelector,
	consumersSelect,
	(spotlights, consumers) =>
		Object.values(consumers).filter(
			(consumer) => consumer.source === 'extravideo' && spotlights.includes(consumer.peerId)
		)
);

export const passiveMicConsumerSelector = createSelector(
	spotlightsSelector,
	consumersSelect,
	(spotlights, consumers) =>
		Object.values(consumers).filter(
			(consumer) => consumer.source === 'mic' && !spotlights.includes(consumer.peerId)
		)
);

export const spotlightsLengthSelector = createSelector(
	spotlightsSelector,
	(spotlights) => spotlights.length
);

export const spotlightPeersSelector = createSelector(
	spotlightsSelector,
	peersKeySelector,
	(spotlights, peers) => peers.filter((peerId) => spotlights.includes(peerId))
);

export const spotlightSortedPeersSelector = createSelector(
	spotlightsSelector,
	peersValueSelector,
	(spotlights, peers) =>
		peers.filter((peer) => spotlights.includes(peer.id) && !peer.raisedHand)
			.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
);

const raisedHandSortedPeers = createSelector(
	peersValueSelector,
	(peers) => peers.filter((peer) => peer.raisedHand)
		.sort((a, b) => a.raisedHandTimestamp - b.raisedHandTimestamp)
);

const peersSortedSelector = createSelector(
	spotlightsSelector,
	peersValueSelector,
	(spotlights, peers) =>
		peers.filter((peer) => !spotlights.includes(peer.id) && !peer.raisedHand)
			.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
);

export const participantListSelector = createSelector(
	raisedHandSortedPeers,
	spotlightSortedPeersSelector,
	peersSortedSelector,
	(raisedHands, spotlights, peers) =>
		[ ...raisedHands, ...spotlights, ...peers ]
);

export const peersLengthSelector = createSelector(
	peersSelector,
	(peers) => Object.values(peers).length
);

export const passivePeersSelector = createSelector(
	peersValueSelector,
	spotlightsSelector,
	(peers, spotlights) => peers.filter((peer) => !spotlights.includes(peer.id))
		.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
);

export const raisedHandsSelector = createSelector(
	peersValueSelector,
	(peers) => peers.reduce((a, b) => (a + (b.raisedHand ? 1 : 0)), 0)
);

export const videoBoxesSelector = createSelector(
	spotlightsLengthSelector,
	screenProducersSelector,
	spotlightScreenConsumerSelector,
	extraVideoProducersSelector,
	spotlightExtraVideoConsumerSelector,
	(
		spotlightsLength,
		screenProducers,
		screenConsumers,
		extraVideoProducers,
		extraVideoConsumers
	) =>
		spotlightsLength + 1 + screenProducers.length +
		screenConsumers.length + extraVideoProducers.length +
		extraVideoConsumers.length
);

export const meProducersSelector = createSelector(
	micProducerSelector,
	webcamProducerSelector,
	screenProducerSelector,
	extraVideoProducersSelector,
	(micProducer, webcamProducer, screenProducer, extraVideoProducers) =>
	{
		return {
			micProducer,
			webcamProducer,
			screenProducer,
			extraVideoProducers
		};
	}
);

export const makePeerConsumerSelector = () =>
{
	return createSelector(
		getPeerConsumers,
		getAllConsumers,
		(consumers, allConsumers) =>
		{
			if (!consumers)
				return null;

			const consumersArray = consumers
				.map((consumerId) => allConsumers[consumerId]);
			const micConsumer =
				consumersArray.find((consumer) => consumer.source === 'mic');
			const webcamConsumer =
				consumersArray.find((consumer) => consumer.source === 'webcam');
			const screenConsumer =
				consumersArray.find((consumer) => consumer.source === 'screen');
			const extraVideoConsumers =
				consumersArray.filter((consumer) => consumer.source === 'extravideo');

			return { micConsumer, webcamConsumer, screenConsumer, extraVideoConsumers };
		}
	);
};

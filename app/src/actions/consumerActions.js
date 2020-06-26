export const addConsumer = (consumer, peerId) =>
	({
		type    : 'ADD_CONSUMER',
		payload : { consumer, peerId }
	});

export const removeConsumer = (consumerId, peerId) =>
	({
		type    : 'REMOVE_CONSUMER',
		payload : { consumerId, peerId }
	});

export const clearConsumers = () =>
	({
		type : 'CLEAR_CONSUMERS'
	});

export const setConsumerPaused = (consumerId, originator) =>
	({
		type    : 'SET_CONSUMER_PAUSED',
		payload : { consumerId, originator }
	});

export const setConsumerResumed = (consumerId, originator) =>
	({
		type    : 'SET_CONSUMER_RESUMED',
		payload : { consumerId, originator }
	});

export const setConsumerCurrentLayers = (consumerId, spatialLayer, temporalLayer) =>
	({
		type    : 'SET_CONSUMER_CURRENT_LAYERS',
		payload : { consumerId, spatialLayer, temporalLayer }
	});

export const setConsumerPreferredLayers = (consumerId, spatialLayer, temporalLayer) =>
	({
		type    : 'SET_CONSUMER_PREFERRED_LAYERS',
		payload : { consumerId, spatialLayer, temporalLayer }
	});

export const setConsumerPriority = (consumerId, priority) =>
	({
		type    : 'SET_CONSUMER_PRIORITY',
		payload : { consumerId, priority }
	});

export const setConsumerTrack = (consumerId, track) =>
	({
		type    : 'SET_CONSUMER_TRACK',
		payload : { consumerId, track }
	});

export const setConsumerScore = (consumerId, score) =>
	({
		type    : 'SET_CONSUMER_SCORE',
		payload : { consumerId, score }
	});
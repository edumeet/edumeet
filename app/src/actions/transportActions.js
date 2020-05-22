export const addTransportStats = (transport, type) =>
	({
		type    : 'ADD_TRANSPORT_STATS',
		payload : { transport, type }
	});
export const setPeerVolume = (peerId, volume) =>
	({
		type    : 'SET_PEER_VOLUME',
		payload : { peerId, volume }
	});

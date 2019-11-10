export function getSignalingUrl(peerId, roomId)
{
	const hostname = window.config.multipartyServer;
	
	const port =
		process.env.NODE_ENV !== 'production' ?
			window.config.developmentPort
			:
			window.config.productionPort;

	const url = `wss://${hostname}:${port}/?peerId=${peerId}&roomId=${roomId}`;

	return url;
}

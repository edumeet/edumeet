export function getSignalingUrl(peerId, roomId)
{
	const port =
		process.env.NODE_ENV !== 'production' ?
			window.config.developmentPort
			:
			window.config.productionPort;

	const url = `wss://${window.location.hostname}:${port}/?peerId=${peerId}&roomId=${roomId}`;

	return url;
}

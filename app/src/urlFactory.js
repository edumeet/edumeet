export function getSignalingUrl(peerName, roomId)
{
	const hostname = window.location.hostname;
	
	const port = process.env.NODE_ENV !== 'production' ? window.config.developmentPort : window.location.port;

	const url = `wss://${hostname}:${port}/?peerName=${peerName}&roomId=${roomId}`;

	return url;
}

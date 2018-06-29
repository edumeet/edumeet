export function getProtooUrl(peerName, roomId)
{
	const hostname = window.location.hostname;
	const port = window.location.port;
	const url = `wss://${hostname}:${port}/?peerName=${peerName}&roomId=${roomId}`;

	return url;
}

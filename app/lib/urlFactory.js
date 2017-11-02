export function getProtooUrl(peerName, roomId)
{
	const hostname = window.location.hostname;
	const url = `wss://${hostname}:3443/?peerName=${peerName}&roomId=${roomId}`;

	return url;
}

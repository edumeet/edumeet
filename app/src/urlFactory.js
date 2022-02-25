import { config } from './config';

export function getSignalingUrl(peerId, roomId)
{
	const hostname = config.serverHostname || window.location.hostname;
	const port =
		process.env.NODE_ENV !== 'production' ?
			config.developmentPort
			:
			config.productionPort;

	const url = `wss://${hostname}:${port}/?peerId=${peerId}&roomId=${roomId}`;

	return url;
}

/* eslint-disable no-console */
import Logger from './Logger';
const logger = new Logger('urlFactory');

export function getSignalingUrl(peerName, roomId, extend)
{
	const { displayName, serverUrl, serverPort, version, platform, mode } = extend;
	const hostname = serverUrl ? serverUrl : window.location.hostname; 
	const port = serverPort ? serverPort : window.location.port; 
	
	let url = `wss://${hostname}:${port}/?peerName=${peerName}&roomId=${roomId}&version=${version}&platform=${platform}&displayName=${displayName}&mode=${mode}`;

	if (extend.init === 'true')
	{
		const { init, adminId, startTime, stopTime, title, members } = extend;

		url = `${url}&init=${init}&adminId=${adminId}&startTime=${startTime}&stopTime=${stopTime}&title=${title}&members=${members}`;
	}
	
	logger.debug('getSignalingUrl==>', url);
	
	console.log('getSignalingUrl==>', url);
	
	return url;
}

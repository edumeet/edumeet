'use strict';

const config = require('../config');

module.exports =
{
	getProtooUrl(peerId, roomId)
	{
		let hostname = window.location.hostname;
		let port = config.protoo.listenPort;
		let url = `wss://${hostname}:${port}/?peer-id=${peerId}&room-id=${roomId}`;

		return url;
	}
};

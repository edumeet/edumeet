const os = require('os');
// const fs = require('fs');

const userRoles = require('../userRoles');

import {
	BYPASS_ROOM_LOCK,
	BYPASS_LOBBY
} from '../access';

const {
	CHANGE_ROOM_LOCK,
	PROMOTE_PEER,
	MODIFY_ROLE,
	SEND_CHAT,
	MODERATE_CHAT,
	SHARE_AUDIO,
	SHARE_VIDEO,
	SHARE_SCREEN,
	EXTRA_VIDEO,
	SHARE_FILE,
	MODERATE_FILES,
	MODERATE_ROOM
} = require('../permissions');

// const AwaitQueue = require('awaitqueue');
// const axios = require('axios');

// To gather ip address only on interface like eth0, ens0p3
const ifaceWhiteListRegex = /^(eth.*)|(ens.*)|(tun.*)/

function getListenIps() {
	let listenIP = [];
	const ifaces = os.networkInterfaces();
	Object.keys(ifaces).forEach(function (ifname) {
		if (ifname.match(ifaceWhiteListRegex)) {
			ifaces[ifname].forEach(function (iface) {
				if (
					(iface.family !== "IPv4" &&
						(iface.family !== "IPv6" || iface.scopeid !== 0)) ||
					iface.internal !== false
				) {
					// skip over internal (i.e. 127.0.0.1) and non-ipv4 or ipv6 non global addresses
					return;
				}
				listenIP.push({ ip: iface.address, announcedIp: iface.address });
			});
		}
	});
	console.log('Using listenips:', listenIP);
	return listenIP;
}

module.exports =
{
	// Mediasoup settings
	mediasoup            :
	{
		numWorkers : 2, //Object.keys(os.cpus()).length,
		// mediasoup Worker settings.
		worker     :
		{
			logLevel : 'warn',
			logTags  :
			[
				'info',
				'ice',
				'dtls',
				'rtp',
				'srtp',
				'rtcp'
			],
			rtcMinPort : 40000,
			rtcMaxPort : 49999
		},
		// mediasoup Router settings.
		router :
		{
			// Router media codecs.
			mediaCodecs :
			[
				{
					kind      : 'audio',
					mimeType  : 'audio/opus',
					clockRate : 48000,
					channels  : 2
				},
				{
					kind       : 'video',
					mimeType   : 'video/VP8',
					clockRate  : 90000,
					parameters :
					{
						'x-google-start-bitrate' : 1000
					}
				},
				{
					kind       : 'video',
					mimeType   : 'video/VP9',
					clockRate  : 90000,
					parameters :
					{
						'profile-id'             : 2,
						'x-google-start-bitrate' : 1000
					}
				},
				{
					kind       : 'video',
					mimeType   : 'video/h264',
					clockRate  : 90000,
					parameters :
					{
						'packetization-mode'      : 1,
						'profile-level-id'        : '4d0032',
						'level-asymmetry-allowed' : 1,
						'x-google-start-bitrate'  : 1000
					}
				},
				{
					kind       : 'video',
					mimeType   : 'video/h264',
					clockRate  : 90000,
					parameters :
					{
						'packetization-mode'      : 1,
						'profile-level-id'        : '42e01f',
						'level-asymmetry-allowed' : 1,
						'x-google-start-bitrate'  : 1000
					}
				}
			]
		},
		// mediasoup WebRtcTransport settings.
		webRtcTransport :
		{
			listenIps : getListenIps(),
		}
	}
};

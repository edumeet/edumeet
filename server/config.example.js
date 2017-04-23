module.exports =
{
	// DEBUG env variable For the NPM debug module.
	debug  : '*LOG* *WARN* *ERROR* *mediasoup-worker*',
	// Listening hostname for `gulp live|open`.
	domain : 'localhost',
	tls    :
	{
		cert : `${__dirname}/certs/mediasoup-demo.localhost.cert.pem`,
		key  : `${__dirname}/certs/mediasoup-demo.localhost.key.pem`
	},
	protoo :
	{
		listenIp   : '0.0.0.0',
		listenPort : 3443
	},
	mediasoup :
	{
		// mediasoup Server settings.
		logLevel : 'debug',
		logTags :
		[
			'info',
			// 'ice',
			// 'dlts',
			'rtp',
			// 'srtp',
			'rtcp',
			// 'rbe',
			'rtx'
		],
		rtcIPv4          : true,
		rtcIPv6          : true,
		rtcAnnouncedIPv4 : null,
		rtcAnnouncedIPv6 : null,
		rtcMinPort       : 40000,
		rtcMaxPort       : 49999,
		// mediasoup Room settings.
		roomCodecs :
		[
			{
				kind       : 'audio',
				name       : 'audio/opus',
				clockRate  : 48000,
				parameters :
				{
					useInbandFec : 1,
					minptime     : 10
				}
			},
			{
				kind       : 'video',
				name       : 'video/vp8',
				clockRate  : 90000
			}
		],
		// mediasoup per Peer Transport settings.
		peerTransport :
		{
			udp : true,
			tcp : true
		},
		// mediasoup per Peer max sending bitrate (in kpbs).
		maxBitrate : 500000
	}
};

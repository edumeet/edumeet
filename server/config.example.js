module.exports =
{
	// DEBUG env variable For the NPM debug module.
	debug  : '*INFO* *WARN* *ERROR* *mediasoup-worker*',
	// Listening hostname for `gulp live|open`.
	domain : 'localhost',
	tls    :
	{
		cert : `${__dirname}/certs/mediasoup-demo.localhost.cert.pem`,
		key  : `${__dirname}/certs/mediasoup-demo.localhost.key.pem`
	},
	mediasoup :
	{
		// mediasoup Server settings.
		logLevel : 'warn',
		logTags  :
		[
			'info',
			'ice',
			'dtls',
			'rtp',
			'srtp',
			'rtcp',
			'rbe',
			'rtx'
		],
		rtcIPv4          : true,
		rtcIPv6          : true,
		rtcAnnouncedIPv4 : null,
		rtcAnnouncedIPv6 : null,
		rtcMinPort       : 40000,
		rtcMaxPort       : 49999,
		// mediasoup Room codecs.
		mediaCodecs      :
		[
			{
				kind       : 'audio',
				name       : 'opus',
				clockRate  : 48000,
				channels   : 2,
				parameters :
				{
					useinbandfec : 1
				}
			},
			{
				kind      : 'video',
				name      : 'VP8',
				clockRate : 90000
			}
			// {
			// 	kind       : 'video',
			// 	name       : 'H264',
			// 	clockRate  : 90000,
			// 	parameters :
			// 	{
			// 		'packetization-mode' : 1
			// 	}
			// }
		],
		// mediasoup per Peer max sending bitrate (in bps).
		maxBitrate : 500000
	}
};

module.exports =
{
	// oAuth2 conf
	oauth2 :
	{
		client_id			: '',
		client_secret		: '',
		providerID		: '',
		redirect_uri	: 'https://mYDomainName:port/auth-callback',
		authorization_endpoint	: '',
		userinfo_endpoint : '',
		token_endpoint : '',
		scopes				: { request : [ 'openid', 'userid','profile'] },
		response_type : 'code'
	},
	// Listening hostname for `gulp live|open`.
	domain : 'localhost',
	tls    :
	{
		cert : `${__dirname}/certs/mediasoup-demo.localhost.cert.pem`,
		key  : `${__dirname}/certs/mediasoup-demo.localhost.key.pem`
	},
	// Listening port for https server.
	listeningPort : 3443,
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

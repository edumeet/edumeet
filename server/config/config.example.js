module.exports =
{
	// auth conf
	auth :
	{
		/*
		The issuer URL for OpenID Connect discovery 
		The OpenID Provider Configuration Document 
		could be discovered on: 
		issuerURL + '/.well-known/openid-configuration'
		*/
		issuerURL    	: 'https://example.com',
		clientOptions	:
		{
			client_id    	: '',
			client_secret	: '',
			scope       		: 'openid email profile',
			// where client.example.com is your multiparty meeting server 
			redirect_uri 	: 'https://client.example.com/auth/callback'
		}
	},
	// session cookie secret
	cookieSecret	: 'T0P-S3cR3t_cook!e',
	// Listening hostname for `gulp live|open`.
	domain       : 'localhost',
	tls          :
	{
		cert : `${__dirname}/../certs/mediasoup-demo.localhost.cert.pem`,
		key  : `${__dirname}/../certs/mediasoup-demo.localhost.key.pem`
	},
	// Listening port for https server.
	listeningPort         : 443,
	// Any http request is redirected to https.
	// Listening port for http server. 
	listeningRedirectPort : 80,
	// STUN/TURN
	mediasoup             :
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
			// {
			// 	kind      : 'video',
			// 	name      : 'VP8',
			// 	clockRate : 90000
			// }
			{
				kind       : 'video',
				name       : 'H264',
				clockRate  : 90000,
				parameters :
				{
					'packetization-mode'      : 1,
					'profile-level-id'        : '42e01f',
					'level-asymmetry-allowed' : 1
				}
			}
		],
		// mediasoup per Peer max sending bitrate (in bps).
		maxBitrate : 500000
	}
};

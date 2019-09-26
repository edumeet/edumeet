const os = require('os');

module.exports =
{
	// oAuth2 conf
	auth :
	{
		/*
		The issuer URL for OpenID Connect discovery 
		The OpenID Provider Configuration Document 
		could be discovered on: 
		issuerURL + '/.well-known/openid-configuration'
		*/
		issuerURL     : 'https://example.com',
		clientOptions :
		{
			client_id     : '',
			client_secret : '',
			scope       		: 'openid email profile',
			// where client.example.com is your multiparty meeting server 
			redirect_uri  : 'https://client.example.com/auth/callback'
		}
	},
	// session cookie secret
	cookieSecret : 'T0P-S3cR3t_cook!e',
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
	// Mediasoup settings
	mediasoup             :
	{
		numWorkers : Object.keys(os.cpus()).length,
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
			listenIps :
			[
				// change ip to your servers IP address!
				{ ip: '1.2.3.4', announcedIp: null }
			],
			maxIncomingBitrate              : 1500000,
			initialAvailableOutgoingBitrate : 1000000
		}
	}
};

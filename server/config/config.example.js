const os = require('os');

module.exports =
{

	// Auth conf
	/*
	auth :
	{
		lti :
		{
			consumerKey    : 'key',
			consumerSecret : 'secret'
		},
		oidc:
		{
			// The issuer URL for OpenID Connect discovery
			// The OpenID Provider Configuration Document
			// could be discovered on:
			// issuerURL + '/.well-known/openid-configuration'

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
		trustedheaders:
		{
			// The following maps http headers to the user
		        // info the application uses. The accepted keys are:
		        //
			// - id
			// - nickname
			// - name
			// - email
			// - givenName
			// - surName
			// - picture
			// - room
			// - provider
			headerMap:
			{
			    id:        'HTTP_HEADER_ID',
			    name:      'HTTP_HEADER_NAME',
			    email:     'HTTP_HEADER_MAIL',
			    givenName: 'HTTP_HEADER_GIVEN_NAME',
			    surName:   'HTTP_HEADER_SURNAME',
			    provider:  'HTTP_HEADER_ORG'
			}
		}
	},
	*/
	redisOptions : {},
	// session cookie secret
	cookieSecret : 'T0P-S3cR3t_cook!e',
	cookieName   : 'multiparty-meeting.sid',
	tls          :
	{
		cert : `${__dirname}/../certs/mediasoup-demo.localhost.cert.pem`,
		key  : `${__dirname}/../certs/mediasoup-demo.localhost.key.pem`
	},
	// listening Host or IP 
	// If omitted listens on every IP. ("0.0.0.0" and "::")
	//listeningHost: 'localhost',
	// Listening port for https server.
	listeningPort         : 443,
	// Any http request is redirected to https.
	// Listening port for http server. 
	listeningRedirectPort : 80,
	// Listens only on http, only on listeningPort
	// listeningRedirectPort disabled
	// use case: loadbalancer backend
	httpOnly              : false,
	// WebServer/Express trust proxy config for httpOnly mode
	// You can find more info:
	//  - https://expressjs.com/en/guide/behind-proxies.html
	//  - https://www.npmjs.com/package/proxy-addr
	// use case: loadbalancer backend
    trustProxy           : '',
	// If this is set to true, only signed-in users will be able
	// to join a room directly. Non-signed-in users (guests) will
	// always be put in the lobby regardless of room lock status.
	// If false, there is no difference between guests and signed-in
	// users when joining.
	requireSignInToAccess : true,
	// This flag has no effect when requireSignInToAccess is false
	// When truthy, the room will be open to all users when the first
	// authenticated user has already joined the room.
	activateOnHostJoin    : true,
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
			listenIps :
			[
				// change ip to your servers IP address!
				{ ip: '0.0.0.0', announcedIp: null }

				// Can have multiple listening interfaces
				// { ip: '::/0', announcedIp: null }
			],
			initialAvailableOutgoingBitrate : 1000000,
			minimumAvailableOutgoingBitrate : 600000,
			// Additional options that are not part of WebRtcTransportOptions.
			maxIncomingBitrate              : 1500000
		}
	}
};

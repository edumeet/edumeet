const os = require('os');
const userRoles = require('../userRoles');
// const AwaitQueue = require('awaitqueue');
// const axios = require('axios');

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

		}
	},
	*/
	// URI and key for requesting geoip-based TURN server closest to the client
	turnAPIKey        : 'examplekey',
	turnAPIURI        : 'https://example.com/api/turn',
	// Backup turnservers if REST fails or is not configured
	backupTurnServers : [
		{
			urls : [
				'turn:turn.example.com:443?transport=tcp'
			],
			username   : 'example',
			credential : 'example'
		}
	],
	redisOptions : {},
	// session cookie secret
	cookieSecret : 'T0P-S3cR3t_cook!e',
	cookieName   : 'multiparty-meeting.sid',
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
	// Listens only on http, only on listeningPort
	// listeningRedirectPort disabled
	// use case: loadbalancer backend
	httpOnly              : false,
	// This logger class will have the log function
	// called every time there is a room created or destroyed,
	// or peer created or destroyed. This would then be able
	// to log to a file or external service.
	/* StatusLogger          : class
	{
		constructor()
		{
			this._queue = new AwaitQueue();
		}

		// rooms: number of rooms
		// peers: number of peers
		// eslint-disable-next-line no-unused-vars
		async log({ rooms, peers })
		{
			this._queue.push(async () =>
			{
				// Do your logging in here, use queue to keep correct order

				// eslint-disable-next-line no-console
				console.log('Number of rooms: ', rooms);
				// eslint-disable-next-line no-console
				console.log('Number of peers: ', peers);
			})
				.catch((error) =>
				{
					// eslint-disable-next-line no-console
					console.log('error in log', error);
				});
		}
	}, */
	// WebServer/Express trust proxy config for httpOnly mode
	// You can find more info:
	//  - https://expressjs.com/en/guide/behind-proxies.html
	//  - https://www.npmjs.com/package/proxy-addr
	// use case: loadbalancer backend
	trustProxy            : '',
	// This function will be called on successful login through oidc.
	// Use this function to map your oidc userinfo to the Peer object.
	// The roomId is equal to the room name.
	// See examples below.
	// Examples:
	/*
	// All authenicated users will be MODERATOR and AUTHENTICATED
	userMapping : async ({ peer, roomId, userinfo }) =>
	{
		peer.addRole(userRoles.MODERATOR);
		peer.addRole(userRoles.AUTHENTICATED);
	},
	// All authenicated users will be AUTHENTICATED,
	// and those with the moderator role set in the userinfo
	// will also be MODERATOR
	userMapping : async ({ peer, roomId, userinfo }) =>
	{
		if (
			Array.isArray(userinfo.meet_roles) &&
			userinfo.meet_roles.includes('moderator')
		)
		{
			peer.addRole(userRoles.MODERATOR);
		}

		if (
			Array.isArray(userinfo.meet_roles) &&
			userinfo.meet_roles.includes('meetingadmin')
		)
		{
			peer.addRole(userRoles.ADMIN);
		}

		peer.addRole(userRoles.AUTHENTICATED);
	},
	// All authenicated users will be AUTHENTICATED,
	// and those with email ending with @example.com
	// will also be MODERATOR
	userMapping : async ({ peer, roomId, userinfo }) =>
	{
		if (userinfo.email && userinfo.email.endsWith('@example.com'))
		{
			peer.addRole(userRoles.MODERATOR);
		}

		peer.addRole(userRoles.AUTHENTICATED);
	}
	// All authenicated users will be AUTHENTICATED,
	// and those with email ending with @example.com
	// will also be MODERATOR
	userMapping : async ({ peer, roomId, userinfo }) =>
	{
		if (userinfo.email && userinfo.email.endsWith('@example.com'))
		{
			peer.addRole(userRoles.MODERATOR);
		}

		peer.addRole(userRoles.AUTHENTICATED);
	},
	*/
	// eslint-disable-next-line no-unused-vars
	userMapping           : async ({ peer, roomId, userinfo }) =>
	{
		if (userinfo.picture != null)
		{
			if (!userinfo.picture.match(/^http/g))
			{
				peer.picture = `data:image/jpeg;base64, ${userinfo.picture}`;
			}
			else
			{
				peer.picture = userinfo.picture;
			}
		}

		if (userinfo.nickname != null)
		{
			peer.displayName = userinfo.nickname;
		}

		if (userinfo.name != null)
		{
			peer.displayName = userinfo.name;
		}

		if (userinfo.email != null)
		{
			peer.email = userinfo.email;
		}
	},
	// Required roles for Access. All users have the role "ALL" by default.
	// Other roles need to be added in the "userMapping" function. This
	// is an Array of roles. userRoles.ADMIN have all priveleges and access
	// always.
	//
	// Example:
	// [ userRoles.MODERATOR, userRoles.AUTHENTICATED ]
	// This will allow all MODERATOR and AUTHENTICATED users access.
	requiredRolesForAccess : [ userRoles.ALL ],
	// When truthy, the room will be open to all users when as long as there
	// are allready users in the room
	activateOnHostJoin     : true,
	// Mediasoup settings
	mediasoup              :
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

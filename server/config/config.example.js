const os = require('os');
// const fs = require('fs');

const userRoles = require('../userRoles');

const {
	BYPASS_ROOM_LOCK,
	BYPASS_LOBBY
} = require('../access');

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

module.exports =
{

	// Auth conf
	/*
	auth :
	{
		// Always enabled if configured
		lti :
		{
			consumerKey    : 'key',
			consumerSecret : 'secret'
		},

		// Auth strategy to use (default oidc)
		strategy : 'oidc',
		oidc :
		{
			// The issuer URL for OpenID Connect discovery
			// The OpenID Provider Configuration Document
			// could be discovered on:
			// issuerURL + '/.well-known/openid-configuration'

			// e.g. google OIDC config
			// Follow this guide to get credential:  
			// https://developers.google.com/identity/protocols/oauth2/openid-connect
			// use this issuerURL
			// issuerURL     : 'https://accounts.google.com/',
			
			issuerURL     : 'https://example.com',
			clientOptions :
			{
				client_id     : '',
				client_secret : '',
				scope       		: 'openid email profile',
				// where client.example.com is your edumeet server
				redirect_uri  : 'https://client.example.com/auth/callback'
			}

		},
		saml :
		{
			// where edumeet.example.com is your edumeet server
			callbackUrl    : 'https://edumeet.example.com/auth/callback',
			issuer         : 'https://edumeet.example.com',
			entryPoint     : 'https://openidp.feide.no/simplesaml/saml2/idp/SSOService.php',
			privateCert    : fs.readFileSync('config/saml_privkey.pem', 'utf-8'),
			signingCert    : fs.readFileSync('config/saml_cert.pem', 'utf-8'),
			decryptionPvk  : fs.readFileSync('config/saml_privkey.pem', 'utf-8'),
			decryptionCert : fs.readFileSync('config/saml_cert.pem', 'utf-8'),
			// Federation cert
			cert           : fs.readFileSync('config/federation_cert.pem', 'utf-8')
		},

		// to create password hash use: node server/utils/password_encode.js cleartextpassword
		local :
		{
			users : [
				{
					id           : 1,
					username     : 'alice',
					passwordHash : '$2b$10$PAXXw.6cL3zJLd7ZX.AnL.sFg2nxjQPDmMmGSOQYIJSa0TrZ9azG6',
					displayName  : 'Alice',
					emails       : [ { value: 'alice@atlanta.com' } ]
				},
				{
					id           : 2,
					username     : 'bob',
					passwordHash : '$2b$10$BzAkXcZ54JxhHTqCQcFn8.H6klY/G48t4jDBeTE2d2lZJk/.tvv0G',
					displayName  : 'Bob',
					emails       : [ { value: 'bob@biloxi.com' } ]
				}
			]
		}
	},
	*/
	// URI and key for requesting geoip-based TURN server closest to the client
	turnAPIKey    : 'examplekey',
	turnAPIURI    : 'https://example.com/api/turn',
	turnAPIparams : {
		'uri_schema' 	: 'turn',
		'transport' 		: 'tcp',
		'ip_ver'    		: 'ipv4',
		'servercount'	: '2'
	},
	turnAPITimeout    : 2 * 1000,
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
	// bittorrent tracker
	fileTracker  : 'wss://tracker.lab.vvc.niif.hu:443',
	// redis server options
	redisOptions : {},
	// session cookie secret
	cookieSecret : 'T0P-S3cR3t_cook!e',
	cookieName   : 'edumeet.sid',
	// if you use encrypted private key the set the passphrase
	tls          :
	{
		cert : `${__dirname}/../certs/mediasoup-demo.localhost.cert.pem`,
		// passphrase: 'key_password'
		key  : `${__dirname}/../certs/mediasoup-demo.localhost.key.pem`
	},
	// listening Host or IP 
	// If omitted listens on every IP. ("0.0.0.0" and "::")
	// listeningHost: 'localhost',
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
	trustProxy            : '',
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

		// rooms: rooms object
		// peers: peers object
		// eslint-disable-next-line no-unused-vars
		async log({ rooms, peers })
		{
			this._queue.push(async () =>
			{
				// Do your logging in here, use queue to keep correct order

				// eslint-disable-next-line no-console
				console.log('Number of rooms: ', rooms.size);
				// eslint-disable-next-line no-console
				console.log('Number of peers: ', peers.size);
			})
				.catch((error) =>
				{
					// eslint-disable-next-line no-console
					console.log('error in log', error);
				});
		}
	}, */
	// This function will be called on successful login through oidc.
	// Use this function to map your oidc userinfo to the Peer object.
	// The roomId is equal to the room name.
	// See examples below.
	// Examples:
	/*
	// All authenicated users will be MODERATOR and AUTHENTICATED
	userMapping : async ({ peer, room, roomId, userinfo }) =>
	{
		peer.addRole(userRoles.MODERATOR);
		peer.addRole(userRoles.AUTHENTICATED);
	},
	// All authenicated users will be AUTHENTICATED,
	// and those with the moderator role set in the userinfo
	// will also be MODERATOR
	userMapping : async ({ peer, room, roomId, userinfo }) =>
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
	// First authenticated user will be moderator,
	// all others will be AUTHENTICATED
	userMapping : async ({ peer, room, roomId, userinfo }) =>
	{
		if (room)
		{
			const peers = room.getJoinedPeers();

			if (peers.some((_peer) => _peer.authenticated))
				peer.addRole(userRoles.AUTHENTICATED);
			else
			{
				peer.addRole(userRoles.MODERATOR);
				peer.addRole(userRoles.AUTHENTICATED);
			}
		}
	},
	// All authenicated users will be AUTHENTICATED,
	// and those with email ending with @example.com
	// will also be MODERATOR
	userMapping : async ({ peer, room, roomId, userinfo }) =>
	{
		if (userinfo.email && userinfo.email.endsWith('@example.com'))
		{
			peer.addRole(userRoles.MODERATOR);
		}

		peer.addRole(userRoles.AUTHENTICATED);
	},
	// All authenicated users will be AUTHENTICATED,
	// and those with email ending with @example.com
	// will also be MODERATOR
	userMapping : async ({ peer, room, roomId, userinfo }) =>
	{
		if (userinfo.email && userinfo.email.endsWith('@example.com'))
		{
			peer.addRole(userRoles.MODERATOR);
		}

		peer.addRole(userRoles.AUTHENTICATED);
	},
	*/
	// eslint-disable-next-line no-unused-vars
	userMapping           : async ({ peer, room, roomId, userinfo }) =>
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
		if (userinfo['urn:oid:0.9.2342.19200300.100.1.60'] != null)
		{
			peer.picture = `data:image/jpeg;base64, ${userinfo['urn:oid:0.9.2342.19200300.100.1.60']}`;
		}

		if (userinfo.nickname != null)
		{
			peer.displayName = userinfo.nickname;
		}

		if (userinfo.name != null)
		{
			peer.displayName = userinfo.name;
		}

		if (userinfo.displayName != null)
		{
			peer.displayName = userinfo.displayName;
		}

		if (userinfo['urn:oid:2.16.840.1.113730.3.1.241'] != null)
		{
			peer.displayName = userinfo['urn:oid:2.16.840.1.113730.3.1.241'];
		}

		if (userinfo.email != null)
		{
			peer.email = userinfo.email;
		}
	},
	// All users have the role "NORMAL" by default. Other roles need to be
	// added in the "userMapping" function. The following accesses and
	// permissions are arrays of roles. Roles can be changed in userRoles.js
	//
	// Example:
	// [ userRoles.MODERATOR, userRoles.AUTHENTICATED ]
	accessFromRoles : {
		// The role(s) will gain access to the room
		// even if it is locked (!)
		[BYPASS_ROOM_LOCK] : [ userRoles.ADMIN ],
		// The role(s) will gain access to the room without
		// going into the lobby. If you want to restrict access to your
		// server to only directly allow authenticated users, you could
		// add the userRoles.AUTHENTICATED to the user in the userMapping
		// function, and change to BYPASS_LOBBY : [ userRoles.AUTHENTICATED ]
		[BYPASS_LOBBY]     : [ userRoles.NORMAL ]
	},
	permissionsFromRoles : {
		// The role(s) have permission to lock/unlock a room
		[CHANGE_ROOM_LOCK] : [ userRoles.MODERATOR ],
		// The role(s) have permission to promote a peer from the lobby
		[PROMOTE_PEER]     : [ userRoles.NORMAL ],
		// The role(s) have permission to give/remove other peers roles
		[MODIFY_ROLE]      : [ userRoles.NORMAL ],
		// The role(s) have permission to send chat messages
		[SEND_CHAT]        : [ userRoles.NORMAL ],
		// The role(s) have permission to moderate chat
		[MODERATE_CHAT]    : [ userRoles.MODERATOR ],
		// The role(s) have permission to share audio
		[SHARE_AUDIO]      : [ userRoles.NORMAL ],
		// The role(s) have permission to share video
		[SHARE_VIDEO]      : [ userRoles.NORMAL ],
		// The role(s) have permission to share screen
		[SHARE_SCREEN]     : [ userRoles.NORMAL ],
		// The role(s) have permission to produce extra video
		[EXTRA_VIDEO]      : [ userRoles.NORMAL ],
		// The role(s) have permission to share files
		[SHARE_FILE]       : [ userRoles.NORMAL ],
		// The role(s) have permission to moderate files
		[MODERATE_FILES]   : [ userRoles.MODERATOR ],
		// The role(s) have permission to moderate room (e.g. kick user)
		[MODERATE_ROOM]    : [ userRoles.MODERATOR ]
	},
	// Array of permissions. If no peer with the permission in question
	// is in the room, all peers are permitted to do the action. The peers
	// that are allowed because of this rule will not be able to do this 
	// action as soon as a peer with the permission joins. In this example
	// everyone will be able to lock/unlock room until a MODERATOR joins.
	allowWhenRoleMissing : [ CHANGE_ROOM_LOCK ],
	// When truthy, the room will be open to all users when as long as there
	// are allready users in the room
	activateOnHostJoin   : true,
	// When set, maxUsersPerRoom defines how many users can join
	// a single room. If not set, there is no limit.
	// maxUsersPerRoom    : 20,
	// Room size before spreading to new router
	routerScaleSize      : 40,
	// Socket timout value
	requestTimeout       : 20000,
	// Socket retries when timeout
	requestRetries       : 3,
	// Mediasoup settings
	mediasoup            :
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
				// change 192.0.2.1 IPv4 to your server's IPv4 address!!
				{ ip: '192.0.2.1', announcedIp: null }

				// Can have multiple listening interfaces
				// change 2001:DB8::1 IPv6 to your server's IPv6 address!!
				// { ip: '2001:DB8::1', announcedIp: null }
			],
			initialAvailableOutgoingBitrate : 1000000,
			minimumAvailableOutgoingBitrate : 600000,
			// Additional options that are not part of WebRtcTransportOptions.
			maxIncomingBitrate              : 1500000
		}
	}

	/*
	,
	// Prometheus exporter
	prometheus : {
		deidentify : false, // deidentify IP addresses
		// listen     : 'localhost', // exporter listens on this address
		numeric    : false, // show numeric IP addresses
		port       : 8889, // allocated port
		quiet      : false // include fewer labels
	}
	*/
};

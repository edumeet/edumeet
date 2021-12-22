// const os = require('os');
// const fs = require('fs');
// const tunnel = require('tunnel');

const userRoles = require('../lib/access/roles');

const {
	BYPASS_ROOM_LOCK,
	BYPASS_LOBBY
} = require('../lib/access/access');

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
	MODERATE_ROOM,
	LOCAL_RECORD_ROOM
} = require('../lib/access/perms');

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
			},
			/*
			HttpOptions   :
			{
  				timeout: 5000,
				agent: 
				{
                	https:tunnel.httpsOverHttp({
                           proxy: {
                                host: 'proxy',
                               port: 3128
                           }
                 	})
  				}
			}
			*//*
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
					emails       : [ { value: 'alice@atlanta.com' } ],
					meet_roles   : [ ]
				},
				{
					id           : 2,
					username     : 'bob',
					passwordHash : '$2b$10$BzAkXcZ54JxhHTqCQcFn8.H6klY/G48t4jDBeTE2d2lZJk/.tvv0G',
					displayName  : 'Bob',
					emails       : [ { value: 'bob@biloxi.com' } ],
					meet_roles   : [ ]
				}
			]
		}
	},
	*/
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
	// All authenticated users will be MODERATOR and AUTHENTICATED
	userMapping : async ({ peer, room, roomId, userinfo }) =>
	{
		peer.addRole(userRoles.MODERATOR);
		peer.addRole(userRoles.AUTHENTICATED);
	},
	// All authenticated users will be AUTHENTICATED,
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
	// All authenticated users will be AUTHENTICATED,
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
	userMapping : async ({ peer, room, roomId, userinfo }) =>
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
		[CHANGE_ROOM_LOCK]  : [ userRoles.MODERATOR ],
		// The role(s) have permission to promote a peer from the lobby
		[PROMOTE_PEER]      : [ userRoles.NORMAL ],
		// The role(s) have permission to give/remove other peers roles
		[MODIFY_ROLE]       : [ userRoles.NORMAL ],
		// The role(s) have permission to send chat messages
		[SEND_CHAT]         : [ userRoles.NORMAL ],
		// The role(s) have permission to moderate chat
		[MODERATE_CHAT]     : [ userRoles.MODERATOR ],
		// The role(s) have permission to share audio
		[SHARE_AUDIO]       : [ userRoles.NORMAL ],
		// The role(s) have permission to share video
		[SHARE_VIDEO]       : [ userRoles.NORMAL ],
		// The role(s) have permission to share screen
		[SHARE_SCREEN]      : [ userRoles.NORMAL ],
		// The role(s) have permission to produce extra video
		[EXTRA_VIDEO]       : [ userRoles.NORMAL ],
		// The role(s) have permission to share files
		[SHARE_FILE]        : [ userRoles.NORMAL ],
		// The role(s) have permission to moderate files
		[MODERATE_FILES]    : [ userRoles.MODERATOR ],
		// The role(s) have permission to moderate room (e.g. kick user)
		[MODERATE_ROOM]     : [ userRoles.MODERATOR ],
		// The role(s) have permission to local record room
		[LOCAL_RECORD_ROOM] : [ userRoles.NORMAL ]
	},
	// Array of permissions. If no peer with the permission in question
	// is in the room, all peers are permitted to do the action. The peers
	// that are allowed because of this rule will not be able to do this 
	// action as soon as a peer with the permission joins. In this example
	// everyone will be able to lock/unlock room until a MODERATOR joins.
	allowWhenRoleMissing : [ CHANGE_ROOM_LOCK ]
};

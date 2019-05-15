#!/usr/bin/env node

'use strict';

process.title = 'multiparty-meeting-server';

const config = require('./config/config');
const fs = require('fs');
const http = require('http');
const spdy = require('spdy');
const express = require('express');
const compression = require('compression');
const Logger = require('./lib/Logger');
const Room = require('./lib/Room');
const utils = require('./util');
const base64 = require('base-64');
// auth
const passport = require('passport');
const { Issuer, Strategy } = require('openid-client');
const session = require('express-session')

/* eslint-disable no-console */
console.log('- process.env.DEBUG:', process.env.DEBUG);
console.log('- config.mediasoup.logLevel:', config.mediasoup.logLevel);
console.log('- config.mediasoup.logTags:', config.mediasoup.logTags);
/* eslint-enable no-console */

// Start the mediasoup server.
const mediaServer = require('./mediasoup');

const logger = new Logger();

// Map of Room instances indexed by roomId.
const rooms = new Map();

// TLS server configuration.
const tls =
{
	cert : fs.readFileSync(config.tls.cert),
	key  : fs.readFileSync(config.tls.key)
};

let app = express();
let httpsServer;
let oidcClient;
let oidcStrategy;

passport.serializeUser(function(user, done)
{
	done(null, user);
});

passport.deserializeUser(function(user, done)
{
	done(null, user);
});

const auth=config.auth;

function setupAuth(oidcIssuer)
{
	oidcClient = new oidcIssuer.Client(auth.clientOptions);
	const params = 
	{
		...auth.clientOptions
		// ... any authorization request parameters go here
		// client_id defaults to client.client_id
		// redirect_uri defaults to client.redirect_uris[0]
		// response type defaults to client.response_types[0], then 'code'
		// scope defaults to 'openid'
	};
	
	// optional, defaults to false, when true req is passed as a first
	// argument to verify fn
	const passReqToCallback = false; 
	
	// optional, defaults to false, when true the code_challenge_method will be
	// resolved from the issuer configuration, instead of true you may provide
	// any of the supported values directly, i.e. "S256" (recommended) or "plain"
	const usePKCE = false;
	const client=oidcClient;

	oidcStrategy = new Strategy(
		{ client, params, passReqToCallback, usePKCE }, 
		(tokenset, userinfo, done) => 
		{				
			let user = {
				id			: tokenset.claims.sub,
				provider	: tokenset.claims.iss,
				_userinfo   : userinfo,
				_claims     : tokenset.claims,
			};
			

			if ( typeof(userinfo.picture) !== 'undefined' ){
				if ( ! userinfo.picture.match(/^http/g) ) {
					user.Photos = [ { value: `data:image/jpeg;base64, ${userinfo.picture}` } ];
				} else {
					user.Photos= [ { value: userinfo.picture } ];
				}
			}
			
			if ( typeof(userinfo.nickname) !== 'undefined' ){
				user.displayName=userinfo.nickname;
			}

			if ( typeof(userinfo.name) !== 'undefined' ){
				user.displayName=userinfo.name;
			}
			
			if ( typeof(userinfo.email) !== 'undefined' ){
				user.emails=[{value: userinfo.email}];
			}

			if ( typeof(userinfo.given_name) !== 'undefined' ){
				user.name={givenName: userinfo.given_name};
			}

			if ( typeof(userinfo.family_name) !== 'undefined' ){
				user.name={familyName: userinfo.family_name};
			}

			if ( typeof(userinfo.middle_name) !== 'undefined' ){
				user.name={middleName: userinfo.middle_name};
			}


			return done(null, user);
		}
	);
	passport.use('oidc', oidcStrategy);

	app.use(session({
		secret: config.cookieSecret,
		resave: true,
		saveUninitialized: true,
		cookie: { secure: true }
	}));

	app.use(passport.initialize());
	app.use(passport.session());

	// login
	app.get('/auth/login', (req, res, next) =>
	{
		passport.authenticate('oidc', {
			state : base64.encode(JSON.stringify({
					roomId   : req.query.roomId,
					peerName : req.query.peerName,
					code     : utils.random(10)
			}))
		})(req, res, next);
	});

	// logout
	app.get('/auth/logout', function(req, res)
	{
		req.logout();
		res.redirect('/');
	}
	);
	// callback
	app.get(
		'/auth/callback',
		passport.authenticate('oidc', { failureRedirect: '/auth/login' }),
		(req, res) =>
		{
			const state = JSON.parse(base64.decode(req.query.state));

			if (rooms.has(state.roomId))
			{				
				let displayName,photo
				if (typeof(req.user) !== 'undefined'){
					if (typeof(req.user.displayName) !== 'undefined') displayName=req.user.displayName;
					else displayName="";
					if (
						typeof(req.user.Photos) !== 'undefined' &&
						typeof(req.user.Photos[0]) !== 'undefined' &&
						typeof(req.user.Photos[0].value) !== 'undefined'
						) photo=req.user.Photos[0].value;
					else photo="/static/media/buddy.403cb9f6.svg";
				}
								 
				const data =
				{
					peerName : state.peerName,
					name     : displayName,
					picture  : photo
				};

				const room = rooms.get(state.roomId);

				room.authCallback(data);
			}

			res.send('');
		}
	);
}

function setupWebServer() {
	app.use(compression());

	app.all('*', (req, res, next) =>
	{
		if (req.secure)
		{
			return next();
		}

		res.redirect(`https://${req.hostname}${req.url}`);
	});

	app.get('/', (req, res) =>
	{
		res.sendFile(`${__dirname}/public/chooseRoom.html`);
	});

	// Serve all files in the public folder as static files.
	app.use(express.static('public'));

	app.use((req, res) => res.sendFile(`${__dirname}/public/index.html`));

	httpsServer = spdy.createServer(tls, app);

	httpsServer.listen(config.listeningPort, '0.0.0.0', () =>
	{
		logger.info('Server running on port: ', config.listeningPort);
	});

	const httpServer = http.createServer(app);

	httpServer.listen(config.listeningRedirectPort, '0.0.0.0', () =>
	{
		logger.info('Server redirecting port: ', config.listeningRedirectPort);
	});
};

function setupSocketIO(){
	const io = require('socket.io')(httpsServer);

	// Handle connections from clients.
	io.on('connection', (socket) =>
	{
		const { roomId, peerName } = socket.handshake.query;

		if (!roomId || !peerName)
		{
			logger.warn('connection request without roomId and/or peerName');

			socket.disconnect(true);

			return;
		}

		logger.info(
			'connection request [roomId:"%s", peerName:"%s"]', roomId, peerName);

		let room;

		// If an unknown roomId, create a new Room.
		if (!rooms.has(roomId))
		{
			logger.info('creating a new Room [roomId:"%s"]', roomId);

			try
			{
				room = new Room(roomId, mediaServer, io);

				global.APP_ROOM = room;
			}
			catch (error)
			{
				logger.error('error creating a new Room: %s', error);

				socket.disconnect(true);

				return;
			}

			const logStatusTimer = setInterval(() =>
			{
				room.logStatus();
			}, 30000);

			rooms.set(roomId, room);

			room.on('close', () =>
			{
				rooms.delete(roomId);
				clearInterval(logStatusTimer);
			});
		}
		else
		{
			room = rooms.get(roomId);
		}

		socket.room = roomId;

		room.handleConnection(peerName, socket);
	});
}
if ( 
	typeof(auth) !== 'undefined' &&
	typeof(auth.issuerURL) !== 'undefined' &&
	typeof(auth.clientOptions) !== 'undefined'
)
{
	Issuer.discover(auth.issuerURL).then((oidcIssuer) => 
	{
		setupAuth(oidcIssuer);
		setupWebServer();
		setupSocketIO();
	}).catch((err) => { 
		logger.error(err); 
	}
	);
} else
{
	logger.error('Auth is not configure properly!');
	setupWebServer();
	setupSocketIO();
}


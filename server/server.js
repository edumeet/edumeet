#!/usr/bin/env node

process.title = 'edumeet-server';

const bcrypt = require('bcrypt');
const config = require('./config/config');
const fs = require('fs');
const http = require('http');
const spdy = require('spdy');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mediasoup = require('mediasoup');
const AwaitQueue = require('awaitqueue');
const Logger = require('./lib/Logger');
const Room = require('./lib/Room');
const Peer = require('./lib/Peer');
const base64 = require('base-64');
const helmet = require('helmet');
const userRoles = require('./userRoles');
const {
	loginHelper,
	logoutHelper
} = require('./httpHelper');
// auth
const passport = require('passport');
const LTIStrategy = require('passport-lti');
const imsLti = require('ims-lti');
const SAMLStrategy = require('passport-saml').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const redis = require('redis');
const redisClient = redis.createClient(config.redisOptions);
const { Issuer, Strategy } = require('openid-client');
const expressSession = require('express-session');
const RedisStore = require('connect-redis')(expressSession);
const sharedSession = require('express-socket.io-session');
const interactiveServer = require('./lib/interactiveServer');
const promExporter = require('./lib/promExporter');
const { v4: uuidv4 } = require('uuid');

/* eslint-disable no-console */
console.log('- process.env.DEBUG:', process.env.DEBUG);
console.log('- config.mediasoup.worker.logLevel:', config.mediasoup.worker.logLevel);
console.log('- config.mediasoup.worker.logTags:', config.mediasoup.worker.logTags);
/* eslint-enable no-console */

const logger = new Logger();

const queue = new AwaitQueue();

let statusLogger = null;

if ('StatusLogger' in config)
	statusLogger = new config.StatusLogger();

// mediasoup Workers.
// @type {Array<mediasoup.Worker>}
const mediasoupWorkers = [];

// Map of Room instances indexed by roomId.
const rooms = new Map();

// Map of Peer instances indexed by peerId.
const peers = new Map();

// TLS server configuration.
const tls =
{
	cert          : fs.readFileSync(config.tls.cert),
	key           : fs.readFileSync(config.tls.key),
	secureOptions : 'tlsv12',
	ciphers       :
		[
			'ECDHE-ECDSA-AES128-GCM-SHA256',
			'ECDHE-RSA-AES128-GCM-SHA256',
			'ECDHE-ECDSA-AES256-GCM-SHA384',
			'ECDHE-RSA-AES256-GCM-SHA384',
			'ECDHE-ECDSA-CHACHA20-POLY1305',
			'ECDHE-RSA-CHACHA20-POLY1305',
			'DHE-RSA-AES128-GCM-SHA256',
			'DHE-RSA-AES256-GCM-SHA384'
		].join(':'),
	honorCipherOrder : true
};

const app = express();

app.use(helmet.hsts());
const sharedCookieParser=cookieParser();

app.use(sharedCookieParser);
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

const session = expressSession({
	secret            : config.cookieSecret,
	name              : config.cookieName,
	resave            : true,
	saveUninitialized : true,
	store             : new RedisStore({ client: redisClient }),
	cookie            : {
		secure   : true,
		httpOnly : true,
		maxAge   : 60 * 60 * 1000 // Expire after 1 hour since last request from user
	}
});

if (config.trustProxy)
{
	app.set('trust proxy', config.trustProxy);
}

app.use(session);

passport.serializeUser((user, done) =>
{
	done(null, user);
});

passport.deserializeUser((user, done) =>
{
	done(null, user);
});

let mainListener;
let io;
let oidcClient;
let oidcStrategy;
let samlStrategy;
let localStrategy;

async function run()
{
	try
	{
		// Open the interactive server.
		await interactiveServer(rooms, peers);

		// start Prometheus exporter
		if (config.prometheus)
		{
			await promExporter(rooms, peers, config.prometheus);
		}

		if (typeof (config.auth) === 'undefined')
		{
			logger.warn('Auth is not configured properly!');
		}
		else
		{
			await setupAuth();
		}

		// Run a mediasoup Worker.
		await runMediasoupWorkers();

		// Run HTTPS server.
		await runHttpsServer();

		// Run WebSocketServer.
		await runWebSocketServer();

		// eslint-disable-next-line no-unused-vars
		const errorHandler = (err, req, res, next) =>
		{
			const trackingId = uuidv4();

			res.status(500).send(
				`<h1>Internal Server Error</h1>
				<p>If you report this error, please also report this 
				<i>tracking ID</i> which makes it possible to locate your session
				in the logs which are available to the system administrator: 
				<b>${trackingId}</b></p>`
			);
			logger.error(
				'Express error handler dump with tracking ID: %s, error dump: %o',
				trackingId, err);
		};

		// eslint-disable-next-line no-unused-vars
		app.use(errorHandler);
	}
	catch (error)
	{
		logger.error('run() [error:"%o"]', error);
	}
}

function statusLog()
{
	if (statusLogger)
	{
		statusLogger.log({
			rooms : rooms,
			peers : peers
		});
	}
}

function setupLTI(ltiConfig)
{

	// Add redis nonce store
	ltiConfig.nonceStore = new imsLti.Stores.RedisStore(ltiConfig.consumerKey, redisClient);
	ltiConfig.passReqToCallback = true;

	const ltiStrategy = new LTIStrategy(
		ltiConfig,
		(req, lti, done) =>
		{
			// LTI launch parameters
			if (lti)
			{
				const user = {};

				if (lti.user_id && lti.custom_room)
				{
					user.id = lti.user_id;
					user._userinfo = { 'lti': lti };
				}

				if (lti.custom_room)
				{
					user.room = lti.custom_room;
				}
				else
				{
					user.room = '';
				}
				if (lti.lis_person_name_full)
				{
					user.displayName = lti.lis_person_name_full;
				}

				// Perform local authentication if necessary
				return done(null, user);

			}
			else
			{
				return done('LTI error');
			}

		}
	);

	passport.use('lti', ltiStrategy);
}

function setupSAML()
{
	samlStrategy = new SAMLStrategy(
		config.auth.saml,
		function(profile, done)
		{
			return done(null,
				{
					id        : profile.uid,
					_userinfo : profile
				});
		}
	);

	passport.use('saml', samlStrategy);
}

function setupLocal()
{
	localStrategy = new LocalStrategy(
		function(username, plaintextPassword, done)
		{
			const found = config.auth.local.users.find((element) =>
			{
				// TODO use encrypted password
				return element.username === username &&
					bcrypt.compareSync(plaintextPassword, element.passwordHash);
			});

			if (found === undefined)
				return done(null, null);
			else
			{
				const userinfo = { ...found };

				delete userinfo.password;

				return done(null, { id: found.id, _userinfo: userinfo });
			}
		}
	);

	passport.use('local', localStrategy);
}

function setupOIDC(oidcIssuer)
{

	oidcClient = new oidcIssuer.Client(config.auth.oidc.clientOptions);

	// ... any authorization request parameters go here
	// client_id defaults to client.client_id
	// redirect_uri defaults to client.redirect_uris[0]
	// response type defaults to client.response_types[0], then 'code'
	// scope defaults to 'openid'

	/* eslint-disable camelcase */
	const params = (({
		client_id,
		redirect_uri,
		scope
	}) => ({
		client_id,
		redirect_uri,
		scope
	}))(config.auth.oidc.clientOptions);
	/* eslint-enable camelcase */

	// optional, defaults to false, when true req is passed as a first
	// argument to verify fn
	const passReqToCallback = false;

	// optional, defaults to false, when true the code_challenge_method will be
	// resolved from the issuer configuration, instead of true you may provide
	// any of the supported values directly, i.e. "S256" (recommended) or "plain"
	const usePKCE = false;

	oidcStrategy = new Strategy(
		{ client: oidcClient, params, passReqToCallback, usePKCE },
		(tokenset, userinfo, done) =>
		{
			if (userinfo && tokenset)
			{
				// eslint-disable-next-line camelcase
				userinfo._tokenset_claims = tokenset.claims();
			}

			const user =
			{
				id        : tokenset.claims.sub,
				provider  : tokenset.claims.iss,
				_userinfo : userinfo
			};

			return done(null, user);
		}
	);

	passport.use('oidc', oidcStrategy);
}

async function setupAuth()
{
	// LTI
	if (
		typeof (config.auth.lti) !== 'undefined' &&
		typeof (config.auth.lti.consumerKey) !== 'undefined' &&
		typeof (config.auth.lti.consumerSecret) !== 'undefined'
	) setupLTI(config.auth.lti);

	// OIDC
	if (
		typeof (config.auth) !== 'undefined' &&
		(
			(
				typeof (config.auth.strategy) !== 'undefined' &&
				config.auth.strategy === 'oidc'
			)
			// it is default strategy
			|| typeof (config.auth.strategy) === 'undefined'
		) &&
		typeof (config.auth.oidc) !== 'undefined' &&
		typeof (config.auth.oidc.issuerURL) !== 'undefined' &&
		typeof (config.auth.oidc.clientOptions) !== 'undefined'
	)
	{
		const oidcIssuer = await Issuer.discover(config.auth.oidc.issuerURL);

		// Setup authentication
		setupOIDC(oidcIssuer);

	}

	// SAML
	if (
		typeof (config.auth) !== 'undefined' &&
		typeof (config.auth.strategy) !== 'undefined' &&
		config.auth.strategy === 'saml' &&
		typeof (config.auth.saml) !== 'undefined' &&
		typeof (config.auth.saml.entryPoint) !== 'undefined' &&
		typeof (config.auth.saml.issuer) !== 'undefined' &&
		typeof (config.auth.saml.cert) !== 'undefined'
	)
	{
		setupSAML();
	}

	// Local
	if (
		typeof (config.auth) !== 'undefined' &&
		typeof (config.auth.strategy) !== 'undefined' &&
		config.auth.strategy === 'local' &&
		typeof (config.auth.local) !== 'undefined' &&
		typeof (config.auth.local.users) !== 'undefined'
	)
	{
		setupLocal();
	}

	app.use(passport.initialize());
	app.use(passport.session());

	// Auth strategy (by default oidc)
	const authStrategy = (config.auth && config.auth.strategy) ? config.auth.strategy : 'oidc';

	// loginparams
	app.get('/auth/login', (req, res, next) =>
	{
		const state = {
			peerId : req.query.peerId,
			roomId : req.query.roomId
		};

		if (authStrategy== 'saml' || authStrategy=='local')
		{
			req.session.authState=state;
		}

		if (authStrategy === 'local' && !(req.user && req.password))
		{
			res.redirect('/login_dialog');
		}
		else
		{
			passport.authenticate(authStrategy, {
				state : base64.encode(JSON.stringify(state))
			}
			)(req, res, next);
		}
	});

	// lti launch
	app.post('/auth/lti',
		passport.authenticate('lti', { failureRedirect: '/' }),
		(req, res) =>
		{
			res.redirect(`/${req.user.room}`);
		}
	);

	// logout
	app.get('/auth/logout', (req, res) =>
	{
		const { peerId } = req.session;

		const peer = peers.get(peerId);

		if (peer)
		{
			for (const role of peer.roles)
			{
				if (role.id !== userRoles.NORMAL.id)
					peer.removeRole(role);
			}
		}

		req.logout();
		req.session.destroy(() => res.send(logoutHelper()));
	});
	// SAML metadata
	app.get('/auth/metadata', (req, res) =>
	{
		if (config.auth && config.auth.saml &&
			config.auth.saml.decryptionCert &&
			config.auth.saml.signingCert)
		{
			const metadata = samlStrategy.generateServiceProviderMetadata(
				config.auth.saml.decryptionCert,
				config.auth.saml.signingCert
			);

			if (metadata)
			{
				res.set('Content-Type', 'text/xml');
				res.send(metadata);
			}
			else
			{
				res.status('Error generating SAML metadata', 500);
			}
		}
		else
			res.status('Missing SAML decryptionCert or signingKey from config', 500);
	});

	// callback
	app.all(
		'/auth/callback',
		passport.authenticate(authStrategy, { failureRedirect: '/auth/login', failureFlash: true }),
		async (req, res, next) =>
		{
			try
			{
				let state;

				if (authStrategy == 'saml' || authStrategy == 'local')
					state=req.session.authState;
				else
				{
					if (req.method === 'GET')
						state = JSON.parse(base64.decode(req.query.state));
					if (req.method === 'POST')
						state = JSON.parse(base64.decode(req.body.state));
				}
				const { peerId, roomId } = state;

				req.session.peerId = peerId;
				req.session.roomId = roomId;

				let peer = peers.get(peerId);
				const room = rooms.get(roomId);

				if (!peer) // User has no socket session yet, make temporary
					peer = new Peer({ id: peerId, roomId });

				if (peer.roomId !== roomId) // The peer is mischievous
					throw new Error('peer authenticated with wrong room');

				if (typeof config.userMapping === 'function')
				{
					await config.userMapping({
						peer,
						room,
						roomId,
						userinfo : req.user._userinfo
					});
				}

				peer.authenticated = true;

				res.send(loginHelper({
					displayName : peer.displayName,
					picture     : peer.picture
				}));
			}
			catch (error)
			{
				return next(error);
			}
		}
	);
}

async function runHttpsServer()
{
	app.use(compression());

	app.use('/.well-known/acme-challenge', express.static('public/.well-known/acme-challenge'));

	app.all('*', async (req, res, next) =>
	{
		if (req.secure || config.httpOnly)
		{
			let ltiURL;

			try
			{
				ltiURL = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
			}
			catch (error)
			{
				logger.error('Error parsing LTI url: %o', error);
			}

			if (
				req.isAuthenticated &&
				req.user &&
				req.user.displayName &&
				!ltiURL.searchParams.get('displayName') &&
				!isPathAlreadyTaken(req.url)
			)
			{

				ltiURL.searchParams.append('displayName', req.user.displayName);

				res.redirect(ltiURL);
			}
			else
			{
				const specialChars = "<>@!^*()[]{}:;|'\"\\,~`";

				for (let i = 0; i < specialChars.length; i++)
				{
					if (req.url.substring(1).indexOf(specialChars[i]) > -1)
					{
						req.url = `/${encodeURIComponent(encodeURI(req.url.substring(1)))}`;
						res.redirect(`${req.url}`);
					}
				}

				return next();
			}
		}
		else
			res.redirect(`https://${req.hostname}${req.url}`);

	});

	// Serve all files in the public folder as static files.
	app.use(express.static('public'));

	app.use((req, res) => res.sendFile(`${__dirname}/public/index.html`));

	if (config.httpOnly === true)
	{
		// http
		mainListener = http.createServer(app);
	}
	else
	{
		// https
		mainListener = spdy.createServer(tls, app);

		// http
		const redirectListener = http.createServer(app);

		if (config.listeningHost)
			redirectListener.listen(config.listeningRedirectPort, config.listeningHost);
		else
			redirectListener.listen(config.listeningRedirectPort);
	}

	// https or http
	if (config.listeningHost)
		mainListener.listen(config.listeningPort, config.listeningHost);
	else
		mainListener.listen(config.listeningPort);
}

function isPathAlreadyTaken(actualUrl)
{
	const alreadyTakenPath =
		[
			'/config/',
			'/static/',
			'/images/',
			'/sounds/',
			'/favicon.',
			'/auth/'
		];

	alreadyTakenPath.forEach((path) =>
	{
		if (actualUrl.toString().startsWith(path))
			return true;
	});

	return false;
}

/**
 * Create a WebSocketServer to allow WebSocket connections from browsers.
 */
async function runWebSocketServer()
{
	io = require('socket.io')(mainListener, { cookie: false });

	io.use(
		sharedSession(session, sharedCookieParser, { autoSave: true })
	);

	// Handle connections from clients.
	io.on('connection', (socket) =>
	{
		const { roomId, peerId } = socket.handshake.query;

		if (!roomId || !peerId)
		{
			logger.warn('connection request without roomId and/or peerId');

			socket.disconnect(true);

			return;
		}

		logger.info(
			'connection request [roomId:"%s", peerId:"%s"]', roomId, peerId);

		queue.push(async () =>
		{
			const { token } = socket.handshake.session;

			const room = await getOrCreateRoom({ roomId });

			let peer = peers.get(peerId);
			let returning = false;

			if (peer && !token)
			{ // Don't allow hijacking sessions
				socket.disconnect(true);

				return;
			}
			else if (token && room.verifyPeer({ id: peerId, token }))
			{ // Returning user, remove if old peer exists
				if (peer)
					peer.close();

				returning = true;
			}

			peer = new Peer({ id: peerId, roomId, socket });

			peers.set(peerId, peer);

			peer.on('close', () =>
			{
				peers.delete(peerId);

				statusLog();
			});

			if (
				Boolean(socket.handshake.session.passport) &&
				Boolean(socket.handshake.session.passport.user)
			)
			{
				const {
					id,
					displayName,
					picture,
					email,
					_userinfo
				} = socket.handshake.session.passport.user;

				peer.authId = id;
				peer.displayName = displayName;
				peer.picture = picture;
				peer.email = email;
				peer.authenticated = true;

				if (typeof config.userMapping === 'function')
				{
					await config.userMapping({ peer, room, roomId, userinfo: _userinfo });
				}
			}

			room.handlePeer({ peer, returning });

			statusLog();
		})
			.catch((error) =>
			{
				logger.error('room creation or room joining failed [error:"%o"]', error);

				if (socket)
					socket.disconnect(true);

				return;
			});
	});
}

/**
 * Launch as many mediasoup Workers as given in the configuration file.
 */
async function runMediasoupWorkers()
{
	const { numWorkers } = config.mediasoup;

	logger.info('running %d mediasoup Workers...', numWorkers);

	for (let i = 0; i < numWorkers; ++i)
	{
		const worker = await mediasoup.createWorker(
			{
				logLevel   : config.mediasoup.worker.logLevel,
				logTags    : config.mediasoup.worker.logTags,
				rtcMinPort : config.mediasoup.worker.rtcMinPort,
				rtcMaxPort : config.mediasoup.worker.rtcMaxPort
			});

		worker.on('died', () =>
		{
			logger.error(
				'mediasoup Worker died, exiting  in 2 seconds... [pid:%d]', worker.pid);

			setTimeout(() => process.exit(1), 2000);
		});

		mediasoupWorkers.push(worker);
	}
}

/**
 * Get a Room instance (or create one if it does not exist).
 */
async function getOrCreateRoom({ roomId })
{
	let room = rooms.get(roomId);

	// If the Room does not exist create a new one.
	if (!room)
	{
		logger.info('creating a new Room [roomId:"%s"]', roomId);

		// const mediasoupWorker = getMediasoupWorker();

		room = await Room.create({ mediasoupWorkers, roomId, peers });

		rooms.set(roomId, room);

		statusLog();

		room.on('close', () =>
		{
			rooms.delete(roomId);

			statusLog();
		});
	}

	return room;
}

run();

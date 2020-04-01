#!/usr/bin/env node

process.title = 'multiparty-meeting-server';

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

const {
	loginHelper,
	logoutHelper
} = require('./httpHelper');
// auth
const passport = require('passport');
const LTIStrategy = require('passport-lti');
const imsLti = require('ims-lti');
const redis = require('redis');
const redisClient = redis.createClient(config.redisOptions);
const { Issuer, Strategy } = require('openid-client');
const expressSession = require('express-session');
const RedisStore = require('connect-redis')(expressSession);
const sharedSession = require('express-socket.io-session');
const interactiveServer = require('./lib/interactiveServer');

/* eslint-disable no-console */
console.log('- process.env.DEBUG:', process.env.DEBUG);
console.log('- config.mediasoup.logLevel:', config.mediasoup.logLevel);
console.log('- config.mediasoup.logTags:', config.mediasoup.logTags);
/* eslint-enable no-console */

const logger = new Logger();

const queue = new AwaitQueue();

// mediasoup Workers.
// @type {Array<mediasoup.Worker>}
const mediasoupWorkers = [];

// Index of next mediasoup Worker to use.
// @type {Number}
let nextMediasoupWorkerIdx = 0;

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

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

if (config.trustProxy) {
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

async function run()
{
	// Open the interactive server.
	await interactiveServer(rooms, peers);

	if (typeof(config.auth) === 'undefined')
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

	// Log rooms status every 30 seconds.
	setInterval(() =>
	{
		for (const room of rooms.values())
		{
			room.logStatus();
		}
	}, 120000);

	// check for deserted rooms
	setInterval(() =>
	{
		for (const room of rooms.values())
		{
			room.checkEmpty();
		}
	}, 10000);
}

function setupLTI(ltiConfig)
{

	// Add redis nonce store
	ltiConfig.nonceStore = new imsLti.Stores.RedisStore(ltiConfig.consumerKey, redisClient);
	ltiConfig.passReqToCallback= true;

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
					user._lti = lti;
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
					user.displayName=lti.lis_person_name_full;
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

function setupOIDC(oidcIssuer)
{

	oidcClient = new oidcIssuer.Client(config.auth.oidc.clientOptions);

	// ... any authorization request parameters go here
	// client_id defaults to client.client_id
	// redirect_uri defaults to client.redirect_uris[0]
	// response type defaults to client.response_types[0], then 'code'
	// scope defaults to 'openid'
	const params = config.auth.oidc.clientOptions;

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
			const user =
			{
				id        : tokenset.claims.sub,
				provider  : tokenset.claims.iss,
				_userinfo : userinfo,
				_claims   : tokenset.claims
			};

			if (userinfo.picture != null)
			{
				if (!userinfo.picture.match(/^http/g))
				{
					user.picture = `data:image/jpeg;base64, ${userinfo.picture}`;
				}
				else
				{
					user.picture = userinfo.picture;
				}
			}

			if (userinfo.nickname != null)
			{
				user.displayName = userinfo.nickname;
			}

			if (userinfo.name != null)
			{
				user.displayName = userinfo.name;
			}

			if (userinfo.email != null)
			{
				user.email = userinfo.email;
			}

			if (userinfo.given_name != null)
			{
				user.name={};
				user.name.givenName = userinfo.given_name;
			}

			if (userinfo.family_name != null)
			{
				if (user.name == null) user.name={};
				user.name.familyName = userinfo.family_name;
			}

			if (userinfo.middle_name != null)
			{
				if (user.name == null) user.name={};
				user.name.middleName = userinfo.middle_name;
			}

			return done(null, user);
		}
	);

	passport.use('oidc', oidcStrategy);
}

async function setupAuth()
{
	// LTI
	if (
		typeof(config.auth.lti) !== 'undefined' &&
		typeof(config.auth.lti.consumerKey) !== 'undefined' &&
		typeof(config.auth.lti.consumerSecret) !== 'undefined'
	) 	setupLTI(config.auth.lti);

	// OIDC
	if (
		typeof(config.auth.oidc) !== 'undefined' &&
		typeof(config.auth.oidc.issuerURL) !== 'undefined' &&
		typeof(config.auth.oidc.clientOptions) !== 'undefined'
	)
	{
		const oidcIssuer = await Issuer.discover(config.auth.oidc.issuerURL);

		// Setup authentication
		setupOIDC(oidcIssuer);

	}

	app.use(passport.initialize());
	app.use(passport.session());

	// loginparams
	app.get('/auth/login', (req, res, next) =>
	{
		passport.authenticate('oidc', {
			state : base64.encode(JSON.stringify({
				id : req.query.id
			}))
		})(req, res, next);
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
		req.logout();
		req.session.destroy(() => res.send(logoutHelper()));
	});

	// callback
	app.get(
		'/auth/callback',
		passport.authenticate('oidc', { failureRedirect: '/auth/login' }),
		(req, res) =>
		{
			const state = JSON.parse(base64.decode(req.query.state));

			let displayName;
			let picture;

			if (req.user != null)
			{
				if (req.user.displayName != null)
					displayName = req.user.displayName;
				else
					displayName = '';

				if (req.user.picture != null)
					picture = req.user.picture;
				else
					picture = '/static/media/buddy.403cb9f6.svg';
			}

			const peer = peers.get(state.id);

			peer && (peer.displayName = displayName);
			peer && (peer.picture = picture);
			peer && (peer.authenticated = true);

			res.send(loginHelper({
				displayName,
				picture
			}));
		}
	);
}

async function runHttpsServer()
{
	app.use(compression());

	app.use('/.well-known/acme-challenge', express.static('public/.well-known/acme-challenge'));

	app.all('*', async (req, res, next) =>
	{
		if (req.secure || config.httpOnly )
		{
			const ltiURL = new URL(`${req.protocol }://${ req.get('host') }${req.originalUrl}`);

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
				return next();
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

		redirectListener.listen(config.listeningRedirectPort);
	}

	// https or http
	mainListener.listen(config.listeningPort);
}

function isPathAlreadyTaken(url)
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
		if (url.toString().startsWith(path))
			return true;
	});

	return false;
}

/**
 * Create a WebSocketServer to allow WebSocket connections from browsers.
 */
async function runWebSocketServer()
{
	io = require('socket.io')(mainListener);

	io.use(
		sharedSession(session, {
			autoSave : true
		})
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
			const room = await getOrCreateRoom({ roomId });
			const peer = new Peer({ id: peerId, socket });

			peers.set(peerId, peer);

			peer.on('close', () => peers.delete(peerId));

			room.handlePeer(peer);
		})
			.catch((error) =>
			{
				logger.error('room creation or room joining failed [error:"%o"]', error);

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
 * Get next mediasoup Worker.
 */
function getMediasoupWorker()
{
	const worker = mediasoupWorkers[nextMediasoupWorkerIdx];

	if (++nextMediasoupWorkerIdx === mediasoupWorkers.length)
		nextMediasoupWorkerIdx = 0;

	return worker;
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

		const mediasoupWorker = getMediasoupWorker();

		room = await Room.create({ mediasoupWorker, roomId });

		rooms.set(roomId, room);

		room.on('close', () => rooms.delete(roomId));
	}

	return room;
}

run();

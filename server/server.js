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
const httpHelper = require('./httpHelper');
// auth
const passport = require('passport');
const { Issuer, Strategy } = require('openid-client');
const expressSession = require('express-session');
const sharedSession = require('express-socket.io-session');

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
	cert : fs.readFileSync(config.tls.cert),
	key  : fs.readFileSync(config.tls.key)
};

const app = express();

app.use(helmet.hsts());

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const session = expressSession({
	secret            : config.cookieSecret,
	resave            : true,
	saveUninitialized : true,
	cookie            : {
		secure   : true,
		httpOnly : true
	}
});

app.use(session);

passport.serializeUser((user, done) =>
{
	done(null, user);
});

passport.deserializeUser((user, done) =>
{
	done(null, user);
});

let httpsServer;
let io;
let oidcClient;
let oidcStrategy;

const auth = config.auth;

async function run()
{
	if (
		typeof(auth) !== 'undefined' &&
		typeof(auth.issuerURL) !== 'undefined' &&
		typeof(auth.clientOptions) !== 'undefined'
	)
	{
		Issuer.discover(auth.issuerURL).then(async (oidcIssuer) => 
		{
			// Setup authentication
			await setupAuth(oidcIssuer);

			// Run a mediasoup Worker.
			await runMediasoupWorkers();

			// Run HTTPS server.
			await runHttpsServer();

			// Run WebSocketServer.
			await runWebSocketServer();
		})
			.catch((err) =>
			{
				logger.error(err);
			});
	}
	else
	{
		logger.error('Auth is not configure properly!');

		// Run a mediasoup Worker.
		await runMediasoupWorkers();

		// Run HTTPS server.
		await runHttpsServer();

		// Run WebSocketServer.
		await runWebSocketServer();
	}

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

async function setupAuth(oidcIssuer)
{
	oidcClient = new oidcIssuer.Client(auth.clientOptions);

	// ... any authorization request parameters go here
	// client_id defaults to client.client_id
	// redirect_uri defaults to client.redirect_uris[0]
	// response type defaults to client.response_types[0], then 'code'
	// scope defaults to 'openid'
	const params = auth.clientOptions;
	
	// optional, defaults to false, when true req is passed as a first
	// argument to verify fn
	const passReqToCallback = false; 
	
	// optional, defaults to false, when true the code_challenge_method will be
	// resolved from the issuer configuration, instead of true you may provide
	// any of the supported values directly, i.e. "S256" (recommended) or "plain"
	const usePKCE = false;
	const client = oidcClient;

	oidcStrategy = new Strategy(
		{ client, params, passReqToCallback, usePKCE },
		(tokenset, userinfo, done) =>
		{
			const user =
			{
				id        : tokenset.claims.sub,
				provider  : tokenset.claims.iss,
				_userinfo : userinfo,
				_claims   : tokenset.claims
			};

			if (typeof(userinfo.picture) !== 'undefined')
			{
				if (!userinfo.picture.match(/^http/g))
				{
					user.Photos = [ { value: `data:image/jpeg;base64, ${userinfo.picture}` } ];
				}
				else
				{
					user.Photos = [ { value: userinfo.picture } ];
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
				user.emails = [ { value: userinfo.email } ];
			}

			if (userinfo.given_name != null)
			{
				user.name = { givenName: userinfo.given_name };
			}

			if (userinfo.family_name != null)
			{
				user.name = { familyName: userinfo.family_name };
			}

			if (userinfo.middle_name != null)
			{
				user.name = { middleName: userinfo.middle_name };
			}

			return done(null, user);
		}
	);

	passport.use('oidc', oidcStrategy);

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

	// logout
	app.get('/auth/logout', (req, res) =>
	{
		req.logout();
		res.redirect('/');
	});

	// callback
	app.get(
		'/auth/callback',
		passport.authenticate('oidc', { failureRedirect: '/auth/login' }),
		(req, res) =>
		{
			const state = JSON.parse(base64.decode(req.query.state));

			let displayName;
			let photo;

			if (req.user != null)
			{
				if (req.user.displayName != null)
					displayName = req.user.displayName;
				else
					displayName = '';

				if (
					req.user.Photos != null &&
					req.user.Photos[0] != null &&
					req.user.Photos[0].value != null
				)
					photo = req.user.Photos[0].value;
				else
					photo = '/static/media/buddy.403cb9f6.svg';
			}

			const peer = peers.get(state.id);

			peer && (peer.authenticated = true);

			res.send(httpHelper({
				success     : true,
				displayName : displayName,
				picture     : photo
			}));
		}
	);
}

async function runHttpsServer()
{
	app.use(compression());

	app.use('/.well-known/acme-challenge', express.static('public/.well-known/acme-challenge'));

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
}

/**
 * Create a WebSocketServer to allow WebSocket connections from browsers.
 */
async function runWebSocketServer()
{
	io = require('socket.io')(httpsServer);

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
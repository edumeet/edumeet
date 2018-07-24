#!/usr/bin/env node

'use strict';

process.title = 'multiparty-meeting-server';

const config = require('./config');
const fs = require('fs');
const https = require('https');
const redis = require('redis');
const express = require('express');
const sessionMiddleware = require('express-session');
const RedisStore = require('connect-redis')(sessionMiddleware);
const cookieParser = require('cookie-parser');
const url = require('url');
const protooServer = require('protoo-server');
const Logger = require('./lib/Logger');
const Room = require('./lib/Room');
const Dataporten = require('passport-dataporten');
const utils = require('./util');
const base64 = require('base-64');

const redisClient = redis.createClient();

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

const app = express();

const store = new RedisStore({
	host   : 'localhost',
	port   : 6379,
	client : redisClient,
	ttl    : 260
});

app.use(sessionMiddleware({
	secret : config.sessionSecret,
	store
}));

const dataporten = new Dataporten.Setup(config.oauth2);

app.use(dataporten.passport.initialize());
app.use(dataporten.passport.session());

app.get('/login', (req, res, next) => 
{
	dataporten.passport.authenticate('dataporten', {
		state : base64.encode(JSON.stringify({
			roomId   : req.query.roomId,
			peerName : req.query.peerName,
			code     : utils.random(10)
		}))
		
	})(req, res, next);
});

dataporten.setupLogout(app, '/logout');

const sendAuthToUser = (roomId, peerName, user) => 
{
	if (rooms.has(roomId))
	{
		const room = rooms.get(roomId)._protooRoom;

		if (room.hasPeer(peerName))
		{
			const peer = room.getPeer(peerName);

			peer.user = {
				...user,
				// eslint-disable-next-line camelcase
				logged_in : true
			};

			peer.send('auth', user);
		}
	}
};

app.get(
	'/auth-callback',

	dataporten.passport.authenticate('dataporten', { failureRedirect: '/login' }),
	
	(req, res) =>
	{
		const state = JSON.parse(base64.decode(req.query.state));

		sendAuthToUser(state.roomId, state.peerName, req.user);
		res.send('');
	}
);

// Serve all files in the public folder as static files.
app.use(express.static('public'));

app.use((req, res) => res.sendFile(`${__dirname}/public/index.html`));

const httpsServer = https.createServer(tls, app);

httpsServer.listen(config.listeningPort, '0.0.0.0', () =>
{
	logger.info('Server running on port: ', config.listeningPort);
});

const parseCookie = (secret, header) => 
{
	const parse = cookieParser(secret);

	const req = {
		headers : {
			cookie : header
		}
	};
	
	let result;
	
	parse(req, {}, (err) => 
	{
		if (err)
		{
			throw err;
		}
	
		result = req.signedCookies || req.cookies;
	});
	
	return result;
};

const getUserInformation = async(request) => new Promise((resolve, reject) =>
{
	request.cookie = parseCookie(config.sessionSecret, request.headers.cookie);
	request.sessionID = request.cookie['connect.sid'] || '';

	request.user = {
		// eslint-disable-next-line camelcase
		logged_in : false
	};
	
	store.get(request.sessionID, (err, session) => 
	{
		if (err)
		{
			return reject('error in session store');
		}

		if (!session)
		{
			return reject('no session found');
		}

		if (!session[dataporten.passport._key])
		{
			return reject('passport was not initialized');
		}

		const userKey = session[dataporten.passport._key].user;

		if (typeof userKey === 'undefined') 
		{
			return reject('user not authorized through passport');
		}

		dataporten.passport.deserializeUser(userKey, request, (error, user) => 
		{
			if (error)
			{
				return reject('error deserializing user');
			}

			if (!user)
			{
				return reject('user not found');
			}

			request.user = user;
			// eslint-disable-next-line camelcase
			request.user.logged_in = true;

			resolve(request.user);
		});
	});
});

// Protoo WebSocket server listens to same webserver so everything is available
// via same port
const webSocketServer = new protooServer.WebSocketServer(httpsServer,
	{
		maxReceivedFrameSize     : 960000, // 960 KBytes.
		maxReceivedMessageSize   : 960000,
		fragmentOutgoingMessages : true,
		fragmentationThreshold   : 960000
	});

// Handle connections from clients.
webSocketServer.on('connectionrequest', async(info, accept, reject) =>
{
	let user;

	try 
	{
		user = await getUserInformation(info.request);
	}
	catch (error) 
	{
		logger.warn(error);
	}

	// The client indicates the roomId and peerId in the URL query.
	const u = url.parse(info.request.url, true);
	const roomId = u.query['roomId'];
	const peerName = u.query['peerName'];

	if (!roomId || !peerName)
	{
		logger.warn('connection request without roomId and/or peerName');

		reject(400, 'Connection request without roomId and/or peerName');

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
			room = new Room(roomId, mediaServer);

			global.APP_ROOM = room;
		}
		catch (error)
		{
			logger.error('error creating a new Room: %s', error);

			reject(error);

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

	const transport = accept();

	room.handleConnection(peerName, transport, user);
});
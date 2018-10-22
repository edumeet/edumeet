#!/usr/bin/env node

'use strict';

process.title = 'multiparty-meeting-server';

const config = require('./config');
const fs = require('fs');
const https = require('https');
const express = require('express');
const url = require('url');
const Logger = require('./lib/Logger');
const Room = require('./lib/Room');
const Dataporten = require('passport-dataporten');
const utils = require('./util');
const base64 = require('base-64');

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

app.get(
	'/auth-callback',

	dataporten.passport.authenticate('dataporten', { failureRedirect: '/login' }),
	
	(req, res) =>
	{
		const state = JSON.parse(base64.decode(req.query.state));

		if (rooms.has(state.roomId))
		{
			const room = rooms.get(state.roomId)._protooRoom;

			if (room.hasPeer(state.peerName))
			{
				const peer = room.getPeer(state.peerName);

				peer.send('auth', {
					name    : req.user.data.displayName,
					picture : req.user.data.photos[0]
				});
			}
		}

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

const httpServer = express.createServer();

// set up a route to redirect http to https
http.get('*', (req, res) =>
{
	res.redirect('https://' + req.headers.host + req.url);
})

httpServer.listen(config.listeningRedirectPort, '0.0.0.0', () =>
{
	logger.info('Server redirecting port: ', config.listeningRedirectPort);
});

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
			room = new Room(roomId, mediaServer);

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

		room.on('active-speaker', (message) =>
		{
			io.to(roomId).emit('active-speaker', message);
		});

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

	socket.join(roomId);
	socket.room = roomId;

	room.handleConnection(peerName, socket);
});

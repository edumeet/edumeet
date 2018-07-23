#!/usr/bin/env node

'use strict';

process.title = 'multiparty-meeting-server';

const config = require('./config');
const fs = require('fs');
const https = require('https');
const express = require('express');
const url = require('url');
const protooServer = require('protoo-server');
const Logger = require('./lib/Logger');
const Room = require('./lib/Room');
const Dataporten = require('passport-dataporten');

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

dataporten.setupAuthenticate(app, '/login');
dataporten.setupLogout(app, '/logout');

app.get(
	'/auth-callback',

	dataporten.passport.authenticate('dataporten', { failureRedirect: '/login' }),
	
	(req, res) =>
	{
		res.redirect(req.session.redirectToAfterLogin || '/');

		if (rooms.has(req.query.roomId))
		{
			const room = rooms.get(req.query.roomId)._protooRoom;

			if (room.hasPeer(req.query.peerName))
			{
				const peer = room.getPeer(req.query.peerName);

				peer.send('auth', {
					name    : req.user.displayName,
					picture : req.user.photos[0]
				});
			}
		}
	}
);

// Serve all files in the public folder as static files.
app.use(express.static('public'));

const httpsServer = https.createServer(tls, app);

httpsServer.listen(config.listeningPort, '0.0.0.0', () =>
{
	logger.info('Server running on port: ', config.listeningPort);
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
webSocketServer.on('connectionrequest', (info, accept, reject) =>
{
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

	room.handleConnection(peerName, transport);
});
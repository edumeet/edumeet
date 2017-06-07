'use strict';

import browser from 'bowser';
import webrtc from 'webrtc-adapter'; // eslint-disable-line no-unused-vars
import domready from 'domready';
import UrlParse from 'url-parse';
import React from 'react';
import ReactDOM from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';
import randomString from 'random-string';
import Logger from './Logger';
import * as utils from './utils';
import edgeRTCPeerConnection from './edge/RTCPeerConnection';
import edgeRTCSessionDescription from './edge/RTCSessionDescription';
import App from './components/App';

const REGEXP_FRAGMENT_ROOM_ID = new RegExp('^#room-id=([0-9a-zA-Z_\-]+)$');
const logger = new Logger();

injectTapEventPlugin();

logger.debug('detected browser [name:"%s", version:%s]', browser.name, browser.version);

if (browser.msedge)
{
	logger.debug('EDGE detected, overriding WebRTC global classes');

	window.RTCPeerConnection = edgeRTCPeerConnection;
	window.RTCSessionDescription = edgeRTCSessionDescription;
}

domready(() =>
{
	logger.debug('DOM ready');

	// Load stuff and run
	utils.initialize()
		.then(run)
		.catch((error) =>
		{
			console.error(error);
		});
});

function run()
{
	logger.debug('run() [environment:%s]', process.env.NODE_ENV);

	let container = document.getElementById('mediasoup-demo-app-container');
	let urlParser = new UrlParse(window.location.href, true);
	let match = urlParser.hash.match(REGEXP_FRAGMENT_ROOM_ID);
	let peerId = randomString({ length: 8 }).toLowerCase();
	let roomId;

	if (match)
	{
		roomId = match[1];
	}
	else
	{
		roomId = randomString({ length: 8 }).toLowerCase();
		window.location = `#room-id=${roomId}`;
	}

	ReactDOM.render(<App peerId={peerId} roomId={roomId}/>, container);
}

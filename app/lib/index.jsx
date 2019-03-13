import domready from 'domready';
import UrlParse from 'url-parse';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { getDeviceInfo } from 'mediasoup-client';
import randomString from 'random-string';
import Logger from './Logger';
import * as utils from './utils';
import RoomClient from './RoomClient';
import RoomContext from './RoomContext';
import * as cookiesManager from './cookiesManager';
import * as stateActions from './redux/stateActions';
import Room from './components/Room';
import { loginEnabled } from '../config/config';
import { store } from './store';

const logger = new Logger();

let roomClient;

RoomClient.init({ store });

domready(() =>
{
	logger.debug('DOM ready');

	// Load stuff and run
	utils.initialize()
		.then(run);
});

function run()
{
	logger.debug('run() [environment:%s]', process.env.NODE_ENV);

	const peerName = randomString({ length: 8 }).toLowerCase();
	const urlParser = new UrlParse(window.location.href, true);
	let roomId = (urlParser.pathname).substr(1)
		? (urlParser.pathname).substr(1).toLowerCase() : urlParser.query.roomId.toLowerCase();
	const produce = urlParser.query.produce !== 'false';
	let displayName = urlParser.query.displayName;
	const isSipEndpoint = urlParser.query.sipEndpoint === 'true';
	const useSimulcast = urlParser.query.simulcast === 'true';

	if (!roomId)
	{
		roomId = randomString({ length: 8 }).toLowerCase();

		urlParser.query.roomId = roomId;
		window.history.pushState('', '', urlParser.toString());
	}

	// Get the effective/shareable Room URL.
	const roomUrlParser = new UrlParse(window.location.href, true);

	for (const key of Object.keys(roomUrlParser.query))
	{
		// Don't keep some custom params.
		switch (key)
		{
			case 'roomId':
			case 'simulcast':
				break;
			default:
				delete roomUrlParser.query[key];
		}
	}
	delete roomUrlParser.hash;

	const roomUrl = roomUrlParser.toString();

	// Get displayName from cookie (if not already given as param).
	const userCookie = cookiesManager.getUser() || {};
	let displayNameSet;

	if (!displayName)
		displayName = userCookie.displayName;

	if (displayName)
	{
		displayNameSet = true;
	}
	else
	{
		displayName = 'Guest';
		displayNameSet = false;
	}

	// Get current device.
	const device = getDeviceInfo();

	// If a SIP endpoint mangle device info.
	if (isSipEndpoint)
	{
		device.flag = 'sipendpoint';
		device.name = 'SIP Endpoint';
		device.version = undefined;
	}

	store.dispatch(
		stateActions.setRoomUrl(roomUrl));

	store.dispatch(
		stateActions.setMe({ peerName, displayName, displayNameSet, device, loginEnabled }));

	roomClient = new RoomClient(
		{ roomId, peerName, displayName, device, useSimulcast, produce });

	render(
		<Provider store={store}>
			<RoomContext.Provider value={roomClient}>
				<Room />
			</RoomContext.Provider>
		</Provider>,
		document.getElementById('multiparty-meeting')
	);
}

// TODO: Debugging stuff.
global.CLIENT = roomClient;

/* setInterval(() =>
{
	if (!roomClient._room.peers[0])
	{
		delete global.CONSUMER;

		return;
	}

	const peer = roomClient._room.peers[0];

	global.CONSUMER = peer.consumers[peer.consumers.length - 1];
}, 2000);
*/
global.sendSdp = function()
{
	logger.debug('---------- SEND_TRANSPORT LOCAL SDP OFFER:');
	logger.debug(
		roomClient._sendTransport._handler._pc.localDescription.sdp);

	logger.debug('---------- SEND_TRANSPORT REMOTE SDP ANSWER:');
	logger.debug(
		roomClient._sendTransport._handler._pc.remoteDescription.sdp);
};

global.recvSdp = function()
{
	logger.debug('---------- RECV_TRANSPORT REMOTE SDP OFFER:');
	logger.debug(
		roomClient._recvTransport._handler._pc.remoteDescription.sdp);

	logger.debug('---------- RECV_TRANSPORT LOCAL SDP ANSWER:');
	logger.debug(
		roomClient._recvTransport._handler._pc.localDescription.sdp);
};

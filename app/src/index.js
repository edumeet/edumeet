import domready from 'domready';
import UrlParse from 'url-parse';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import randomString from 'random-string';
import Logger from './Logger';
import debug from 'debug';
import RoomClient from './RoomClient';
import RoomContext from './RoomContext';
import deviceInfo from './deviceInfo';
import * as stateActions from './actions/stateActions';
import Room from './components/Room';
import LoadingView from './components/LoadingView';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { persistor, store } from './store';
import { SnackbarProvider } from 'notistack';
import * as serviceWorker from './serviceWorker';

import './index.css';

if (process.env.NODE_ENV !== 'production')
{
	debug.enable('* -engine* -socket* -RIE* *WARN* *ERROR*');
}

const logger = new Logger();

let roomClient;

RoomClient.init({ store });

const theme = createMuiTheme(window.config.theme);

domready(() =>
{
	logger.debug('DOM ready');

	run();
});

function run()
{
	logger.debug('run() [environment:%s]', process.env.NODE_ENV);

	const peerId = randomString({ length: 8 }).toLowerCase();
	const urlParser = new UrlParse(window.location.href, true);

	let roomId = (urlParser.pathname).substr(1)
		? (urlParser.pathname).substr(1).toLowerCase() : urlParser.query.roomId.toLowerCase();
	const produce = urlParser.query.produce !== 'false';
	const consume = urlParser.query.consume !== 'false';
	const useSimulcast = urlParser.query.simulcast === 'true';
	const forceTcp = urlParser.query.forceTcp === 'true';

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

	// Get current device.
	const device = deviceInfo();

	store.dispatch(
		stateActions.setRoomUrl(roomUrl));

	store.dispatch(
		stateActions.setMe({
			peerId,
			device,
			loginEnabled : window.config.loginEnabled
		})
	);

	roomClient = new RoomClient(
		{ roomId, peerId, device, useSimulcast, produce, consume, forceTcp });

	global.CLIENT = roomClient;

	render(
		<Provider store={store}>
			<MuiThemeProvider theme={theme}>
				<PersistGate loading={<LoadingView />} persistor={persistor}>
					<RoomContext.Provider value={roomClient}>
						<SnackbarProvider>
							<Room />
						</SnackbarProvider>
					</RoomContext.Provider>
				</PersistGate>
			</MuiThemeProvider>
		</Provider>,
		document.getElementById('multiparty-meeting')
	);
}

serviceWorker.unregister();

import domready from 'domready';
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
	const urlParser = new URL(window.location);
	const parameters = urlParser.searchParams;

	let roomId = (urlParser.pathname).substr(1);

	if (!roomId)
		roomId = parameters.get('roomId');

	if (roomId)
		roomId = roomId.toLowerCase();
	else
	{
		roomId = randomString({ length: 8 }).toLowerCase();

		parameters.set('roomId', roomId);
		window.history.pushState('', '', urlParser.toString());
	}

	const produce = parameters.get('produce') !== 'false';
	const consume = parameters.get('consume') !== 'false';
	const useSimulcast = parameters.get('simulcast') === 'true';
	const forceTcp = parameters.get('forceTcp') === 'true';

	const roomUrl = window.location.href.split('?')[0];

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

import domready from 'domready';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createIntl, createIntlCache, RawIntlProvider } from 'react-intl';
import randomString from 'random-string';
import Logger from './Logger';
import debug from 'debug';
import RoomClient from './RoomClient';
import RoomContext from './RoomContext';
import deviceInfo from './deviceInfo';
import * as roomActions from './actions/roomActions';
import * as meActions from './actions/meActions';
import App from './components/App';
import LoadingView from './components/LoadingView';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { persistor, store } from './store';
import { SnackbarProvider } from 'notistack';
import * as serviceWorker from './serviceWorker';

import messagesEnglish from './translations/en';
import messagesNorwegian from './translations/nb';

import './index.css';

const cache = createIntlCache();

const messages =
{
	'en' : messagesEnglish,
	'nb' : messagesNorwegian
};

const locale = navigator.language.split(/[-_]/)[0]; // language without region code

const intl = createIntl({
	locale,
	messages : messages[locale]
}, cache);

if (process.env.REACT_APP_DEBUG === '*' || process.env.NODE_ENV !== 'production')
{
	debug.enable('* -engine* -socket* -RIE* *WARN* *ERROR*');
}

const logger = new Logger();

let roomClient;

RoomClient.init({ store, intl });

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

	const accessCode = parameters.get('code');
	const produce = parameters.get('produce') !== 'false';
	const useSimulcast = parameters.get('simulcast') === 'true';
	const forceTcp = parameters.get('forceTcp') === 'true';

	const roomUrl = window.location.href.split('?')[0];

	// Get current device.
	const device = deviceInfo();

	store.dispatch(
		roomActions.setRoomUrl(roomUrl));

	store.dispatch(
		meActions.setMe({
			peerId,
			device,
			loginEnabled : window.config.loginEnabled
		})
	);

	roomClient = new RoomClient(
		{ roomId, peerId, accessCode, device, useSimulcast, produce, forceTcp });

	global.CLIENT = roomClient;

	render(
		<Provider store={store}>
			<MuiThemeProvider theme={theme}>
				<RawIntlProvider value={intl}>
					<PersistGate loading={<LoadingView />} persistor={persistor}>
						<RoomContext.Provider value={roomClient}>
							<SnackbarProvider>
								<App />
							</SnackbarProvider>
						</RoomContext.Provider>
					</PersistGate>
				</RawIntlProvider>
			</MuiThemeProvider>
		</Provider>,
		document.getElementById('multiparty-meeting')
	);
}

serviceWorker.unregister();

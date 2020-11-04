import domready from 'domready';
import React, { Suspense } from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import isElectron from 'is-electron';

import { createIntl } from 'react-intl';
import { IntlProvider } from 'react-intl-redux';

import { Route, HashRouter, BrowserRouter, Switch } from 'react-router-dom';
import randomString from 'random-string';
import Logger from './Logger';
import debug from 'debug';
import RoomClient from './RoomClient';
import RoomContext from './RoomContext';
import deviceInfo from './deviceInfo';
import * as meActions from './actions/meActions';
import UnsupportedBrowser from './components/UnsupportedBrowser';
import JoinDialog from './components/JoinDialog';
import LoginDialog from './components/LoginDialog';
import LoadingView from './components/LoadingView';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { persistor, store } from './store';
import { SnackbarProvider } from 'notistack';
import * as serviceWorker from './serviceWorker';
import { ReactLazyPreload } from './components/ReactLazyPreload';
import { detectDevice } from 'mediasoup-client';

import './index.css';

const App = ReactLazyPreload(() => import(/* webpackChunkName: "app" */ './components/App'));

// const cache = createIntlCache();

const supportedBrowsers={
	'windows' : {
		'internet explorer' : '>12',
		'microsoft edge'    : '>18'
	},
	'safari'                       : '>12',
	'firefox'                      : '>=60',
	'chrome'                       : '>=74',
	'chromium'                     : '>=74',
	'opera'                        : '>=62',
	'samsung internet for android' : '>=11.1.1.52'
};

const intl = createIntl();

if (process.env.REACT_APP_DEBUG === '*' || process.env.NODE_ENV !== 'production')
{
	debug.enable('* -engine* -socket* -RIE* *WARN* *ERROR*');
}

const logger = new Logger();

let roomClient;

RoomClient.init({ store });

const theme = createMuiTheme(window.config.theme);

let Router;

if (isElectron())
	Router = HashRouter;
else
	Router = BrowserRouter;

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

	const accessCode = parameters.get('code');
	const produce = parameters.get('produce') !== 'false';
	const forceTcp = parameters.get('forceTcp') === 'true';
	const displayName = parameters.get('displayName');
	const muted = parameters.get('muted') === 'true';

	const { pathname } = window.location;

	let basePath = pathname.substring(0, pathname.lastIndexOf('/'));

	if (!basePath)
		basePath = '/';

	// Get current device.
	const device = deviceInfo();

	let unsupportedBrowser = false;

	let webrtcUnavailable = false;

	if (detectDevice() === undefined)
	{
		logger.error('Your browser is not supported [deviceInfo:"%o"]', device);

		unsupportedBrowser = true;
	}
	else if (
		navigator.mediaDevices === undefined ||
		navigator.mediaDevices.getUserMedia === undefined ||
		window.RTCPeerConnection === undefined
	)
	{
		logger.error('Your browser is not supported [deviceInfo:"%o"]', device);

		webrtcUnavailable = true;
	}
	else if (
		!device.bowser.satisfies(
			window.config.supportedBrowsers || supportedBrowsers
		)
	)
	{
		logger.error(
			'Your browser is not supported [deviceInfo:"%o"]',
			device
		);

		unsupportedBrowser = true;
	}
	else
	{
		logger.debug('Your browser is supported [deviceInfo:"%o"]', device);
	}

	if (unsupportedBrowser || webrtcUnavailable)
	{
		render(
			<MuiThemeProvider theme={theme}>
				<IntlProvider value={intl}>
					<UnsupportedBrowser
						webrtcUnavailable={webrtcUnavailable}
						platform={device.platform}
					/>
				</IntlProvider>
			</MuiThemeProvider>,
			document.getElementById('edumeet')
		);

		return;
	}

	store.dispatch(
		meActions.setMe({
			peerId,
			loginEnabled : window.config.loginEnabled
		})
	);

	roomClient = new RoomClient(
		{
			peerId,
			accessCode,
			device,
			produce,
			forceTcp,
			displayName,
			muted,
			basePath
		});

	global.CLIENT = roomClient;

	render(
		<Provider store={store}>
			<MuiThemeProvider theme={theme}>
				<IntlProvider value={intl}>
					<PersistGate loading={<LoadingView />} persistor={persistor}>
						<RoomContext.Provider value={roomClient}>
							<SnackbarProvider>
								<Router basename={basePath}>
									<Suspense fallback={<LoadingView />}>
										<React.Fragment>
											<Switch>
												<Route exact path='/' component={JoinDialog} />
												<Route exact path='/login_dialog' component={LoginDialog} />
												<Route path='/:id' component={App} />
											</Switch>
										</React.Fragment>
									</Suspense>
								</Router>
							</SnackbarProvider>
						</RoomContext.Provider>
					</PersistGate>
				</IntlProvider>
			</MuiThemeProvider>
		</Provider>,
		document.getElementById('edumeet')
	);
}

serviceWorker.unregister();

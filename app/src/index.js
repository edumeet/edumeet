import domready from 'domready';
import React, { Suspense } from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { Provider } from 'react-redux';
import isElectron from 'is-electron';

import { createIntl } from 'react-intl';
import { IntlProvider } from 'react-intl-redux';
import Cookies from 'universal-cookie';
import { Route, HashRouter, BrowserRouter, Switch } from 'react-router-dom';
import randomString from 'random-string';
import Logger from './Logger';
import debug from 'debug';
import RoomClient from './RoomClient';
import RoomContext from './RoomContext';
import deviceInfo from './deviceInfo';
import * as meActions from './store/actions/meActions';
import * as roomActions from './store/actions/roomActions';
import UnsupportedBrowser from './components/UnsupportedBrowser';
import ConfigDocumentation from './components/ConfigDocumentation';
import ConfigError from './components/ConfigError';
import JoinDialog from './components/JoinDialog';
import LoginDialog from './components/AccessControl/LoginDialog';
import LoadingView from './components/Loader/LoadingView';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { persistor, store } from './store/store';
import { SnackbarProvider } from 'notistack';
import * as serviceWorker from './serviceWorker';
import { LazyPreload } from './components/Loader/LazyPreload';
import { detectDevice } from 'mediasoup-client';
import { recorder } from './BrowserRecorder';

import './index.css';

import { config, configError } from './config';

const App = LazyPreload(() => import(/* webpackChunkName: "app" */ './components/App'));

// const cache = createIntlCache();

const supportedBrowsers =
{
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

const intl = createIntl({ locale: 'en', defaultLocale: 'en' });

recorder.intl = intl;

if (process.env.REACT_APP_DEBUG === '*' || process.env.NODE_ENV !== 'production')
{
	debug.enable('* -engine* -socket* -RIE* *WARN* *ERROR*');
}

const logger = new Logger();

let roomClient;

RoomClient.init({ store });

const theme = createTheme(config.theme);

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

	const rootElement = document.getElementById('edumeet');
	const client = ReactDOMClient.createRoot(rootElement);

	const peerId = randomString({ length: 8 }).toLowerCase();
	const urlParser = new URL(window.location);
	const parameters = urlParser.searchParams;

	const accessCode = parameters.get('code');
	const produce = parameters.get('produce') !== 'false';
	const forceTcp = parameters.get('forceTcp') === 'true';
	const displayName = parameters.get('displayName');
	const muted = parameters.get('muted') === 'true';
	const headless = parameters.get('headless');
	const hideNoVideoParticipants = parameters.get('hideNoVideoParticipants');
	const filmstripmode = parameters.get('filmstrip'); // filmstrip mode by default
	const acceptCookie = parameters.get('acceptCookie'); // auto accept cookie popup
	const hideSelfView = parameters.get('hideSelfView');

	if (filmstripmode === 'true')
	{
		store.dispatch(
			roomActions.setDisplayMode('filmstrip')
		);
	}

	if (acceptCookie === 'true')
	{
		const cookies = new Cookies();

		cookies.set('CookieConsent', 'true', { path: '/' });
	}

	const showConfigDocumentationPath = parameters.get('config') === 'true';

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
			config.supportedBrowsers || supportedBrowsers
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
		client.render(
			<Provider store={store}>
				<MuiThemeProvider theme={theme}>
					<IntlProvider value={intl}>
						<UnsupportedBrowser
							webrtcUnavailable={webrtcUnavailable}
							platform={device.platform}
						/>
					</IntlProvider>
				</MuiThemeProvider>
			</Provider>
		);

		return;
	}

	if (showConfigDocumentationPath)
	{
		client.render(
			<Provider store={store}>
				<MuiThemeProvider theme={theme}>
					<IntlProvider value={intl}>
						<ConfigDocumentation />
					</IntlProvider>
				</MuiThemeProvider>
			</Provider>
		);

		return;
	}

	if (configError)
	{
		client.render(
			<Provider store={store}>
				<MuiThemeProvider theme={theme}>
					<IntlProvider value={intl}>
						<ConfigError configError={configError} />
					</IntlProvider>
				</MuiThemeProvider>
			</Provider>
		);

		return;
	}

	store.dispatch(
		meActions.setMe({
			peerId,
			loginEnabled : config.loginEnabled
		})
	);

	roomClient = new RoomClient(
		{
			peerId,
			accessCode,
			device,
			produce,
			headless,
			forceTcp,
			displayName,
			muted,
			basePath
		});

	if (hideNoVideoParticipants === 'true')
	{
		roomClient.setHideNoVideoParticipants(true);
	}

	if (hideSelfView === 'true')
	{
		store.dispatch(roomActions.setHideSelfView(hideSelfView));
	}

	global.CLIENT = roomClient;

	client.render(
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
		</Provider>
	);
}

serviceWorker.unregister();

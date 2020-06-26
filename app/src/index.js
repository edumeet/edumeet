import domready from 'domready';
import React, { Suspense } from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import isElectron from 'is-electron';
import { createIntl, createIntlCache, RawIntlProvider } from 'react-intl';
import { Route, HashRouter, BrowserRouter } from 'react-router-dom';
import randomString from 'random-string';
import Logger from './Logger';
import debug from 'debug';
import RoomClient from './RoomClient';
import RoomContext from './RoomContext';
import deviceInfo from './deviceInfo';
import * as meActions from './actions/meActions';
import UnsupportedBrowser from './components/UnsupportedBrowser';
import ChooseRoom from './components/ChooseRoom';
import LoadingView from './components/LoadingView';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { persistor, store } from './store';
import { SnackbarProvider } from 'notistack';
import * as serviceWorker from './serviceWorker';
import { ReactLazyPreload } from './components/ReactLazyPreload';
import { detectDevice } from 'mediasoup-client';
// import messagesEnglish from './translations/en';
import messagesNorwegian from './translations/nb';
import messagesGerman from './translations/de';
import messagesHungarian from './translations/hu';
import messagesPolish from './translations/pl';
import messagesDanish from './translations/dk';
import messagesFrench from './translations/fr';
import messagesGreek from './translations/el';
import messagesRomanian from './translations/ro';
import messagesPortuguese from './translations/pt';
import messagesChineseSimplified from './translations/cn';
import messagesChineseTraditional from './translations/tw';
import messagesSpanish from './translations/es';
import messagesCroatian from './translations/hr';
import messagesCzech from './translations/cs';
import messagesItalian from './translations/it';
import messagesUkrainian from './translations/uk';
import messagesTurkish from './translations/tr';
import messagesLatvian from './translations/lv';

import './index.css';

const App = ReactLazyPreload(() => import(/* webpackChunkName: "app" */ './components/App'));

const cache = createIntlCache();

const messages =
{
	// 'en' : messagesEnglish,
	'nb'      : messagesNorwegian,
	'de'      : messagesGerman,
	'hu'      : messagesHungarian,
	'pl'      : messagesPolish,
	'dk'      : messagesDanish,
	'fr'      : messagesFrench,
	'el'      : messagesGreek,
	'ro'      : messagesRomanian,
	'pt'      : messagesPortuguese,
	'zh-hans' : messagesChineseSimplified,
	'zh-hant' : messagesChineseTraditional,
	'es'      : messagesSpanish,
	'hr'      : messagesCroatian,
	'cs'      : messagesCzech,
	'it'      : messagesItalian,
	'uk'      : messagesUkrainian,
	'tr'      : messagesTurkish,
	'lv'      : messagesLatvian
};

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

const browserLanguage = (navigator.language || navigator.browserLanguage).toLowerCase();

let locale = browserLanguage.split(/[-_]/)[0]; // language without region code

if (locale === 'zh')
{
	if (browserLanguage === 'zh-cn')
		locale = 'zh-hans';
	else
		locale = 'zh-hant';
}

const intl = createIntl({
	locale,
	messages : messages[locale]
}, cache);

document.documentElement.lang = locale;

if (process.env.REACT_APP_DEBUG === '*' || process.env.NODE_ENV !== 'production')
{
	debug.enable('* -engine* -socket* -RIE* *WARN* *ERROR*');
}

const logger = new Logger();

let roomClient;

RoomClient.init({ store, intl });

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
				<RawIntlProvider value={intl}>
					<UnsupportedBrowser
						webrtcUnavailable={webrtcUnavailable}
						platform={device.platform}
					/>
				</RawIntlProvider>
			</MuiThemeProvider>,
			document.getElementById('multiparty-meeting')
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
				<RawIntlProvider value={intl}>
					<PersistGate loading={<LoadingView />} persistor={persistor}>
						<RoomContext.Provider value={roomClient}>
							<SnackbarProvider>
								<Router basename={basePath}>
									<Suspense fallback={<LoadingView />}>
										<React.Fragment>
											<Route exact path='/' component={ChooseRoom} />
											<Route path='/:id' component={App} />
										</React.Fragment>
									</Suspense>
								</Router>
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

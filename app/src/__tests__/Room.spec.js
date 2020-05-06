import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { act } from 'react-dom/test-utils';
import { createIntl, createIntlCache, RawIntlProvider } from 'react-intl';
import Room from '../components/Room';
import { SnackbarProvider } from 'notistack';
import RoomContext from '../RoomContext';

import configureStore from 'redux-mock-store';

const mockStore = configureStore([]);

let container;

let store;

let intl;

const roomClient = {};

beforeEach(() =>
{
	container = document.createElement('div');

	store = mockStore({
		chat       : [],
		consumers  : {},
		files      : {},
		lobbyPeers : {},
		me         : {
			audioDevices          : null,
			audioInProgress       : false,
			audioOutputDevices    : null,
			audioOutputInProgress : false,
			canSendMic            : false,
			canSendWebcam         : false,
			canShareFiles         : false,
			canShareScreen        : false,
			displayNameInProgress : false,
			id                    : 'jesttester',
			loggedIn              : false,
			loginEnabled          : true,
			picture               : null,
			raisedHand            : false,
			raisedHandInProgress  : false,
			screenShareInProgress : false,
			webcamDevices         : null,
			webcamInProgress      : false
		},
		notifications : [],
		peerVolumes   : {},
		peers         : {},
		producers     : {},
		room          : {
			accessCode         : '',
			activeSpeakerId    : null,
			fullScreenConsumer : null,
			inLobby            : true,
			joinByAccessCode   : true,
			joined             : false,
			lockDialogOpen     : false,
			locked             : false,
			mode               : 'democratic',
			name               : 'test',
			selectedPeerId     : null,
			settingsOpen       : false,
			showSettings       : false,
			signInRequired     : false,
			spotlights         : [],
			state              : 'connecting',
			toolbarsVisible    : true,
			torrentSupport     : false,
			windowConsumer     : null
		},
		settings : {
			advancedMode              : true,
			displayName               : 'Jest Tester',
			resolution                : 'ultra',
			selectedAudioDevice       : 'default',
			selectedAudioOutputDevice : 'default',
			selectedWebcam            : 'soifjsiajosjfoi'
		},
		toolarea : {
			currentToolTab : 'chat',
			toolAreaOpen   : false,
			unreadFiles    : 0,
			unreadMessages : 0
		}
	});

	const cache = createIntlCache();

	const locale = 'en';

	intl = createIntl({
		locale,
		messages : {}
	}, cache);

	document.body.appendChild(container);
});

afterEach(() =>
{
	document.body.removeChild(container);
	container = null;
});

describe('<Room />', () =>
{
	test('renders correctly', () =>
	{
		act(() =>
		{
			ReactDOM.render(
				<Provider store={store}>
					<RawIntlProvider value={intl}>
						<SnackbarProvider>
							<RoomContext.Provider value={roomClient}>
								<Room />
							</RoomContext.Provider>
						</SnackbarProvider>
					</RawIntlProvider>
				</Provider>,
				container);
		});
	});
});
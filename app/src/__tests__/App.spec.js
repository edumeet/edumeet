import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Route, MemoryRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import { createIntl, createIntlCache, RawIntlProvider } from 'react-intl';
import App from '../components/App';
import ChooseRoom from '../components/ChooseRoom';
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
		me : {
			displayNameInProgress : false,
			id                    : 'jesttester',
			loggedIn              : false,
			loginEnabled          : true
		},
		room : {
		},
		settings : {
			displayName : 'Jest Tester'
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

describe('<ChooseRoom />', () =>
{
	test('renders chooseroom', () =>
	{
		act(() =>
		{
			ReactDOM.render(
				<Provider store={store}>
					<RawIntlProvider value={intl}>
						<RoomContext.Provider value={roomClient}>
							<MemoryRouter initialEntries={[ '/' ]}>
								<Route path='/' component={ChooseRoom} />
							</MemoryRouter>
						</RoomContext.Provider>
					</RawIntlProvider>
				</Provider>,
				container);
		});
	});
});

describe('<App />', () =>
{
	test('renders joindialog', () =>
	{
		act(() =>
		{
			ReactDOM.render(
				<Provider store={store}>
					<RawIntlProvider value={intl}>
						<RoomContext.Provider value={roomClient}>
							<MemoryRouter initialEntries={[ '/test' ]}>
								<Route path='/:id' component={App} />
							</MemoryRouter>
						</RoomContext.Provider>
					</RawIntlProvider>
				</Provider>,
				container);
		});
	});
});
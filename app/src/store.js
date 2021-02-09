import {
	createStore,
	applyMiddleware,
	compose
} from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { createMigrate, persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from './reducers/rootReducer';
import { createFilter } from 'redux-persist-transform-filter';

const migrations =
{
	// initial version 0: we will clean up all historical data 
	// from local storage for the time 
	// before we began with migration versioning
	// next version 1 we have to implement like this:
	// oldValue = undefined; // will remove oldValue from next local storage
	// new values can be defined from app/public/config.js and go that way to new local storage
	// redux-persist will save a version number to each local store.
	// Next time store is initialized it will check if there are newer versions here in migrations 
	// and iterate over all defined greater version functions until version in persistConfig is reached.
	0 : (state) =>
	{
		state = {};

		return { ...state };
	},
	1 : (state) =>
	{
		state.settings.sampleRate = undefined;
		state.settings.channelCount = undefined;
		state.settings.volume = undefined;
		state.settings.sampleSize = undefined;
		state.me = undefined;

		return { ...state };
	}
	// Next version
	//	2 : (state) =>
	//	{
	//		return { ...state };
	//	}
};

const saveSubsetFilter = createFilter(
	'me',
	[ 'loggedIn' ]
);

const persistConfig =
{
	key             : 'root',
	storage         : storage,
	// migrate will iterate state over all version-functions
	// from migrations until version is reached
	version         : 1,
	migrate         : createMigrate(migrations, { debug: false }),
	stateReconciler : autoMergeLevel2,
	whitelist       : [ 'settings', 'intl' ],
	transforms      : [
		saveSubsetFilter
	]
};

const reduxMiddlewares =
[
	thunk
];

if (process.env.REACT_APP_DEBUG === '*' || process.env.NODE_ENV !== 'production')
{
	const reduxLogger = createLogger(
		{
			// filter VOLUME level actions from log
			predicate : (getState, action) => !(
				action.type === 'SET_PEER_VOLUME'/* ||
				action.type === 'SET_ROOM_ACTIVE_SPEAKER'||
				action.type === 'SET_IS_SPEAKING' ||
				action.type === 'SET_AUTO_MUTED'
*/
			),
			duration  : true,
			timestamp : false,
			level     : 'info',
			logErrors : true
		});

	reduxMiddlewares.push(reduxLogger);
}

const composeEnhancers =
	typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
		window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({}) :
		compose;

const enhancer = composeEnhancers(
	applyMiddleware(...reduxMiddlewares)
);

const pReducer = persistReducer(persistConfig, rootReducer);

const initialState = {
	intl : {
		locale   : null,
		messages : null
	}
	// ...other initialState
};

export const store = createStore(
	pReducer,
	initialState,
	enhancer
);

export const persistor = persistStore(store);

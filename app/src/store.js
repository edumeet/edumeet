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
	0 : (state) =>
	{
		state = {};

		return { ...state };
	}
// Next version
//	1 : (state) =>
//	{
//		return { ...state };
//	}
};

const persistConfig =
{
	key             : 'root',
	storage         : storage,
	// migrate will iterate state over all version-functions
	// from migrations until version is reached
	version         : 0,
	migrate         : createMigrate(migrations, { debug: false }),
	stateReconciler : autoMergeLevel2,
	whitelist       : [ 'settings', 'intl', 'me' ]
};

const saveSubsetFilter = createFilter(
	'me',
	[ 'loggedIn' ]
);

const reduxMiddlewares =
[
	thunk
];

if (process.env.REACT_APP_DEBUG === '*' || process.env.NODE_ENV !== 'production')
{
	const reduxLogger = createLogger(
		{
			// filter VOLUME level actions from log
			predicate : (getState, action) => !(action.type === 'SET_PEER_VOLUME'),
			duration  : true,
			timestamp : false,
			level     : 'log',
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

export const persistor = persistStore(store, {
	transforms : [
		saveSubsetFilter
	]

});
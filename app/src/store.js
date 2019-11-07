import {
	createStore,
	applyMiddleware,
	compose
} from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from './reducers/rootReducer';

const persistConfig =
{
	key             : 'root',
	storage         : storage,
	stateReconciler : autoMergeLevel2,
	whitelist       : [ 'settings' ]
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

export const store = createStore(
	pReducer,
	enhancer
);

export const persistor = persistStore(store);
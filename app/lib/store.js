import {
	applyMiddleware,
	createStore,
	compose
} from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import reducers from './redux/reducers';
import roomClientMiddleware from './redux/roomClientMiddleware';

const reduxMiddlewares =
[
	thunk,
	roomClientMiddleware
];

if (process.env.NODE_ENV === 'development')
{
	const reduxLogger = createLogger(
		{
			duration  : true,
			timestamp : false,
			level     : 'log',
			logErrors : true
		});

	reduxMiddlewares.push(reduxLogger);
}

const composeEnhancers =
typeof window === 'object' &&
window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
	window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
		// Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
	}) : compose;

const enhancer = composeEnhancers(
	applyMiddleware(...reduxMiddlewares)
	// other store enhancers if any
);

export const store = createStore(
	reducers,
	undefined,
	enhancer
);
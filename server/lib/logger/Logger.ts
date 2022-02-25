import debug from 'debug';

const APP_NAME = 'edumeet-server';

export default class Logger
{
private _debug: debug.Debugger;

private _info: debug.Debugger;

private _warn: debug.Debugger;

private _error: debug.Debugger;

constructor(prefix: string)
{
	if (prefix)
	{
		this._debug = debug(`${APP_NAME}:${prefix}`);
		this._info = debug(`${APP_NAME}:INFO:${prefix}`);
		this._warn = debug(`${APP_NAME}:WARN:${prefix}`);
		this._error = debug(`${APP_NAME}:ERROR:${prefix}`);
	}
	else
	{
		this._debug = debug(APP_NAME);
		this._info = debug(`${APP_NAME}:INFO`);
		this._warn = debug(`${APP_NAME}:WARN`);
		this._error = debug(`${APP_NAME}:ERROR`);
	}

	/* eslint-disable no-console */
	this._debug.log = console.info.bind(console);
	this._info.log = console.info.bind(console);
	this._warn.log = console.warn.bind(console);
	this._error.log = console.error.bind(console);
/* eslint-enable no-console */
}

get debug()
{
	return this._debug;
}

get info()
{
	return this._info;
}

get warn()
{
	return this._warn;
}

get error()
{
	return this._error;
}
}

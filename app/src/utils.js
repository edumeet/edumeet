/**
 * Create a function which will call the callback function
 * after the given amount of milliseconds has passed since
 * the last time the callback function was called.
 */
export const idle = (callback, delay) =>
{
	let handle;

	return () =>
	{
		if (handle)
		{
			clearTimeout(handle);
		}

		handle = setTimeout(callback, delay);
	};
};

/**
 * Error produced when a socket request has a timeout.
 */
export class SocketTimeoutError extends Error
{
	constructor(message)
	{
		super(message);

		this.name = 'SocketTimeoutError';

		if (Error.hasOwnProperty('captureStackTrace')) // Just in V8.
			Error.captureStackTrace(this, SocketTimeoutError);
		else
			this.stack = (new Error(message)).stack;
	}
}
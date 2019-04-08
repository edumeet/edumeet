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
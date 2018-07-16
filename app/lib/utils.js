let mediaQueryDetectorElem;

export function initialize()
{
	// Media query detector stuff.
	mediaQueryDetectorElem =
		document.getElementById('multiparty-meeting-media-query-detector');

	return Promise.resolve();
}

export function isDesktop()
{
	return Boolean(mediaQueryDetectorElem.offsetParent);
}

export function isMobile()
{
	return !mediaQueryDetectorElem.offsetParent;
}

export function getBrowserType()
{
	const ua = navigator.userAgent.toLowerCase();

	// Firefox
	if (ua.indexOf('firefox') !== -1)
	{
		return 'firefox';
	}

	// Chrome
	if (ua.indexOf('chrome') !== -1 && ua.indexOf('edge') === -1)
	{
		return 'chrome';
	}

	// MSEdge
	if (ua.indexOf('edge') !== -1)
	{
		return 'edge';
	}

	return 'N/A';
}

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
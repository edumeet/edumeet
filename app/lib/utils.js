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

	return 'N/A';
}

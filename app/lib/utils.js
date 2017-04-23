'use strict';

import browser from 'bowser';
import Logger from './Logger';

const logger = new Logger('utils');

let mediaQueryDetectorElem;

module.exports =
{
	initialize()
	{
		logger.debug('initialize()');

		// Media query detector stuff
		mediaQueryDetectorElem = document.getElementById('mediasoup-demo-app-media-query-detector');

		return Promise.resolve();
	},

	isDesktop()
	{
		return !!mediaQueryDetectorElem.offsetParent;
	},

	isMobile()
	{
		return !mediaQueryDetectorElem.offsetParent;
	},

	isPlanB()
	{
		if (browser.chrome || browser.chromium || browser.opera)
			return true;
		else
			return false;
	},

	closeMediaStream(stream)
	{
		if (!stream)
			return;

		let tracks = stream.getTracks();

		for (let i=0, len=tracks.length; i < len; i++)
		{
			tracks[i].stop();
		}
	}
};

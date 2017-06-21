'use strict';

import browser from 'bowser';
import randomNumberLib from 'random-number';
import Logger from './Logger';

global.BROWSER = browser;

const logger = new Logger('utils');
const randomNumberGenerator = randomNumberLib.generator(
	{
		min     : 10000000,
		max     : 99999999,
		integer : true
	});

let mediaQueryDetectorElem;

export function initialize()
{
	logger.debug('initialize()');

	// Media query detector stuff
	mediaQueryDetectorElem = document.getElementById('mediasoup-demo-app-media-query-detector');

	return Promise.resolve();
}

export function isDesktop()
{
	return !!mediaQueryDetectorElem.offsetParent;
}

export function isMobile()
{
	return !mediaQueryDetectorElem.offsetParent;
}

export function isPlanB()
{
	if (browser.chrome || browser.chromium || browser.opera || browser.safari || browser.msedge)
		return true;
	else
		return false;
}

/**
 * Unfortunately Edge produces rtpSender.send() to fail when receiving media
 * from others and removing/adding a local track.
 */
export function canChangeResolution()
{
	if (browser.msedge)
		return false;

	return true;
}

export function randomNumber()
{
	return randomNumberGenerator();
}

export function	closeMediaStream(stream)
{
	if (!stream)
		return;

	let tracks = stream.getTracks();

	for (let i=0, len=tracks.length; i < len; i++)
	{
		tracks[i].stop();
	}
}

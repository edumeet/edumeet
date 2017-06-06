'use strict';

import browser from 'bowser';
import randomNumberLib from 'random-number';
import Logger from './Logger';

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
	if (browser.chrome || browser.chromium || browser.opera || browser.msedge)
		return true;
	else
		return false;
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

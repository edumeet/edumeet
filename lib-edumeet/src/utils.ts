import * as mediasoupClient from 'mediasoup-client';
import { VIDEO_CONSTRAINTS_WIDTHS } from './consts';

/**
* Validates the simulcast `encodings` array extracting the resolution scalings
* array.
* ref. https://www.w3.org/TR/webrtc/#rtp-media-api
* 
* @param {*} encodings
* @returns the resolution scalings array
*/

export function getResolutionScalings(encodings: mediasoupClient.types.RtpEncodingParameters[]|undefined): number[] {
	if (!encodings) {
		return [];
	}
	const resolutionScalings: number[] = [];

	// SVC encodings
	if (encodings.length === 1) {
		const { spatialLayers } =
		mediasoupClient.parseScalabilityMode(encodings[0].scalabilityMode);

		for (let i=0; i < spatialLayers; i++) {
			resolutionScalings.push(2 ** (spatialLayers - i - 1));
		}

		return resolutionScalings;
	}

	// Simulcast encodings
	let scaleResolutionDownByDefined = false;

	encodings.forEach((encoding) => {
		if (encoding.scaleResolutionDownBy !== undefined) {
			// at least one scaleResolutionDownBy is defined
			scaleResolutionDownByDefined = true;
			// scaleResolutionDownBy must be >= 1.0
			resolutionScalings.push(Math.max(1.0, encoding.scaleResolutionDownBy));
		} else {
			// If encodings contains any encoding whose scaleResolutionDownBy
			// attribute is defined, set any undefined scaleResolutionDownBy
			// of the other encodings to 1.0.
			resolutionScalings.push(1.0);
		}
	});

	// If the scaleResolutionDownBy attribues of sendEncodings are
	// still undefined, initialize each encoding's scaleResolutionDownBy
	// to 2^(length of sendEncodings - encoding index - 1).
	if (!scaleResolutionDownByDefined) {
		encodings.forEach((encoding, index) => {
			resolutionScalings[index] = 2 ** (encodings.length - index - 1);
		});
	}

	return resolutionScalings;
}

export function getSignalingUrl({ hostname, port=443, peerId, roomId }: {
	hostname: string,
	port?: number
	peerId: string,
	roomId: string
}): string {
	return `wss://${hostname}:${port}/?peerId=${encodeURIComponent(peerId)}&roomId=${encodeURIComponent(roomId)}`;
}

/**
* Error produced when a socket request has a timeout.
*/
export class SocketTimeoutError extends Error {
	constructor(message: string) {
		super(message);

		this.name = 'SocketTimeoutError';

		if (Error.hasOwnProperty('captureStackTrace')) // Just in V8.
			Error.captureStackTrace(this, SocketTimeoutError);
		else
			this.stack = (new Error(message)).stack;
	}
}
type CallbackFunction = (...args: any) => void
export function timeoutCallback(callback: CallbackFunction, timeout: number): 
	CallbackFunction {
	let called = false;

	const interval = setTimeout(
		() => {
			if (called)
				return;
			called = true;
			callback(new SocketTimeoutError('Request timed out'));
		},
		timeout
	);

	return (...args) => {
		if (called)
			return;
		called = true;
		clearTimeout(interval);

		callback(...args);
	};
}

export function getVideoConstraints(resolution: string, aspectRatio: number): {width: number, height: number} {
	if (!VIDEO_CONSTRAINTS_WIDTHS[resolution]) {
		throw new Error(`getVideoConstraints: unknown resolution ${resolution}`);
	}

	return {
		width : VIDEO_CONSTRAINTS_WIDTHS[resolution],
		height: VIDEO_CONSTRAINTS_WIDTHS[resolution] / aspectRatio
	};
}

export function stringArrayEqual(arr1: string[], arr2: string[]): boolean {
	if (arr1.length !== arr2.length) return false;
	for (let i=0; i<arr1.length; i++) {
		if (arr1[i] !== arr2[i]) return false;
	}

	return true;
}

export function isWebRTCSupported(): boolean {
	// eslint-disable-next-line no-undef, @typescript-eslint/no-explicit-any
	const gt = globalThis as any;

	if (typeof gt === 'undefined') return false;
	if (gt.RTCPeerConnection) return true;
	if (gt.mozRTCPeerConnection) return true;
	if (gt.webkitRTCPeerConnection) return true;

	return false;
}

export function arraysEqual(arr1: any[], arr2: any[]) {
	if (arr1.length !== arr2.length)
	return false;
	
	for (let i = arr1.length; i--;)
	{
		if (arr1[i] !== arr2[i])
		return false;
	}
	
	return true;
}
import Logger from '../Logger';
import { store } from '../store/store';
import * as consumerActions from '../store/actions/consumerActions';

const logger = new Logger('transforms.receiver');

/**
 * Pipes the receiver streams without parsing or modifications.
 * @param receiver 
 */
export function directReceiverTransform(receiver: RTCRtpReceiver)
{
	logger.debug('directReceiverTransform', { receiver });

	// @ts-ignore
	const receiverStreams = receiver.createEncodedStreams();
	const readableStream = receiverStreams.readable || receiverStreams.readableStream;
	const writableStream = receiverStreams.writable || receiverStreams.writableStream;

	readableStream.pipeTo(writableStream);
}

// Opus config parser
// Ref. https://tools.ietf.org/html/rfc6716#section-3.1
const OPUS_CONFIGS = [
	'Silk NB 10ms',
	'Silk NB 20ms',
	'Silk NB 40ms',
	'Silk NB 60ms',
	//
	'Silk MB 10ms',
	'Silk MB 20ms',
	'Silk MB 40ms',
	'Silk MB 60ms',
	//
	'Silk WB 10ms',
	'Silk WB 20ms',
	'Silk WB 40ms',
	'Silk WB 60ms',
	//
	'Hybrid SWB 10ms',
	'Hybrid SWB 20ms',
	//
	'Hybrid FB 10ms',
	'Hybrid FB 20ms',
	//
	'Celt NB 2.5ms',
	'Celt NB 5ms',
	'Celt NB 10ms',
	'Celt NB 20ms',
	//
	'Celt WB 2.5ms',
	'Celt WB 5ms',
	'Celt WB 10ms',
	'Celt WB 20ms',
	//
	'Celt SWB 2.5ms',
	'Celt SWB 5ms',
	'Celt SWB 10ms',
	'Celt SWB 20ms',
	//
	'Celt FB 2.5ms',
	'Celt FB 5ms',
	'Celt FB 10ms',
	'Celt FB 20ms'
];

const OPUS_STEREO = [
	'M',
	'S'
];

const OPUS_FRAMES = [
	'1f', // 1 frame in the packet
	'2ef', // 2 frames in the packet, each with equal compressed size
	'2df', // 2 frames in the packet, with different compressed sizes
	'af' // an arbitrary number of frames in the packet
];

/**
 * Opus receiver transform
 * @param receiver 
 * @param consumerId 
 */
export function opusReceiverTransform(receiver: RTCRtpReceiver, consumerId: string)
{
	logger.debug('opusReceiverTransform', { receiver, consumerId });

	// @ts-ignore
	const receiverStreams = receiver.createEncodedStreams();
	const readableStream = receiverStreams.readable || receiverStreams.readableStream;
	const writableStream = receiverStreams.writable || receiverStreams.writableStream;

	const transformStream = new window.TransformStream({
		transform : (encodedFrame, controller) =>
		{
			if (encodedFrame.data.byteLength)
			{
				const byte = new DataView(encodedFrame.data, 0, 1).getUint8(0);

				const config = byte >> 3; // eslint-disable-line no-bitwise
				const stereo = (byte >> 1) & 0x01; // eslint-disable-line no-bitwise
				const frames = byte & 0x03; // eslint-disable-line no-bitwise

				const opusConfig = `${OPUS_CONFIGS[config]} ${OPUS_STEREO[stereo]} ${OPUS_FRAMES[frames]}`;
				const consumer = store.getState().consumers[consumerId];

				if (consumer?.opusConfig !== opusConfig)
				{
					logger.debug('opusReceiverTransform',
						{ config, stereo, frames, opusConfig });
					store.dispatch(consumerActions.setConsumerOpusConfig(
						consumerId, opusConfig));
				}
			}

			controller.enqueue(encodedFrame);
		}
	});

	readableStream
		.pipeThrough(transformStream)
		.pipeTo(writableStream);
}

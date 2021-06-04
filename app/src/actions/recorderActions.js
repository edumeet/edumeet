// Recoding STATE
import * as meActions from './meActions';
import BrowserRecorder from './BrowserRecorder';

export const RECORDING_START = 'start';
export const RECORDING_STOP = 'stop';
export const RECORDING_PAUSE = 'pause';
export const RECORDING_RESUME = 'resume';
const recorder = new BrowserRecorder();

export const startLocalRecording = (roomClient, store=null, intl=null) =>
{
	return async (dispatch, getState) =>
	{
		console.log('recorder start');

		const state = getState();
		const micProducer = Object.values(state.producers).find((p) => p.source === 'mic');

		const recordingMimeType = store.getState().settings.recorderPreferredMimeType;
		const additionalAudioTracks = [];

		if (micProducer) additionalAudioTracks.push(micProducer.track);

		try
		{
			await recorder.start({
				additionalAudioTracks,
				recordingMimeType
			});

			await roomClient.sendRequest('setLocalRecording', { localRecordingState: RECORDING_START });
			dispatch(meActions.setLocalRecordingState(RECORDING_START));
		}
		catch (err)
		{
			// ...
		}
	};
};

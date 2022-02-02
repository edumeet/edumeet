export const setLocalRecordingState = (status) =>
	({
		type    : 'SET_LOCAL_RECORDING_STATE',
		payload : { status }
	});
export const setLocalRecordingConsent = (agreed) =>
	({
		type    : 'SET_LOCAL_RECORDING_CONSENT',
		payload : { agreed }
	});

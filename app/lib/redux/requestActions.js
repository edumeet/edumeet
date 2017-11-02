import randomString from 'random-string';
import * as stateActions from './stateActions';

export const joinRoom = (
	{ roomId, peerName, displayName, device, useSimulcast, produce }) =>
{
	return {
		type    : 'JOIN_ROOM',
		payload : { roomId, peerName, displayName, device, useSimulcast, produce }
	};
};

export const leaveRoom = () =>
{
	return {
		type : 'LEAVE_ROOM'
	};
};

export const changeDisplayName = (displayName) =>
{
	return {
		type    : 'CHANGE_DISPLAY_NAME',
		payload : { displayName }
	};
};

export const muteMic = () =>
{
	return {
		type : 'MUTE_MIC'
	};
};

export const unmuteMic = () =>
{
	return {
		type : 'UNMUTE_MIC'
	};
};

export const enableWebcam = () =>
{
	return {
		type : 'ENABLE_WEBCAM'
	};
};

export const disableWebcam = () =>
{
	return {
		type : 'DISABLE_WEBCAM'
	};
};

export const changeWebcam = () =>
{
	return {
		type : 'CHANGE_WEBCAM'
	};
};

export const enableAudioOnly = () =>
{
	return {
		type : 'ENABLE_AUDIO_ONLY'
	};
};

export const disableAudioOnly = () =>
{
	return {
		type : 'DISABLE_AUDIO_ONLY'
	};
};

export const restartIce = () =>
{
	return {
		type : 'RESTART_ICE'
	};
};

// This returns a redux-thunk action (a function).
export const notify = ({ type = 'info', text, timeout }) =>
{
	if (!timeout)
	{
		switch (type)
		{
			case 'info':
				timeout = 3000;
				break;
			case 'error':
				timeout = 5000;
				break;
		}
	}

	const notification =
	{
		id      : randomString({ length: 6 }).toLowerCase(),
		type    : type,
		text    : text,
		timeout : timeout
	};

	return (dispatch) =>
	{
		dispatch(stateActions.addNotification(notification));

		setTimeout(() =>
		{
			dispatch(stateActions.removeNotification(notification.id));
		}, timeout);
	};
};

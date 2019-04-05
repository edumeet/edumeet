import jsCookie from 'js-cookie';

const USER_COOKIE = 'multiparty-meeting.user';
const VIDEO_COOKIE = 'multiparty-meeting.videoEnabled';

const AUDIO_DEVICE = 'multiparty-meeting.audioDevice';
const VIDEO_DEVICE = 'multiparty-meeting.videoDevice';

export function getUser()
{
	return jsCookie.getJSON(USER_COOKIE);
}

export function setUser({ displayName })
{
	jsCookie.set(USER_COOKIE, { displayName });
}

export function getVideoEnabled()
{
	return jsCookie.getJSON(VIDEO_COOKIE);
}

export function setVideoEnabled({ webcamEnabled })
{
	jsCookie.set(VIDEO_COOKIE, { webcamEnabled });
}

export function getAudioDevice()
{
	return jsCookie.getJSON(AUDIO_DEVICE);
}

export function setAudioDevice({ audioDeviceId })
{
	jsCookie.set(AUDIO_DEVICE, { audioDeviceId });
}

export function getVideoDevice()
{
	return jsCookie.getJSON(VIDEO_DEVICE);
}

export function setVideoDevice({ videoDeviceId })
{
	jsCookie.set(VIDEO_DEVICE, { videoDeviceId });
}

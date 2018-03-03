import jsCookie from 'js-cookie';

const USER_COOKIE = 'multiparty-meeting.user';
const DEVICES_COOKIE = 'multiparty-meeting.devices';

export function getUser()
{
	return jsCookie.getJSON(USER_COOKIE);
}

export function setUser({ displayName })
{
	jsCookie.set(USER_COOKIE, { displayName });
}

export function getDevices()
{
	return jsCookie.getJSON(DEVICES_COOKIE);
}

export function setDevices({ webcamEnabled })
{
	jsCookie.set(DEVICES_COOKIE, { webcamEnabled });
}

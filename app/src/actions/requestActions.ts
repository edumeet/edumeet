// @ts-ignore
import randomString from 'random-string';
import * as notificationActions from './notificationActions';

// This returns a redux-thunk action (a function).
export const notify = ({
	type = 'info',
	text,
	timeout
}: {
    type?: 'info' | 'error';
    text: string;
    timeout?: number;
}): any =>
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
			default:
				timeout = 3000;
				break;
		}
	}

	const notification = {
		id : randomString({ length: 6 }).toLowerCase(),
		type,
		text,
		timeout
	};

	return (dispatch: any) =>
	{
		dispatch(notificationActions.addNotification(notification));

		setTimeout(() =>
		{
			dispatch(notificationActions.removeNotification(notification.id));
		}, timeout);
	};
};

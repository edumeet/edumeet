export const addNotification = (notification) =>
	({
		type    : 'ADD_NOTIFICATION',
		payload : { notification }
	});

export const removeNotification = (notificationId) =>
	({
		type    : 'REMOVE_NOTIFICATION',
		payload : { notificationId }
	});

export const removeAllNotifications = () =>
	({
		type : 'REMOVE_ALL_NOTIFICATIONS'
	});

export const closeNotification = (notificationId) =>
	({
		type    : 'CLOSE_NOTIFICATION',
		payload : { notificationId }
	});

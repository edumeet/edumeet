const initialState = [];

const notifications = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_NOTIFICATION':
		{
			const { notification } = action.payload;

			return [ ...state, notification ];
		}

		case 'REMOVE_NOTIFICATION':
		{
			const { notificationId } = action.payload;

			return state.filter((notification) => notification.id !== notificationId);
		}

		case 'REMOVE_ALL_NOTIFICATIONS':
		{
			return [];
		}

		default:
			return state;
	}
};

export default notifications;

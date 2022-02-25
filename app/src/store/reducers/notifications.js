const notifications = (state = [], action) =>
{
	switch (action.type)
	{
		case 'ADD_NOTIFICATION':
		{
			const { notification } = action.payload;

			notification.toBeClosed=false;

			return [ ...state, notification ];
		}

		case 'ADD_CONSENT_NOTIFICATION':
		{
			const { notification } = action.payload;

			notification.toBeClosed=false;

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

		case 'CLOSE_NOTIFICATION':
		{
			const { notificationId } = action.payload;

			return (state.map((e) =>
			{
				if (e.id === notificationId)
				{
					e.toBeClosed=true;
				}

				return e;
			}));
		}

		default:
			return state;
	}
};

export default notifications;

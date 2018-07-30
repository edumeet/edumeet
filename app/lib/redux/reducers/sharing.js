const sharing = (state = [], action) =>
{
	switch (action.type)
	{
		case 'SEND_FILE':
			return [ ...state, { ...action.payload, me: true } ];

		case 'ADD_FILE':
			return [ ...state, action.payload ];

		default:
			return state;
	}
};

export default sharing;
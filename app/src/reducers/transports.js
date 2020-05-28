const initialState = {};

const transports = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_TRANSPORT_STATS':
		{
			const { transport, type } = action.payload;

			return { ...state, [type]: transport[0] };
		}

		default:
			return state;
	}
};

export default transports;

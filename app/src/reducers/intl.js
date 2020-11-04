import { UPDATE } from 'react-intl-redux';

const initialState = {
	locale   : null,
	messages : null
};

const intlReducer = (state = initialState, action) =>
{
	if (action.type !== UPDATE)
	{
		return state;
	}

	return { ...state, ...action.payload };
};

export default intlReducer;

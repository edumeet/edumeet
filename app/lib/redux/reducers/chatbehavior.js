const initialState =
{
	showChat      : false,
	disabledInput : false,
	badge         : 0
};

const chatbehavior = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'TOGGLE_CHAT':
		{
			const showChat = !state.showChat;

			return { ...state, showChat };
		}

		case 'TOGGLE_INPUT_DISABLED':
		{
			const disabledInput = !state.disabledInput;

			return { ...state, disabledInput };
		}

		default:
			return state;
	}
};

export default chatbehavior;

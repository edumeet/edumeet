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
			const badge = 0;

			return { ...state, showChat, badge };
		}

		case 'TOGGLE_INPUT_DISABLED':
		{
			const disabledInput = !state.disabledInput;

			return { ...state, disabledInput };
		}

		case 'INCREASE_BADGE':
		{
			return { ...state, badge: state.badge + (state.showChat ? 0 : 1) };
		}
		default:
			return state;
	}
};

export default chatbehavior;

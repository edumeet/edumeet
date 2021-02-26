const initialState =
{
	order          : 'asc',
	isScrollEnd    : true,
	messages       : [],
	areNewMessages : false
};

const chat = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_MESSAGE':
		{
			const { message } = action.payload;

			return { ...state, messages: [ ...state.messages, message ] };
		}

		case 'ADD_CHAT_HISTORY':
		{
			const { chatHistory } = action.payload;

			return { ...state, messages: chatHistory };
		}

		case 'CLEAR_CHAT':
		{
			return { ...state, messages: [] };
		}

		case 'SORT_CHAT':
		{
			const { order } = action.payload;

			return { ...state, order: order };
		}

		case 'SET_IS_SCROLL_END':
		{
			const { flag } = action.payload;

			return { ...state, isScrollEnd: flag };
		}

		case 'SET_ARE_NEW_MESSAGES':
		{
			const { flag } = action.payload;

			return { ...state, areNewMessages: flag };
		}

		case 'SET_IS_MESSAGE_READ':
		{
			const { id, isRead } = action.payload;

			state.messages.forEach((key, index) =>
			{
				if (state.messages[index].time === Number(id))
				{
					state.messages[index].isRead = isRead;
				}
			});

			return { ...state };
		}

		default:
			return state;
	}
};

export default chat;

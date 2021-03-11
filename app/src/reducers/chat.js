const initialState =
{
	order          : 'asc',
	isScrollEnd    : true,
	messages       : [],
	areNewMessages : false,
	count          : 0,
	countUnread    : 0
};

const chat = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_MESSAGE':
		{
			const { message } = action.payload;

			return {
				...state,
				messages    : [ ...state.messages, message ],
				count       : state.count + 1,
				countUnread : message.sender === 'response' ? ++state.countUnread : state.countUnread
			};

		}

		case 'ADD_CHAT_HISTORY':
		{
			const { chatHistory } = action.payload;

			chatHistory.forEach(
				(item, index) => { chatHistory[index].isRead = true; }
			);

			return { ...state, messages: chatHistory };
		}

		case 'CLEAR_CHAT':
		{
			return {
				...state,
				messages    : [],
				count       : 0,
				countUnread : 0
			};
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

					state.countUnread--;
				}
			});

			return { ...state };
		}

		default:
			return state;
	}
};

export default chat;

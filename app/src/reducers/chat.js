import
{
	createNewMessage
} from './helper';

const initialState =
{
	messages : [],
	order    : 'asc'
};

const chat = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_NEW_USER_MESSAGE':
		{
			const { text } = action.payload;

			const message = createNewMessage(text, 'client', 'Me', undefined);

			return { ...state, messages: [ ...state.messages, message ] };
		}

		case 'ADD_NEW_RESPONSE_MESSAGE':
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

		default:
			return state;
	}
};

export default chat;

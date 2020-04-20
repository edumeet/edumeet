import
{
	createNewMessage
} from './helper';

const chat = (state = [], action) =>
{
	switch (action.type)
	{
		case 'ADD_NEW_USER_MESSAGE':
		{
			const { text } = action.payload;

			const message = createNewMessage(text, 'client', 'Me', undefined);

			return [ ...state, message ];
		}

		case 'ADD_NEW_RESPONSE_MESSAGE':
		{
			const { message } = action.payload;

			return [ ...state, message ];
		}

		case 'ADD_CHAT_HISTORY':
		{
			const { chatHistory } = action.payload;

			return [ ...state, ...chatHistory ];
		}

		case 'CLEAR_CHAT':
		{
			return [];
		}

		default:
			return state;
	}
};

export default chat;

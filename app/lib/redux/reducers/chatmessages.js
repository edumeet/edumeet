import
{
	createNewMessage
} from './helper';

const chatmessages = (state = [], action) =>
{
	switch (action.type)
	{
		case 'ADD_NEW_USER_MESSAGE':
		{
			const { text } = action.payload;

			const message = createNewMessage(text, 'client', 'Me');

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

		case 'DROP_MESSAGES':
		{
			return [];
		}

		default:
			return state;
	}
};

export default chatmessages;

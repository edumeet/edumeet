import
{
	createNewMessage
} from './helper';

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

		case 'GO_TO_NEWEST_MESSAGES':
		{
			const { flag } = action.payload;

			return { ...state, isScrollEnd: flag };
		}

		case 'SET_ARE_NEW_MESSAGES':
		{
			const { flag } = action.payload;

			return { ...state, areNewMessages: flag };
		}

		default:
			return state;
	}
};

export default chat;

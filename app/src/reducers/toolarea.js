const initialState =
{
	toolAreaOpen   : false,
	currentToolTab : 'chat', // chat, settings, users
	unreadMessages : 0,
	unreadFiles    : 0
};

const toolarea = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'TOGGLE_TOOL_AREA':
		{
			const toolAreaOpen = !state.toolAreaOpen;
			const unreadMessages = toolAreaOpen && state.currentToolTab === 'chat' ? 0 : state.unreadMessages;
			const unreadFiles = toolAreaOpen && state.currentToolTab === 'files' ? 0 : state.unreadFiles;

			return { ...state, toolAreaOpen, unreadMessages, unreadFiles };
		}

		case 'OPEN_TOOL_AREA':
		{
			const toolAreaOpen = true;
			const unreadMessages = state.currentToolTab === 'chat' ? 0 : state.unreadMessages;
			const unreadFiles = state.currentToolTab === 'files' ? 0 : state.unreadFiles;

			return { ...state, toolAreaOpen, unreadMessages, unreadFiles };
		}

		case 'CLOSE_TOOL_AREA':
		{
			const toolAreaOpen = false;

			return { ...state, toolAreaOpen };
		}

		case 'SET_TOOL_TAB':
		{
			const { toolTab } = action.payload;
			const unreadMessages = toolTab === 'chat' ? 0 : state.unreadMessages;
			const unreadFiles = toolTab === 'files' ? 0 : state.unreadFiles;

			return { ...state, currentToolTab: toolTab, unreadMessages, unreadFiles };
		}

		case 'ADD_NEW_RESPONSE_MESSAGE':
		{
			if (state.toolAreaOpen && state.currentToolTab === 'chat')
			{
				return state;
			}

			return { ...state, unreadMessages: state.unreadMessages + 1 };
		}

		case 'ADD_FILE':
		{
			if (state.toolAreaOpen && state.currentToolTab === 'files')
			{
				return state;
			}

			return { ...state, unreadFiles: state.unreadFiles + 1 };
		}

		default:
			return state;
	}
};

export default toolarea;

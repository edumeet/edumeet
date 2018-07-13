const initialState =
{
	toolAreaOpen   : false,
	currentToolTab : 'chat', // chat, settings, users
	unread         : 0
};

const toolarea = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'TOGGLE_TOOL_AREA':
		{
			const toolAreaOpen = !state.toolAreaOpen;
			const unread = toolAreaOpen && state.currentToolTab === 'chat' ? 0 : state.unread;

			return { ...state, toolAreaOpen, unread };
		}

		case 'SET_TOOL_TAB':
		{
			const { toolTab } = action.payload;
			const unread = toolTab === 'chat' ? 0 : state.unread;

			return { ...state, currentToolTab: toolTab, unread };
		}

		case 'ADD_NEW_RESPONSE_MESSAGE':
		{
			if (state.toolAreaOpen && state.currentToolTab === 'chat') 
			{
				return state;
			}

			return { ...state, unread: state.unread + 1 };
		}

		default:
			return state;
	}
};

export default toolarea;

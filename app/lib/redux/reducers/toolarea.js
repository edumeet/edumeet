const initialState =
{
	toolAreaOpen   : false,
	currentToolTab : 'chat' // chat, settings, layout, users
};

const toolarea = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'TOGGLE_TOOL_AREA':
		{
			const toolAreaOpen = !state.toolAreaOpen;

			return { ...state, toolAreaOpen };
		}

		case 'SET_TOOL_TAB':
		{
			const { toolTab } = action.payload;

			return { ...state, currentToolTab: toolTab };
		}

		default:
			return state;
	}
};

export default toolarea;

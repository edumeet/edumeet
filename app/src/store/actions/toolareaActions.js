export const toggleToolArea = () =>
	({
		type : 'TOGGLE_TOOL_AREA'
	});

export const openToolArea = () =>
	({
		type : 'OPEN_TOOL_AREA'
	});

export const closeToolArea = () =>
	({
		type : 'CLOSE_TOOL_AREA'
	});

export const setToolTab = (toolTab) =>
	({
		type    : 'SET_TOOL_TAB',
		payload : { toolTab }
	});
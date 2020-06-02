export const addUserMessage = (text) =>
	({
		type    : 'ADD_NEW_USER_MESSAGE',
		payload : { text }
	});

export const addResponseMessage = (message) =>
	({
		type    : 'ADD_NEW_RESPONSE_MESSAGE',
		payload : { message }
	});

export const addChatHistory = (chatHistory) =>
	({
		type    : 'ADD_CHAT_HISTORY',
		payload : { chatHistory }
	});

export const clearChat = () =>
	({
		type : 'CLEAR_CHAT'
	});
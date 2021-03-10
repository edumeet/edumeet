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

export const sortChat = (order) =>
	({
		type    : 'SORT_CHAT',
		payload : { order }
	});

export const setAreNewMessages = (flag) =>
	({
		type    : 'SET_ARE_NEW_MESSAGES',
		payload : { flag }
	});

export const setIsScrollEnd = (flag) =>
	({
		type    : 'SET_IS_SCROLL_END',
		payload : { flag }
	});

export const setIsMessageRead = (id, isRead) =>
{
	return ({
		type    : 'SET_IS_MESSAGE_READ',
		payload : { id, isRead }
	});
};

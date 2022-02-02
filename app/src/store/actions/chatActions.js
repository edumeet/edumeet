export const addMessage = (message) =>
	({
		type    : 'ADD_MESSAGE',
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

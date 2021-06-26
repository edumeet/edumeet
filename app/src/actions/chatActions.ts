interface IChatMessage {
    type: 'message';
    time: number;
    sender: 'response' | 'client';
    isRead: boolean;
    name: string;
    picture?: string;
    text: string;
    peerId?: string;
}

export const addMessage = (message: IChatMessage) => ({
	type    : 'ADD_MESSAGE',
	payload : { message }
});

export const addChatHistory = (chatHistory: any) => ({
	type    : 'ADD_CHAT_HISTORY',
	payload : { chatHistory }
});

export const clearChat = () => ({
	type : 'CLEAR_CHAT'
});

export const sortChat = (order: 'desc' | 'asc') => ({
	type    : 'SORT_CHAT',
	payload : { order }
});

export const setIsScrollEnd = (flag: boolean) => ({
	type    : 'SET_IS_SCROLL_END',
	payload : { flag }
});

export const setIsMessageRead = (id: any, isRead: boolean) =>
{
	return {
		type    : 'SET_IS_MESSAGE_READ',
		payload : { id, isRead }
	};
};

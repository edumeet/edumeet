export function createNewMessage(text, sender, name)
{
	return {
		type : 'message',
		text,
		time : Date.now(),
		name,
		sender
	};
}

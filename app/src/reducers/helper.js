export function createNewMessage(text, sender, name, picture)
{
	return {
		type : 'message',
		time : Date.now(),
		text,
		name,
		sender,
		picture
	};
}
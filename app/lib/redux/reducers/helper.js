export function createNewMessage(text, sender, name, picture)
{
	return {
		type : 'message',
		text,
		time : Date.now(),
		name,
		sender,
		picture
	};
}
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

export function createNewFile(file, sender, name, picture)
{
	return {
		type: 'file',
		file,
		time: Date.now(),
		name,
		sender,
		picture
	};
}
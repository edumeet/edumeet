var config =
{
	loginEnabled    : false,
	developmentPort : 3443,
	turnServers : [
		{
			urls : [
				'turn:turn.example.com:443?transport=tcp'
			],
			username   : 'example',
			credential : 'example'
		}
	],
	requestTimeout   : 10000,
	transportOptions :
	{
		tcp : true
	},
	lastN : 4
};

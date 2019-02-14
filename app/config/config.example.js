module.exports =
{
	chromeExtension : 'https://chrome.google.com/webstore/detail/fckajcjdaabdgnbdcmhhebdglogjfodi',
	loginEnabled    : false,
	turnServers : [
		{
			urls : [
				'turn:example.com:443?transport=tcp'
			],
			username   : 'example',
			credential : 'example'
		}
	],
	requestTimeout   : 10000,
	transportOptions :
	{
		tcp : true
	}
};

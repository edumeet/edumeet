// eslint-disable-next-line
var config =
{
	loginEnabled     : false,
	developmentPort  : 3443,
	productionPort   : 443,
	multipartyServer : 'letsmeet.no',
	turnServers      : [
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
	lastN       : 4,
	mobileLastN : 1,
	background  : 'images/background.jpg',
	// Add file and uncomment for adding logo to appbar
	// logo       : 'images/logo.svg',
	title       : 'Multiparty meeting',
	theme       :
	{
		palette :
		{
			primary :
			{
				main : '#313131'
			}
		},
		overrides :
		{
			MuiAppBar :
			{
				colorPrimary :
				{
					backgroundColor : '#313131'
				}
			},
			MuiFab :
			{
				primary :
				{
					backgroundColor : '#5F9B2D',
					'&:hover'       :
					{
						backgroundColor : '#518029'
					}
				}
			}
		},
		typography :
		{
			useNextVariants : true
		}
	}
};

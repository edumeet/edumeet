// eslint-disable-next-line
var config =
{
	loginEnabled     : false,
	developmentPort  : 3443,
	productionPort   : 443,
	multipartyServer : 'letsmeet.no',

	/**
	 * If defaultResolution is set, it will override user settings when joining:
	 * low ~ 320x240
	 * medium ~ 640x480
	 * high ~ 1280x720
	 * veryhigh ~ 1920x1080
	 * ultra ~ 3840x2560
	 **/
	defaultResolution  : 'medium',
	// Enable or disable simulcast for webcam video
	simulcast          : true,
	// Enable or disable simulcast for screen sharing video
	simulcastSharing   : false,
	// Simulcast encoding layers and levels
	simulcastEncodings :
	[
		{ scaleResolutionDownBy: 4 },
		{ scaleResolutionDownBy: 2 },
		{ scaleResolutionDownBy: 1 }
	],
	// Socket.io request timeout
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
			},
			MuiBadge :
			{
				colorPrimary :
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

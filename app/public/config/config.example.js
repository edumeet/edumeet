// eslint-disable-next-line
var config =
{
	loginEnabled    : false,
	developmentPort : 3443,
	productionPort  : 443,

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

	/**
	 * White listing browsers that support audio output device selection.
	 * It is not yet fully implemented in Firefox.
	 * See: https://bugzilla.mozilla.org/show_bug.cgi?id=1498512
	 */
	audioOutputSupportedBrowsers :
	[
		'chrome',
		'opera'
	],
	// Socket.io request timeout
	requestTimeout   : 10000,
	transportOptions :
	{
		tcp : true
	},
	defaultAudio : 
	{
		sampleRate       : 48000,
		channelCount     : 1,
		volume           : 1.0,
		autoGainControl  : true,
		echoCancellation : true,
		noiseSuppression : true,
		sampleSize       : 16
	},
	background       : 'images/background.jpg',
	defaultLayout    : 'democratic', // democratic, filmstrip
	// If true, will show media control buttons in separate
	// control bar, not in the ME container.
	buttonControlBar : false,
	// Timeout for autohiding topbar and button control bar
	hideTimeout      : 3000,
	lastN            : 4,
	mobileLastN      : 1,
	// Highest number of speakers user can select
	maxLastN         : 5,
	// If truthy, users can NOT change number of speakers visible
	lockLastN        : false,
	// Add file and uncomment for adding logo to appbar
	// logo       : 'images/logo.svg',
	title            : 'Multiparty meeting',
	theme            :
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

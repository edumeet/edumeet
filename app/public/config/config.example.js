// eslint-disable-next-line
var config =
{
	loginEnabled    : false,
	developmentPort : 3443,
	productionPort  : 443,

	/**
	 * Supported browsers version 
	 * in bowser satisfy format.
	 * See more:
	 * https://www.npmjs.com/package/bowser#filtering-browsers
	 * Otherwise you got a unsupported browser page
	 */
	supportedBrowsers :
	{
		'windows' : {
			'internet explorer' : '>12',
			'microsoft edge'    : '>18'
		},
		'safari'                       : '>12',
		'firefox'                      : '>=60',
		'chrome'                       : '>=74',
		'chromium'                     : '>=74',
		'opera'                        : '>=62',
		'samsung internet for android' : '>=11.1.1.52'
	},

	/**
	 * Resolutions:
	 * 
	 * low ~ 320x240
	 * medium ~ 640x480
	 * high ~ 1280x720
	 * veryhigh ~ 1920x1080
	 * ultra ~ 3840x2560
	 * 
	 **/

	/**
	 * Frame rates:
	 * 
	 * 1, 5, 10, 15, 20, 25, 30
	 * 
	 **/

	defaultResolution             : 'medium',
	defaultFrameRate              : 15,
	defaultScreenResolution       : 'veryhigh',
	defaultScreenSharingFrameRate : 5,
	// Enable or disable simulcast for webcam video
	simulcast                     : true,
	// Enable or disable simulcast for screen sharing video
	simulcastSharing              : false,
	// Simulcast encoding layers and levels
	simulcastEncodings            :
	[
		{ scaleResolutionDownBy: 4 },
		{ scaleResolutionDownBy: 2 },
		{ scaleResolutionDownBy: 1 }
	],

	/**
	 * Alternative simulcast setting:
	 * [
	 *   { maxBitRate: 50000 }, 
	 *	 { maxBitRate: 1000000 },
	 *	 { maxBitRate: 4800000 }
	 *],
	 **/

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
	requestTimeout   : 20000,
	requestRetries   : 3,
	transportOptions :
	{
		tcp : true
	},
	defaultAudio :
	{
		sampleRate        : 48000,
		channelCount      : 1,
		volume            : 1.0,
		autoGainControl   : true,
		echoCancellation  : true,
		noiseSuppression  : true,
		voiceActivityMute : false,
		sampleSize        : 16
	},

	/**
	 * Set max number participants in one room that join 
	 * unmuted. Next participant will join automatically muted
	 * Default value is 4
	 * 
	 * Set it to 0 to auto mute all, 
	 * Set it to negative (-1) to never automatically auto mute
	 * but use it with caution
	 * full mesh audio strongly decrease room capacity! 
	 */
	autoMuteThreshold    : 4,
	background           : 'images/background.jpg',
	defaultLayout        : 'democratic', // democratic, filmstrip
	// If true, will show media control buttons in separate
	// control bar, not in the ME container.
	buttonControlBar     : false,
	// If false, will push videos away to make room for side
	// drawer. If true, will overlay side drawer over videos
	drawerOverlayed      : true,
	// Position of notifications
	notificationPosition : 'right',
	// Timeout for autohiding topbar and button control bar
	hideTimeout          : 3000,
	// max number of participant that will be visible in 
	// as speaker
	lastN                : 4,
	mobileLastN          : 1,
	// Highest number of lastN the user can select manually in 
	// userinteface
	maxLastN             : 5,
	// If truthy, users can NOT change number of speakers visible
	lockLastN            : false,
	// Add file and uncomment for adding logo to appbar
	// logo       : 'images/logo.svg',
	title                : 'Multiparty meeting',
	// Service & Support URL
	// if not set then not displayed on the about modals
	supportUrl           : 'https://support.example.com',
	// Privacy and dataprotection URL or path
	// by default privacy/privacy.html
	// that is a placeholder for your policies
	//
	// but an external url could be also used here	 
	privacyUrl           : 'privacy/privacy.html',
	theme                :
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

// eslint-disable-next-line
var config =
{
	loginEnabled    : false,
	developmentPort : 3443,
	productionPort  : 443,
	// of the server component runs on a different host than the app
	// you can uncomment the following line and specify the host name.
	// serverHostname  : 'external-server.com',

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
	// The aspect ratio of the videos as shown on
	// the screen. This is changeable in client settings.
	// This value must match one of the defined values in
	// viewAspectRatios EXACTLY (e.g. 1.333)
	viewAspectRatio  : 1.777,
	// These are the selectable aspect ratios in the settings
	viewAspectRatios : [ {
		value : 1.333, // 4 / 3
		label : '4 : 3'
	}, {
		value : 1.777, // 16 / 9
		label : '16 : 9'
	} ],
	// The aspect ratio of the video from the camera
	// this is not changeable in settings, only config
	videoAspectRatio              : 1.777,
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
	// defaults for audio setting on new clients / can be customized and overruled from client side
	defaultAudio :
	{
		autoGainControl      : false, // default : false
		echoCancellation     : true, // default : true 
		noiseSuppression     : true, // default : true 
		// Automatically unmute speaking above noisThereshold
		voiceActivatedUnmute : false, // default : false 
		// This is only for voiceActivatedUnmute and audio-indicator
		noiseThreshold       : -60 // default -60
	},
	// Audio options for now only centrally from config file: 
	centralAudioOptions :
	{
		// will not eat that much bandwith thanks to opus
		sampleRate          : 48000, // default : 48000 and don't go higher
		// usually mics are mono so this saves bandwidth
		channelCount        : 1, // default : 1
		volume              : 1.0, // default : 1.0
		sampleSize          : 16, // default : 16
		// usually mics are mono so this saves bandwidth
		opusStereo          : false, // default : false
		opusDtx             : true, // default : true / will save bandwidth 
		opusFec             : true, // default : true / forward error correction
		opusPtime           : '20', // default : 20 / minimum packet time (3, 5, 10, 20, 40, 60, 120)
		opusMaxPlaybackRate : 48000 // default : 48000 and don't go higher
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
	// Show logo if "logo" is not null, else show title
	// Set logo file name using logo.* pattern like "logo.png" to not track it by git 
	logo                 : 'images/logo.edumeet.svg',
	title                : 'edumeet',
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
			MuiButton :
			{
				containedPrimary :
				{
					backgroundColor : '#5F9B2D',
					'&:hover'       :
					{
						backgroundColor : '#5F9B2D'
					}
				},
				containedSecondary :
				{
					backgroundColor : '#f50057',
					'&:hover'       :
					{
						backgroundColor : '#f50057'
					}
				}

			},

			/*
			MuiIconButton :
			{
				colorPrimary :
				{
					backgroundColor : '#5F9B2D',
					'&:hover'       :
					{
						backgroundColor : '#5F9B2D'
					}
				},
				colorSecondary :
				{
					backgroundColor : '#f50057',
					'&:hover'       :
					{
						backgroundColor : '#f50057'
					}
				}

			},
			*/

			MuiFab :
			{
				primary :
				{
					backgroundColor : '#5F9B2D',
					'&:hover'       :
					{
						backgroundColor : '#5F9B2D'
					}
				},
				secondary :
				{
					backgroundColor : '#f50057',
					'&:hover'       :
					{
						backgroundColor : '#f50057'
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

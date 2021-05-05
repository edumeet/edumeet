import convict from 'convict';
import * as convictFormatWithValidator from 'convict-format-with-validator';

convict.addFormats(convictFormatWithValidator);

function assert(assertion: Boolean, msg: string)
{
	if (!assertion)
		throw new Error(msg);
}

convict.addFormat({
	name     : 'float',
	coerce   : (v: string) => parseFloat(v),
	validate : (v: number) => assert(Number.isFinite(v), 'must be a number')
});

const configSchema = convict({
	loginEnabled :
	{
		doc     : 'If the login is enabled.',
		format  : 'Boolean',
		default : false
	},
	developmentPort :
	{
		doc     : 'The development server listening port.',
		format  : 'port',
		default : 3443
	},
	productionPort :
	{
		doc     : 'The production server listening port.',
		format  : 'port',
		default : 443
	},
	serverHostname :
	{
		doc     : 'If the server component runs on a different host than the app you can specify the host name.',
		format  : '*',
		default : null
	},

	/**
	 * Supported browsers version in bowser satisfy format.
	 * See more:
	 * https://www.npmjs.com/package/bowser#filtering-browsers
	 * Otherwise you got a unsupported browser page
	 */
	supportedBrowsers :
	{
		doc     : 'Supported browsers version in bowser satisfy format.',
		format  : Object,
		default :
		{
			'windows' : {
				'internet explorer' : '>12',
				'microsoft edge'   	: '>18'
			},
			'microsoft edge'   	           : '>=74',
			'safari'                       : '>12',
			'firefox'                      : '>=60',
			'chrome'                       : '>=74',
			'chromium'                     : '>=74',
			'opera'                        : '>=62',
			'samsung internet for android' : '>=11.1.1.52'
		}
	},

	/**
	 * Network priorities 
	 * DSCP bits set by browser according this priority values. 
	 * ("high" means actually: EF for audio, and AF41 for Video in chrome)
	 * https://en.wikipedia.org/wiki/Differentiated_services
	 */
	networkPriorities :
	{
		doc     : 'Network priorities.',
		format  : Object,
		default :
		{
			audio            : 'high',
			mainVideo        : 'high',
			additionalVideos : 'medium',
			screenShare      : 'medium'
		}
	},
	// The aspect ratio of the videos as shown on the screen. 
	// This is changeable in client settings.
	// This value must match one of the defined values in
	// viewAspectRatios EXACTLY (e.g. 1.333)
	viewAspectRatio :
	{
		doc     : 'The aspect ratio of the videos as shown on the screen.',
		format  : 'float',
		default : 1.777
	},
	viewAspectRatios :
	{
		doc     : 'The selectable aspect ratios in the settings.',
		format  : Array,
		default :
		[
			{
				value : 1.333, // 4 / 3
				label : '4 : 3'
			},
			{
				value : 1.777, // 16 / 9
				label : '16 : 9'
			}
		]
	},
	// The aspect ratio of the video from the camera
	// this is not changeable in settings, only config
	videoAspectRatio :
	{
		doc     : 'The aspect ratio of the video from the camera.',
		format  : 'float',
		default : 1.777
	},
	resolution :
	{
		doc     : 'The default video camera capture resolution.',
		format  : [ 'low', 'medium', 'high', 'veryhigh', 'ultra' ],
		default : 'medium'
	},
	frameRate :
	{
		doc     : 'The default video camera capture framerate.',
		format  : 'nat',
		default : 15
	},
	screenResolution :
	{
		doc     : 'The default screen sharing resolution.',
		format  : [ 'low', 'medium', 'high', 'veryhigh', 'ultra' ],
		default : 'veryhigh'
	},
	screenSharingFrameRate :
	{
		doc     : 'The default screen sharing framerate.',
		format  : 'nat',
		default : 5
	},
	simulcast :
	{
		doc     : 'Enable or disable simulcast for webcam video.',
		format  : 'Boolean',
		default : true
	},
	simulcastSharing :
	{
		doc     : 'Enable or disable simulcast for screen sharing video.',
		format  : 'Boolean',
		default : false
	},
	simulcastProfiles :
	{
		doc     : 'Define different encodings for various resolutions of the video.',
		format  : Object,
		default :
		{
			3840 :
			[
				{ scaleResolutionDownBy: 4, maxBitRate: 1500000 },
				{ scaleResolutionDownBy: 2, maxBitRate: 4000000 },
				{ scaleResolutionDownBy: 1, maxBitRate: 10000000 }
			],
			1920 :
			[
				{ scaleResolutionDownBy: 4, maxBitRate: 750000 },
				{ scaleResolutionDownBy: 2, maxBitRate: 1500000 },
				{ scaleResolutionDownBy: 1, maxBitRate: 4000000 }
			],
			1280 :
			[
				{ scaleResolutionDownBy: 4, maxBitRate: 250000 },
				{ scaleResolutionDownBy: 2, maxBitRate: 900000 },
				{ scaleResolutionDownBy: 1, maxBitRate: 3000000 }
			],
			640 :
			[
				{ scaleResolutionDownBy: 2, maxBitRate: 250000 },
				{ scaleResolutionDownBy: 1, maxBitRate: 900000 }
			],
			320 :
			[
				{ scaleResolutionDownBy: 1, maxBitRate: 250000 }
			]
		}
	},
	// The adaptive spatial layer selection scaling factor (in the range [0.5, 1.0])
	// example: 
	// with level width=640px, the minimum width required to trigger the
	// level change will be: 640 * 0.75 = 480px
	adaptiveScalingFactor :
	{
		doc     : 'The adaptive spatial layer selection scaling factor.',
		format  : (value: number) => value >= 0.5 && value <= 1.0,
		default : 0.75
	},

	/**
	 * White listing browsers that support audio output device selection.
	 * It is not yet fully implemented in Firefox.
	 * See: https://bugzilla.mozilla.org/show_bug.cgi?id=1498512
	 */
	audioOutputSupportedBrowsers :
	{
		doc     : 'White listing browsers that support audio output device selection.',
		format  : Array,
		default : [
			'chrome',
			'opera'
		]
	},
	requestTimeout :
	{
		doc     : 'The Socket.io request timeout.',
		format  : 'nat',
		default : 20000
	},
	requestRetries :
	{
		doc     : 'The Socket.io request maximum retries.',
		format  : 'nat',
		default : 3
	},
	transportOptions :
	{
		doc     : '',
		format  : Object,
		default : {
			tcp : true
		}
	},
	autoGainControl :
	{
		doc     : 'Auto gain control enabled.',
		format  : 'Boolean',
		default : true
	},
	echoCancellation :
	{
		doc     : 'Echo cancellation enabled.',
		format  : 'Boolean',
		default : true
	},
	noiseSuppression :
	{
		doc     : 'Noise suppression enabled.',
		format  : 'Boolean',
		default : true
	},
	voiceActivatedUnmute :
	{
		doc     : 'Automatically unmute speaking above noiseThreshold.',
		format  : 'Boolean',
		default : false
	},
	noiseThreshold :
	{
		doc     : 'This is only for voiceActivatedUnmute and audio-indicator.',
		format  : 'int',
		default : -60
	},
	// Audio options for now only centrally from config file: 
	centralAudioOptions :
	{
		doc     : 'Defaults audio settings.',
		format  : Object,
		default :
		{
			// will not eat that much bandwith thanks to opus
			sampleRate      		  : 48000, // default : 48000 and don't go higher
			// usually mics are mono so this saves bandwidth
			channelCount      		: 1, // default : 1
			volume         			  : 1.0, // default : 1.0
			sampleSize      		  : 16, // default : 16
			// usually mics are mono so this saves bandwidth
			opusStereo      		  : false, // default : false
			opusDtx         			 : true, // default : true / will save bandwidth 
			opusFec         			 : true, // default : true / forward error correction
			opusPtime      		   : '20', // default : 20 / minimum packet time (3, 5, 10, 20, 40, 60, 120)
			opusMaxPlaybackRate : 48000 // default : 48000 and don't go higher
		}
	},

	/**
	 * Set max 'int' participants in one room that join 
	 * unmuted. Next participant will join automatically muted
	 * Default value is 4
	 * 
	 * Set it to 0 to auto mute all, 
	 * Set it to negative (-1) to never automatically auto mute
	 * but use it with caution
	 * full mesh audio strongly decrease room capacity! 
	 */
	autoMuteThreshold :
	{
		doc     : 'Set the max number of participants in one room that join unmuted.',
		format  : 'nat',
		default : 4
	},
	background :
	{
		doc     : 'The page background image URL',
		format  : String,
		default : 'images/background.jpg'
	},
	defaultLayout :
	{
		doc     : 'The default layout',
		format  : [ 'democratic', 'filmstrip' ],
		default : 'democratic'
	},
	buttonControlBar :
	{
		doc     : 'If true, will show media control buttons in separate control bar, not in the ME container.',
		format  : 'Boolean',
		default : false
	},
	drawerOverlayed :
	{
		doc     : 'If false, will push videos away to make room for side drawer. If true, will overlay side drawer over videos.',
		format  : 'Boolean',
		default : true
	},
	notificationPosition :
	{
		doc     : 'The position of notifications.',
		format  : [ 'left', 'right' ],
		default : 'right'
	},

	/**
	 * Set the notificationSounds. Valid keys are:
	 * 'parkedPeer', 'parkedPeers', 'raisedHand', 'chatMessage',
	 * 'sendFile', 'newPeer' and 'default'.
	 *
	 * Not defining a key is equivalent to using the default notification sound.
	 * Setting 'play' to null disables the sound notification.
	 */
	notificationSounds :
	{
		doc     : 'Set the notifications sounds.',
		format  : Object,
		default :
		{
			chatMessage : {
				play : '/sounds/notify-chat.mp3'
			},
			raisedHand : {
				play : '/sounds/notify-hand.mp3'
			},
			default : {
				delay : 5000, // minimum delay between alert sounds [ms]
				play  : '/sounds/notify.mp3'
			}
		}
	},
	hideTimeout :
	{
		doc     : 'Timeout for autohiding topbar and button control bar.',
		format  : 'int',
		default : 3000
	},
	lastN :
	{
		doc     : 'The max number of participant that will be visible in as speaker.',
		format  : 'nat',
		default : 4
	},
	mobileLastN :
	{
		doc     : 'The max number of participant that will be visible in as speaker for mobile users.',
		format  : 'nat',
		default : 1
	},
	maxLastN :
	{
		doc     : 'The highest number of lastN the user can select manually in the user interface.',
		format  : 'nat',
		default : 5
	},
	lockLastN :
	{
		doc     : 'If truthy, users can NOT change number of speakers visible.',
		format  : 'Boolean',
		default : false
	},
	// Show logo if "logo" is not null, else show title
	// Set logo file name using logo.* pattern like "logo.png" to not track it by git
	logo :
	{
		doc     : 'If not null, it shows the logo loaded from URL, else it shows the title.',
		format  : 'url',
		default : 'images/logo.edumeet.svg'
	},
	title :
	{
		doc     : 'The title to show if the logo is not specified.',
		format  : String,
		default : 'edumeet'
	},
	supportUrl :
	{
		doc     : 'Service & Support URL if not set then not displayed on the about modals.',
		format  : 'url',
		default : 'https://support.example.com'
	},
	// Privacy and data protection URL or path by default privacy/privacy.html
	// that is a placeholder for your policies
	//
	// but an external url could be also used here	 
	privacyUrl :
	{
		doc     : 'Privacy and data protection URL or path by default privacy/privacy.html.',
		format  : String,
		default : 'privacy/privacy.html'
	},
	// UI theme elements
	theme :
	{
		palette :
		{
			primary :
			{
				main : { format: String, default: '#313131' }
			}
		},
		overrides :
		{
			MuiAppBar :
			{
				colorPrimary :
				{
					backgroundColor : { format: String, default: '#313131' }
				}
			},
			MuiButton :
			{
				containedPrimary :
				{
					backgroundColor : { format: String, default: '#5F9B2D' },
					'&:hover'   	   :
					{
						backgroundColor : { format: String, default: '#5F9B2D' }
					}
				},
				containedSecondary :
				{
					backgroundColor : { format: String, default: '#f50057' },
					'&:hover'   	   :
					{
						backgroundColor : { format: String, default: '#f50057' }
					}
				}

			},

			/*
			MuiIconButton :
			{
				colorPrimary :
				{
					backgroundColor : '#5F9B2D',
					'&:hover'	   :
					{
						backgroundColor : '#5F9B2D'
					}
				},
				colorSecondary :
				{
					backgroundColor : '#f50057',
					'&:hover'	   :
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
					backgroundColor : { format: String, default: '#5F9B2D' },
					'&:hover'   	   :
					{
						backgroundColor : { format: String, default: '#5F9B2D' }
					}
				},
				secondary :
				{
					backgroundColor : { format: String, default: '#f50057' },
					'&:hover'   	   :
					{
						backgroundColor : { format: String, default: '#f50057' }
					}
				}

			},
			MuiBadge :
			{
				colorPrimary :
				{
					backgroundColor : { format: String, default: '#5F9B2D' },
					'&:hover'   	   :
					{
						backgroundColor : { format: String, default: '#518029' }
					}
				}
			}
		},
		typography :
		{
			useNextVariants : { format: 'Boolean', default: true }
		}
	}
});

function formatDocs(docs: any, property: string | null, schema: any)
{
	if (schema._cvtProperties)
	{
		Object.entries(schema._cvtProperties).forEach(([ name, value ]) =>
		{
			formatDocs(docs, `${property ? `${property}.` : ''}${name}`, value);
		});

		return docs;
	}
	else if (property)
	{
		docs[property] =
		{
			doc     : schema.doc,
			format  : JSON.stringify(schema.format, null, 2),
			default : JSON.stringify(schema.default, null, 2)
		};
	}

	return docs;
}

let config: any = {};
let configError = '';

// Load config from window object
configSchema.load((window as any).config);

// Perform validation
try
{
	configSchema.validate({ allowed: 'strict' });
	config = configSchema.getProperties();
}
catch (error: any)
{
	configError = error.message;
}

// format docs
const configDocs = formatDocs({}, null, configSchema.getSchema());

// eslint-disable-next-line
console.log('Using config:', config, configDocs);

// Override the window config with the validated properties.
(window as any)['config'] = config;

export {
	configSchema,
	config,
	configError,
	configDocs
};

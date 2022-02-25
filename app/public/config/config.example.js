/**
 * Edumeet App Configuration
 *
 * The configuration documentation is available also:
 * - in the app/README.md file in the source tree
 * - visiting the /?config=true page in a running instance
 */

// eslint-disable-next-line
var config = {

	// If the login is enabled.
	loginEnabled : false,

	// The development server listening port.
	developmentPort : 3443,

	// The production server listening port.
	productionPort : 443,

	// If the server component runs on a different host than the app you can specify the host name.
	serverHostname : '',

	// Supported browsers version in bowser satisfy format.
	supportedBrowsers : {
		'windows' : {
			'internet explorer' : '>12',
			'microsoft edge'    : '>18'
		},
		'microsoft edge'               : '>18',
		'safari'                       : '>12',
		'firefox'                      : '>=60',
		'chrome'                       : '>=74',
		'chromium'                     : '>=74',
		'opera'                        : '>=62',
		'samsung internet for android' : '>=11.1.1.52'
	},

	// Network priorities.
	networkPriorities : {
		'audio'            : 'high',
		'mainVideo'        : 'high',
		'additionalVideos' : 'medium',
		'screenShare'      : 'medium'
	},

	// The aspect ratio of the videos as shown on the screen.
	// This value must match exactly one of the values defined in aspectRatios.
	aspectRatio : 1.777,

	// The selectable aspect ratios in the user settings.
	aspectRatios : [
		{
			'value' : 1.333,
			'label' : '4 : 3'
		},
		{
			'value' : 1.777,
			'label' : '16 : 9'
		}
	],

	// The default video camera capture resolution.
	resolution : 'medium',

	// The default video camera capture framerate.
	frameRate : 15,

	// The default screen sharing resolution.
	screenResolution : 'veryhigh',

	// The default screen sharing framerate.
	screenSharingFrameRate : 5,

	// Enable or disable simulcast for webcam video.
	simulcast : true,

	// Enable or disable simulcast for screen sharing video.
	simulcastSharing : false,

	// Define different encodings for various resolutions of the video.
	simulcastProfiles : {
		'320' : [
			{
				'scaleResolutionDownBy' : 1,
				'maxBitRate'            : 150000
			}
		],
		'640' : [
			{
				'scaleResolutionDownBy' : 2,
				'maxBitRate'            : 150000
			},
			{
				'scaleResolutionDownBy' : 1,
				'maxBitRate'            : 500000
			}
		],
		'1280' : [
			{
				'scaleResolutionDownBy' : 4,
				'maxBitRate'            : 150000
			},
			{
				'scaleResolutionDownBy' : 2,
				'maxBitRate'            : 500000
			},
			{
				'scaleResolutionDownBy' : 1,
				'maxBitRate'            : 1200000
			}
		],
		'1920' : [
			{
				'scaleResolutionDownBy' : 6,
				'maxBitRate'            : 150000
			},
			{
				'scaleResolutionDownBy' : 3,
				'maxBitRate'            : 500000
			},
			{
				'scaleResolutionDownBy' : 1,
				'maxBitRate'            : 3500000
			}
		],
		'3840' : [
			{
				'scaleResolutionDownBy' : 12,
				'maxBitRate'            : 150000
			},
			{
				'scaleResolutionDownBy' : 6,
				'maxBitRate'            : 500000
			},
			{
				'scaleResolutionDownBy' : 1,
				'maxBitRate'            : 10000000
			}
		]
	},

	// The adaptive spatial layer selection scaling factor in the range [0.5, 1.0].
	adaptiveScalingFactor : 0.75,

	// If set to true Local Recording feature will be enabled.
	localRecordingEnabled : false,

	// White listing browsers that support audio output device selection.
	audioOutputSupportedBrowsers : [
		'chrome',
		'opera'
	],

	// The Socket.io request timeout.
	requestTimeout : 20000,

	// The Socket.io request maximum retries.
	requestRetries : 3,

	// The Mediasoup transport options.
	transportOptions : {
		'tcp' : true
	},

	// Auto gain control enabled.
	autoGainControl : true,

	// Echo cancellation enabled.
	echoCancellation : true,

	// Noise suppression enabled.
	noiseSuppression : true,

	// Automatically unmute speaking above noiseThreshold.
	voiceActivatedUnmute : false,

	// This is only for voiceActivatedUnmute and audio-indicator.
	noiseThreshold : -60,

	// The audio sample rate.
	sampleRate : 48000,

	// The audio channels count.
	channelCount : 1,

	// The audio sample size count.
	sampleSize : 16,

	// If OPUS FEC stereo be enabled.
	opusStereo : false,

	// If OPUS DTX should be enabled.
	opusDtx : true,

	// If OPUS FEC should be enabled.
	opusFec : true,

	// The OPUS packet time.
	opusPtime : 20,

	// The OPUS playback rate.
	opusMaxPlaybackRate : 48000,

	// The audio preset
	audioPreset : 'conference',

	// The audio presets.
	audioPresets : {
		'conference' : {
			'name'                 : 'Conference audio',
			'autoGainControl'      : true,
			'echoCancellation'     : true,
			'noiseSuppression'     : true,
			'voiceActivatedUnmute' : false,
			'noiseThreshold'       : -60,
			'sampleRate'           : 48000,
			'channelCount'         : 1,
			'sampleSize'           : 16,
			'opusStereo'           : false,
			'opusDtx'              : true,
			'opusFec'              : true,
			'opusPtime'            : 20,
			'opusMaxPlaybackRate'  : 48000
		},
		'hifi' : {
			'name'                 : 'HiFi streaming',
			'autoGainControl'      : false,
			'echoCancellation'     : false,
			'noiseSuppression'     : false,
			'voiceActivatedUnmute' : false,
			'noiseThreshold'       : -60,
			'sampleRate'           : 48000,
			'channelCount'         : 2,
			'sampleSize'           : 16,
			'opusStereo'           : true,
			'opusDtx'              : false,
			'opusFec'              : true,
			'opusPtime'            : 60,
			'opusMaxPlaybackRate'  : 48000
		}
	},

	// It sets the maximum number of participants in one room that can join unmuted.
	// The next participant will join automatically muted.
	// Set it to 0 to auto mute all.
	// Set it to negative (-1) to never automatically auto mute but use it with caution, 
	// full mesh audio strongly decrease room capacity!
	autoMuteThreshold : 4,

	// The page background image URL
	background : 'images/background.jpg',

	// The default layout.
	defaultLayout : 'democratic',

	// If true, the media control buttons will be shown in separate control bar, not in the ME container.
	buttonControlBar : false,

	// If false, will push videos away to make room for side drawer.
	// If true, will overlay side drawer over videos.
	drawerOverlayed : true,

	// The position of the notifications.
	notificationPosition : 'right',

	// It sets the notifications sounds.
	// Valid keys are: 'parkedPeer', 'parkedPeers', 'raisedHand', 
	// 'chatMessage', 'sendFile', 'newPeer' and 'default'.
	// Not defining a key is equivalent to using the default notification sound.
	// Setting 'play' to null disables the sound notification.		
	// 
	notificationSounds : {
		'chatMessage' : {
			'play' : '/sounds/notify-chat.mp3'
		},
		'raisedHand' : {
			'play' : '/sounds/notify-hand.mp3'
		},
		'default' : {
			'delay' : 5000,
			'play'  : '/sounds/notify.mp3'
		}
	},

	// Timeout for auto hiding the topbar and the buttons control bar.
	hideTimeout : 3000,

	// The maximum number of participants that will be visible in as speaker.
	lastN : 4,

	// The maximum number of participants that will be visible in as speaker for mobile users.
	mobileLastN : 1,

	// The highest number of lastN the user can select manually in the user interface.
	maxLastN : 5,

	// If true, the users can not change the number of visible speakers.
	lockLastN : false,

	// If not null, it shows the logo loaded from the specified URL, otherwise it shows the title.
	logo : 'images/logo.edumeet.svg',

	// The title to show if the logo is not specified.
	title : 'edumeet',

	// The service & Support URL; if `null`, it will be not displayed on the about dialogs.
	supportUrl : 'https://support.example.com',

	// The privacy and data protection external URL or local HTML path.
	privacyUrl : 'privacy/privacy.html',

	// UI theme elements colors.
	theme : {
		'palette' : {
			'primary' : {
				'main' : '#313131'
			}
		},
		'overrides' : {
			'MuiAppBar' : {
				'colorPrimary' : {
					'backgroundColor' : '#313131'
				}
			},
			'MuiButton' : {
				'containedPrimary' : {
					'backgroundColor' : '#5F9B2D',
					'&:hover'         : {
						'backgroundColor' : '#5F9B2D'
					}
				},
				'containedSecondary' : {
					'backgroundColor' : '#f50057',
					'&:hover'         : {
						'backgroundColor' : '#f50057'
					}
				}
			},
			'MuiFab' : {
				'primary' : {
					'backgroundColor' : '#518029',
					'&:hover'         : {
						'backgroundColor' : '#518029'
					},
					'&:disabled' : {
						'color'           : '#999898',
						'backgroundColor' : '#323131'
					}
				},
				'secondary' : {
					'backgroundColor' : '#f50057',
					'&:hover'         : {
						'backgroundColor' : '#f50057'
					},
					'&:disabled' : {
						'color'           : '#999898',
						'backgroundColor' : '#323131'
					}
				}
			},
			'MuiBadge' : {
				'colorPrimary' : {
					'backgroundColor' : '#5F9B2D',
					'&:hover'         : {
						'backgroundColor' : '#518029'
					}
				}
			}
		},
		'typography' : {
			'useNextVariants' : true
		}
	}
};

// Generated with: `yarn gen-config-docs` from app/src/config.ts

import convict from 'convict';
import * as convictFormatWithValidator from 'convict-format-with-validator';

convict.addFormat(convictFormatWithValidator.url);

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

/**
 * The Edumeet configuration schema.
 *
 * Use `yarn gen-config-docs` to re-generate the README.md and the
 * public/config/config.example.js files.
 */
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
		doc      : 'If the server component runs on a different host than the app you can specify the host name.',
		format   : 'String',
		default  : '',
		nullable : true
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
			'microsoft edge'   	           : '>18',
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
	// aspectRatios EXACTLY (e.g. 1.333)
	aspectRatio :
	{
		doc : `The aspect ratio of the videos as shown on the screen.
This value must match exactly one of the values defined in aspectRatios.`,
		format  : 'float',
		default : 1.777
	},
	aspectRatios :
	{
		doc     : 'The selectable aspect ratios in the user settings.',
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
					{ scaleResolutionDownBy: 12, maxBitRate: 150000 },
					{ scaleResolutionDownBy: 6, maxBitRate: 500000 },
					{ scaleResolutionDownBy: 1, maxBitRate: 10000000 }
				],
			1920 :
				[
					{ scaleResolutionDownBy: 6, maxBitRate: 150000 },
					{ scaleResolutionDownBy: 3, maxBitRate: 500000 },
					{ scaleResolutionDownBy: 1, maxBitRate: 3500000 }
				],
			1280 :
				[
					{ scaleResolutionDownBy: 4, maxBitRate: 150000 },
					{ scaleResolutionDownBy: 2, maxBitRate: 500000 },
					{ scaleResolutionDownBy: 1, maxBitRate: 1200000 }
				],
			640 :
				[
					{ scaleResolutionDownBy: 2, maxBitRate: 150000 },
					{ scaleResolutionDownBy: 1, maxBitRate: 500000 }
				],
			320 :
				[
					{ scaleResolutionDownBy: 1, maxBitRate: 150000 }
				]
		}
	},

	// The adaptive spatial layer selection scaling factor (in the range [0.5, 1.0])
	// example: 
	// with level width=640px, the minimum width required to trigger the
	// level change will be: 640 * 0.75 = 480px
	adaptiveScalingFactor :
	{
		doc     : 'The adaptive spatial layer selection scaling factor in the range [0.5, 1.0].',
		format  : (value: number) => value >= 0.5 && value <= 1.0,
		default : 0.75
	},

	localRecordingEnabled :
	{
		doc     : 'If set to true Local Recording feature will be enabled.',
		format  : 'Boolean',
		default : false
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
		doc     : 'The Mediasoup transport options.',
		format  : Object,
		default : {
			tcp : true
		}
	},
	// audio options
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
	sampleRate :
	{
		doc     : 'The audio sample rate.',
		format  : [ 8000, 16000, 24000, 44100, 48000 ],
		default : 48000
	},
	channelCount :
	{
		doc     : 'The audio channels count.',
		format  : [ 1, 2 ],
		default : 1
	},
	sampleSize :
	{
		doc     : 'The audio sample size count.',
		format  : [ 8, 16, 24, 32 ],
		default : 16
	},
	opusStereo :
	{
		doc     : 'If OPUS FEC stereo be enabled.',
		format  : 'Boolean',
		default : false
	},
	opusDtx :
	{
		doc     : 'If OPUS DTX should be enabled.',
		format  : 'Boolean',
		default : true
	},
	opusFec :
	{
		doc     : 'If OPUS FEC should be enabled.',
		format  : 'Boolean',
		default : true
	},
	opusPtime :
	{
		doc     : 'The OPUS packet time.',
		format  : [ 3, 5, 10, 20, 30, 40, 50, 60 ],
		default : 20
	},
	opusMaxPlaybackRate :
	{
		doc     : 'The OPUS playback rate.',
		format  : [ 8000, 16000, 24000, 44100, 48000 ],
		default : 48000
	},
	// audio presets profiles
	audioPreset :
	{
		doc     : 'The audio preset',
		format  : 'String',
		default : 'conference'
	},
	audioPresets :
	{
		doc     : 'The audio presets.',
		format  : Object,
		default :
		{
			conference :
			{
				name                 : 'Conference audio',
				autoGainControl      : true, // default : true
				echoCancellation     : true, // default : true 
				noiseSuppression     : true, // default : true 
				// Automatically unmute speaking above noiseThreshold
				voiceActivatedUnmute : false, // default : false 
				// This is only for voiceActivatedUnmute and audio-indicator
				noiseThreshold       : -60, // default -60
				// will not eat that much bandwidth thanks to opus
				sampleRate           : 48000, // default : 48000 and don't go higher
				// usually mics are mono so this saves bandwidth
				channelCount         : 1, // default : 1
				sampleSize           : 16, // default : 16
				// usually mics are mono so this saves bandwidth
				opusStereo           : false, // default : false
				opusDtx              : true, // default : true / will save bandwidth 
				opusFec              : true, // default : true / forward error correction
				opusPtime            : 20, // minimum packet time (10, 20, 40, 60)
				opusMaxPlaybackRate  : 48000 // default : 48000 and don't go higher
			},
			hifi :
			{
				name                 : 'HiFi streaming',
				autoGainControl      : false, // default : true
				echoCancellation     : false, // default : true 
				noiseSuppression     : false, // default : true 
				// Automatically unmute speaking above noiseThreshold
				voiceActivatedUnmute : false, // default : false 
				// This is only for voiceActivatedUnmute and audio-indicator
				noiseThreshold       : -60, // default -60
				// will not eat that much bandwidth thanks to opus
				sampleRate           : 48000, // default : 48000 and don't go higher
				// usually mics are mono so this saves bandwidth
				channelCount         : 2, // default : 1
				sampleSize           : 16, // default : 16
				// usually mics are mono so this saves bandwidth
				opusStereo           : true, // default : false
				opusDtx              : false, // default : true / will save bandwidth 
				opusFec              : true, // default : true / forward error correction
				opusPtime            : 60, // minimum packet time (10, 20, 40, 60)
				opusMaxPlaybackRate  : 48000 // default : 48000 and don't go higher
			}
		}
	},

	autoMuteThreshold :
	{
		doc : `It sets the maximum number of participants in one room that can join unmuted.
The next participant will join automatically muted.
Set it to 0 to auto mute all.
Set it to negative (-1) to never automatically auto mute but use it with caution, 
full mesh audio strongly decrease room capacity!`,
		format  : 'nat',
		default : 4
	},

	background :
	{
		doc      : 'The page background image URL',
		format   : 'String',
		default  : 'images/background.jpg',
		nullable : true
	},

	defaultLayout :
	{
		doc     : 'The default layout.',
		format  : [ 'democratic', 'filmstrip' ],
		default : 'democratic'
	},

	buttonControlBar :
	{
		doc     : 'If true, the media control buttons will be shown in separate control bar, not in the ME container.',
		format  : 'Boolean',
		default : false
	},

	drawerOverlayed :
	{
		doc : `If false, will push videos away to make room for side drawer.
If true, will overlay side drawer over videos.`,
		format  : 'Boolean',
		default : true
	},

	notificationPosition :
	{
		doc     : 'The position of the notifications.',
		format  : [ 'left', 'right' ],
		default : 'right'
	},

	notificationSounds :
	{
		doc : `It sets the notifications sounds.
Valid keys are: 'parkedPeer', 'parkedPeers', 'raisedHand', 
'chatMessage', 'sendFile', 'newPeer' and 'default'.
Not defining a key is equivalent to using the default notification sound.
Setting 'play' to null disables the sound notification.		
`,
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
		doc     : 'Timeout for auto hiding the topbar and the buttons control bar.',
		format  : 'int',
		default : 3000
	},
	lastN :
	{
		doc     : 'The maximum number of participants that will be visible in as speaker.',
		format  : 'nat',
		default : 4
	},
	mobileLastN :
	{
		doc     : 'The maximum number of participants that will be visible in as speaker for mobile users.',
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
		doc     : 'If true, the users can not change the number of visible speakers.',
		format  : 'Boolean',
		default : false
	},

	logo :
	{
		doc      : 'If not null, it shows the logo loaded from the specified URL, otherwise it shows the title.',
		format   : 'url',
		default  : 'images/logo.edumeet.svg',
		nullable : true
	},
	title :
	{
		doc     : 'The title to show if the logo is not specified.',
		format  : 'String',
		default : 'edumeet'
	},
	supportUrl :
	{
		doc      : 'The service & Support URL; if `null`, it will be not displayed on the about dialogs.',
		format   : 'url',
		default  : 'https://support.example.com',
		nullable : true
	},
	privacyUrl :
	{
		doc      : 'The privacy and data protection external URL or local HTML path.',
		format   : 'String',
		default  : 'privacy/privacy.html',
		nullable : true
	},

	theme :
	{
		doc     : 'UI theme elements colors.',
		format  : Object,
		default :
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
						backgroundColor : '#518029',
						'&:hover'       :
						{
							backgroundColor : '#518029'
						},
						'&:disabled' : {
							color           : '#999898',
							backgroundColor : '#323131'
						}

					},

					secondary :
					{
						backgroundColor : '#f50057',
						'&:hover'       :
						{
							backgroundColor : '#f50057'
						},
						'&:disabled' : {
							color           : '#999898',
							backgroundColor : '#323131'
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
	}
});

function formatDocs()
{
	function _formatDocs(docs: any, property: string | null, schema: any)
	{
		if (schema._cvtProperties)
		{
			Object.entries(schema._cvtProperties).forEach(([ name, value ]) =>
			{
				_formatDocs(docs, `${property ? `${property}.` : ''}${name}`, value);
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

	return _formatDocs({}, null, configSchema.getSchema());
}

function formatJson(data: string)
{
	return data ? `\`${data.replace(/\n/g, '')}\`` : '';
}

function dumpDocsMarkdown()
{
	let data = `# ![edumeet logo](/app/public/images/logo.edumeet.svg) App Configuration properties list:

| Name | Description | Format | Default value |
| :--- | :---------- | :----- | :------------ |
`;

	Object.entries(formatDocs()).forEach((entry: [string, any]) =>
	{
		const [ name, value ] = entry;

		data += `| ${name} | ${value.doc.replace(/\n/g, ' ')} | ${formatJson(value.format)} | \`${formatJson(value.default)}\` |\n`;
	});

	data += `

---

*Document generated with:* \`yarn gen-config-docs\` *from:* [config.ts](src/config.ts).
`;

	return data;
}

function dumpExampleConfigJs()
{
	let data = `/**
 * Edumeet App Configuration
 *
 * The configuration documentation is available also:
 * - in the app/README.md file in the source tree
 * - visiting the /?config=true page in a running instance
 */

// eslint-disable-next-line
var config = {
`;

	Object.entries(formatDocs()).forEach((entry: [string, any]) =>
	{
		// eslint-disable-next-line
		let [ name, value ] = entry;

		if (name.includes('.'))
			name = `'${name}'`;

		data += `\n\t// ${value.doc.replace(/\n/g, '\n\t// ')}
\t${name} : ${value.default},
`;
	});

	data += `};

// Generated with: \`yarn gen-config-docs\` from app/src/config.ts
`;

	return data;
}

// run the docs generator
if (typeof window === 'undefined')
{
	import('fs').then((fs) =>
	{
		fs.writeFileSync('public/config/README.md', dumpDocsMarkdown());
		fs.writeFileSync('public/config/config.example.js', dumpExampleConfigJs());
	});
}

//
let config: any = {};
let configError = '';

// Load config from window object
if (typeof window !== 'undefined' && (window as any).config !== undefined)
{
	configSchema.load((window as any).config);
}

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

// Override the window config with the validated properties.
if (typeof window !== 'undefined')
{
	(window as any)['config'] = config;
}

export {
	configSchema,
	config,
	configError,
	formatDocs
};

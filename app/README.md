# Edumeet App Configuration

The app configuration file should be a valid javascript file defining a single
`config` object containing the properties that you need to modify.

Example `public/config.js`:
```javascript
var config =
{
	developmentPort : 8443,
	productionPort  : 3443
};
```

## Configuration properties

| Name | Description | Format | Default value |
| :--- | :---------- | :----- | :------------ |
| loginEnabled | If the login is enabled. | `"boolean"` | ``false`` |
| developmentPort | The development server listening port. | `"port"` | ``3443`` |
| productionPort | The production server listening port. | `"port"` | ``443`` |
| serverHostname | If the server component runs on a different host than the app you can specify the host name. | `"*"` | ``null`` |
| supportedBrowsers | Supported browsers version in bowser satisfy format. | `"object"` | ``{  "windows": {    "internet explorer": ">12",    "microsoft edge": ">18"  },  "microsoft edge": ">18",  "safari": ">12",  "firefox": ">=60",  "chrome": ">=74",  "chromium": ">=74",  "opera": ">=62",  "samsung internet for android": ">=11.1.1.52"}`` |
| networkPriorities | Network priorities. | `"object"` | ``{  "audio": "high",  "mainVideo": "high",  "additionalVideos": "medium",  "screenShare": "medium"}`` |
| viewAspectRatio | The aspect ratio of the videos as shown on the screen. | `"float"` | ``1.777`` |
| viewAspectRatios | The selectable aspect ratios in the settings. | `"array"` | ``[  {    "value": 1.333,    "label": "4 : 3"  },  {    "value": 1.777,    "label": "16 : 9"  }]`` |
| videoAspectRatio | The aspect ratio of the video from the camera. | `"float"` | ``1.777`` |
| resolution | The default video camera capture resolution. | `[  "low",  "medium",  "high",  "veryhigh",  "ultra"]` | ``"medium"`` |
| frameRate | The default video camera capture framerate. | `"nat"` | ``15`` |
| screenResolution | The default screen sharing resolution. | `[  "low",  "medium",  "high",  "veryhigh",  "ultra"]` | ``"veryhigh"`` |
| screenSharingFrameRate | The default screen sharing framerate. | `"nat"` | ``5`` |
| simulcast | Enable or disable simulcast for webcam video. | `"boolean"` | ``true`` |
| simulcastSharing | Enable or disable simulcast for screen sharing video. | `"boolean"` | ``false`` |
| simulcastProfiles | Define different encodings for various resolutions of the video. | `"object"` | ``{  "320": [    {      "scaleResolutionDownBy": 1,      "maxBitRate": 250000    }  ],  "640": [    {      "scaleResolutionDownBy": 2,      "maxBitRate": 250000    },    {      "scaleResolutionDownBy": 1,      "maxBitRate": 900000    }  ],  "1280": [    {      "scaleResolutionDownBy": 4,      "maxBitRate": 250000    },    {      "scaleResolutionDownBy": 2,      "maxBitRate": 900000    },    {      "scaleResolutionDownBy": 1,      "maxBitRate": 3000000    }  ],  "1920": [    {      "scaleResolutionDownBy": 4,      "maxBitRate": 750000    },    {      "scaleResolutionDownBy": 2,      "maxBitRate": 1500000    },    {      "scaleResolutionDownBy": 1,      "maxBitRate": 4000000    }  ],  "3840": [    {      "scaleResolutionDownBy": 4,      "maxBitRate": 1500000    },    {      "scaleResolutionDownBy": 2,      "maxBitRate": 4000000    },    {      "scaleResolutionDownBy": 1,      "maxBitRate": 10000000    }  ]}`` |
| adaptiveScalingFactor | The adaptive spatial layer selection scaling factor. |  | ``0.75`` |
| audioOutputSupportedBrowsers | White listing browsers that support audio output device selection. | `"array"` | ``[  "chrome",  "opera"]`` |
| requestTimeout | The Socket.io request timeout. | `"nat"` | ``20000`` |
| requestRetries | The Socket.io request maximum retries. | `"nat"` | ``3`` |
| transportOptions |  | `"object"` | ``{  "tcp": true}`` |
| autoGainControl | Auto gain control enabled. | `"boolean"` | ``true`` |
| echoCancellation | Echo cancellation enabled. | `"boolean"` | ``true`` |
| noiseSuppression | Noise suppression enabled. | `"boolean"` | ``true`` |
| voiceActivatedUnmute | Automatically unmute speaking above noiseThreshold. | `"boolean"` | ``false`` |
| noiseThreshold | This is only for voiceActivatedUnmute and audio-indicator. | `"int"` | ``-60`` |
| sampleRate | The audio sample rate. | `[  8000,  16000,  24000,  44100,  48000]` | ``48000`` |
| channelCount | The audio channels count. | `[  1,  2]` | ``1`` |
| sampleSize | The audio sample size count. | `[  8,  16,  24,  32]` | ``16`` |
| opusStereo | If OPUS FEC stereo be enabled. | `"boolean"` | ``false`` |
| opusDtx | If OPUS DTX should be enabled. | `"boolean"` | ``true`` |
| opusFec | If OPUS FEC should be enabled. | `"boolean"` | ``true`` |
| opusPtime | The OPUS packet time. | `[  3,  5,  10,  20,  30,  40,  50,  60]` | ``20`` |
| opusMaxPlaybackRate | The OPUS playback rate. | `[  8000,  16000,  24000,  44100,  48000]` | ``48000`` |
| audioPreset | The audio preset | `"string"` | ``"conference"`` |
| audioPresets | The audio presets. | `"*"` | ``{  "conference": {    "name": "Conference audio",    "autoGainControl": true,    "echoCancellation": true,    "noiseSuppression": true,    "voiceActivatedUnmute": false,    "noiseThreshold": -60,    "sampleRate": 48000,    "channelCount": 1,    "sampleSize": 16,    "opusStereo": false,    "opusDtx": true,    "opusFec": true,    "opusPtime": 20,    "opusMaxPlaybackRate": 48000  },  "hifi": {    "name": "HiFi streaming",    "autoGainControl": false,    "echoCancellation": false,    "noiseSuppression": false,    "voiceActivatedUnmute": false,    "noiseThreshold": -60,    "sampleRate": 48000,    "channelCount": 2,    "sampleSize": 16,    "opusStereo": true,    "opusDtx": false,    "opusFec": true,    "opusPtime": 60,    "opusMaxPlaybackRate": 48000  }}`` |
| autoMuteThreshold | Set the max number of participants in one room that join unmuted. | `"nat"` | ``4`` |
| background | The page background image URL | `"string"` | ``"images/background.jpg"`` |
| defaultLayout | The default layout | `[  "democratic",  "filmstrip"]` | ``"democratic"`` |
| buttonControlBar | If true, will show media control buttons in separate control bar, not in the ME container. | `"boolean"` | ``false`` |
| drawerOverlayed | If false, will push videos away to make room for side drawer. If true, will overlay side drawer over videos. | `"boolean"` | ``true`` |
| notificationPosition | The position of notifications. | `[  "left",  "right"]` | ``"right"`` |
| notificationSounds | Set the notifications sounds. | `"object"` | ``{  "chatMessage": {    "play": "/sounds/notify-chat.mp3"  },  "raisedHand": {    "play": "/sounds/notify-hand.mp3"  },  "default": {    "delay": 5000,    "play": "/sounds/notify.mp3"  }}`` |
| hideTimeout | Timeout for autohiding topbar and button control bar. | `"int"` | ``3000`` |
| lastN | The max number of participant that will be visible in as speaker. | `"nat"` | ``4`` |
| mobileLastN | The max number of participant that will be visible in as speaker for mobile users. | `"nat"` | ``1`` |
| maxLastN | The highest number of lastN the user can select manually in the user interface. | `"nat"` | ``5`` |
| lockLastN | If truthy, users can NOT change number of speakers visible. | `"boolean"` | ``false`` |
| logo | If not null, it shows the logo loaded from URL, else it shows the title. | `"url"` | ``"images/logo.edumeet.svg"`` |
| title | The title to show if the logo is not specified. | `"string"` | ``"edumeet"`` |
| supportUrl | The service & Support URL; if `null`, it will be not displayed on the about dialogs. | `"url"` | ``"https://support.example.com"`` |
| privacyUrl | The privacy and data protection URL or path. | `"string"` | ``"privacy/privacy.html"`` |
| theme.palette.primary.main | undefined | `"string"` | ``"#313131"`` |
| theme.overrides.MuiAppBar.colorPrimary.backgroundColor | undefined | `"string"` | ``"#313131"`` |
| theme.overrides.MuiButton.containedPrimary.backgroundColor | undefined | `"string"` | ``"#5F9B2D"`` |
| theme.overrides.MuiButton.containedPrimary.&:hover.backgroundColor | undefined | `"string"` | ``"#5F9B2D"`` |
| theme.overrides.MuiButton.containedSecondary.backgroundColor | undefined | `"string"` | ``"#f50057"`` |
| theme.overrides.MuiButton.containedSecondary.&:hover.backgroundColor | undefined | `"string"` | ``"#f50057"`` |
| theme.overrides.MuiFab.primary.backgroundColor | undefined | `"string"` | ``"#5F9B2D"`` |
| theme.overrides.MuiFab.primary.&:hover.backgroundColor | undefined | `"string"` | ``"#5F9B2D"`` |
| theme.overrides.MuiFab.secondary.backgroundColor | undefined | `"string"` | ``"#f50057"`` |
| theme.overrides.MuiFab.secondary.&:hover.backgroundColor | undefined | `"string"` | ``"#f50057"`` |
| theme.overrides.MuiBadge.colorPrimary.backgroundColor | undefined | `"string"` | ``"#5F9B2D"`` |
| theme.overrides.MuiBadge.colorPrimary.&:hover.backgroundColor | undefined | `"string"` | ``"#518029"`` |
| theme.typography.useNextVariants | undefined | `"boolean"` | ``true`` |


---

*Document generated with:* `yarn gen-config-docs` *from:* [config.ts](src/config.ts).

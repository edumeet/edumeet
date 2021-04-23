const defaultSettings = {
	audioPreset  : 'conference',
	audioPresets :
	{
		conference :
		{
			name                 : 'Conference audio',
			autoGainControl      : true, // default : true
			echoCancellation     : true, // default : true 
			noiseSuppression     : true, // default : true 
			// Automatically unmute speaking above noisThereshold
			voiceActivatedUnmute : false, // default : false 
			// This is only for voiceActivatedUnmute and audio-indicator
			noiseThreshold       : -60, // default -60
			// will not eat that much bandwith thanks to opus
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
			// Automatically unmute speaking above noisThereshold
			voiceActivatedUnmute : false, // default : false 
			// This is only for voiceActivatedUnmute and audio-indicator
			noiseThreshold       : -60, // default -60
			// will not eat that much bandwith thanks to opus
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
};

const initialState =
{
	displayName             : '',
	selectedWebcam          : null,
	selectedAudioDevice     : null,
	advancedMode            : false,
	autoGainControl         : true,
	echoCancellation        : true,
	noiseSuppression        : true,
	voiceActivatedUnmute    : false,
	noiseThreshold          : -50,
	audioMuted              : false,
	videoMuted              : false,
	// low, medium, high, veryhigh, ultra
	resolution              : window.config.defaultResolution || 'medium',
	frameRate               : window.config.defaultFrameRate || 15,
	screenSharingResolution : window.config.defaultScreenResolution || 'veryhigh',
	screenSharingFrameRate  : window.config.defaultScreenSharingFrameRate || 5,
	lastN                   : 4,
	permanentTopBar         : true,
	hiddenControls          : false,
	showNotifications       : true,
	notificationSounds      : true,
	mirrorOwnVideo          : true,
	hideNoVideoParticipants : false,
	buttonControlBar        : window.config.buttonControlBar || false,
	drawerOverlayed         : (typeof window.config.drawerOverlayed === 'undefined') ? true : window.config.drawerOverlayed,
	aspectRatio             : window.config.viewAspectRatio || 1.777, // 16 : 9
	mediaPerms              : { audio: true, video: true },
	localPicture            : null
};

Object.assign(initialState,	defaultSettings);
Object.assign(initialState,	defaultSettings.audioPresets[defaultSettings.audioPreset]);

const settings = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'CHANGE_WEBCAM':
		{
			return { ...state, selectedWebcam: action.payload.deviceId };
		}

		case 'CHANGE_AUDIO_DEVICE':
		{
			return { ...state, selectedAudioDevice: action.payload.deviceId };
		}

		case 'CHANGE_AUDIO_OUTPUT_DEVICE':
		{
			return { ...state, selectedAudioOutputDevice: action.payload.deviceId };
		}

		case 'SET_DISPLAY_NAME':
		{
			const { displayName } = action.payload;

			return { ...state, displayName };
		}

		case 'TOGGLE_ADVANCED_MODE':
		{
			const advancedMode = !state.advancedMode;

			return { ...state, advancedMode };
		}

		case 'SET_SAMPLE_RATE':
		{
			const { sampleRate } = action.payload;

			return { ...state, sampleRate, opusMaxPlaybackRate: sampleRate };
		}

		case 'SET_CHANNEL_COUNT':
		{
			const { channelCount } = action.payload;

			return { ...state, channelCount, opusStereo: channelCount > 1 };
		}

		case 'SET_VOLUME':
		{
			const { volume } = action.payload;

			return { ...state, volume };
		}

		case 'SET_AUTO_GAIN_CONTROL':
		{
			const { autoGainControl } = action.payload;

			return { ...state, autoGainControl };
		}

		case 'SET_AUDIO_PRESET':
		{
			const { audioPreset } = action.payload;

			return { ...state, audioPreset };
		}

		case 'SET_ECHO_CANCELLATION':
		{
			const { echoCancellation } = action.payload;

			return { ...state, echoCancellation };
		}

		case 'SET_NOISE_SUPPRESSION':
		{
			const { noiseSuppression } = action.payload;

			return { ...state, noiseSuppression };
		}

		case 'SET_VOICE_ACTIVATED_UNMUTE':
		{
			const { voiceActivatedUnmute } = action.payload;

			return { ...state, voiceActivatedUnmute };
		}

		case 'SET_NOISE_THRESHOLD':
		{
			const { noiseThreshold } = action.payload;

			return { ...state, noiseThreshold };
		}

		case 'SET_OPUS_STEREO':
		{
			const { opusStereo } = action.payload;

			return { ...state, opusStereo };
		}

		case 'SET_OPUS_DTX':
		{
			const { opusDtx } = action.payload;

			return { ...state, opusDtx };
		}

		case 'SET_OPUS_FEC':
		{
			const { opusFec } = action.payload;

			return { ...state, opusFec };
		}

		case 'SET_OPUS_PTIME':
		{
			const { opusPtime } = action.payload;

			return { ...state, opusPtime };
		}

		case 'SET_OPUS_MAX_PLAYBACK_RATE':
		{
			const { opusMaxPlaybackRate } = action.payload;

			return { ...state, opusMaxPlaybackRate };
		}

		case 'SET_DEFAULT_AUDIO':
		{
			const { audio } = action.payload;

			return { ...state, audio };
		}

		case 'SET_SAMPLE_SIZE':
		{
			const { sampleSize } = action.payload;

			return { ...state, sampleSize };
		}

		case 'SET_ASPECT_RATIO':
		{
			const { aspectRatio } = action.payload;

			return { ...state, aspectRatio };
		}

		case 'SET_LAST_N':
		{
			const { lastN } = action.payload;

			return { ...state, lastN };
		}

		case 'TOGGLE_PERMANENT_TOPBAR':
		{
			const permanentTopBar = !state.permanentTopBar;

			return { ...state, permanentTopBar };
		}

		case 'TOGGLE_BUTTON_CONTROL_BAR':
		{
			const buttonControlBar = !state.buttonControlBar;

			return { ...state, buttonControlBar };
		}

		case 'TOGGLE_DRAWER_OVERLAYED':
		{
			const drawerOverlayed = !state.drawerOverlayed;

			return { ...state, drawerOverlayed };
		}

		case 'TOGGLE_HIDDEN_CONTROLS':
		{
			const hiddenControls = !state.hiddenControls;

			return { ...state, hiddenControls };
		}

		case 'TOGGLE_NOTIFICATION_SOUNDS':
		{
			const notificationSounds = !state.notificationSounds;

			return { ...state, notificationSounds };
		}

		case 'TOGGLE_SHOW_NOTIFICATIONS':
		{
			const showNotifications = !state.showNotifications;

			return { ...state, showNotifications };
		}

		case 'SET_VIDEO_RESOLUTION':
		{
			const { resolution } = action.payload;

			return { ...state, resolution };
		}

		case 'SET_VIDEO_FRAME_RATE':
		{
			const { frameRate } = action.payload;

			return { ...state, frameRate };
		}

		case 'SET_SCREEN_SHARING_RESOLUTION':
		{
			const { screenSharingResolution } = action.payload;

			return { ...state, screenSharingResolution };
		}

		case 'SET_SCREEN_SHARING_FRAME_RATE':
		{
			const { screenSharingFrameRate } = action.payload;

			return { ...state, screenSharingFrameRate };
		}

		case 'TOGGLE_MIRROR_OWN_VIDEO':
		{
			const mirrorOwnVideo = !state.mirrorOwnVideo;

			return { ...state, mirrorOwnVideo };
		}

		case 'TOGGLE_HIDE_NO_VIDEO_PARTICIPANTS':
		{
			const hideNoVideoParticipants = !state.hideNoVideoParticipants;

			return { ...state, hideNoVideoParticipants };
		}

		case 'SET_MEDIA_PERMS':
		{
			const { mediaPerms } = action.payload;

			return { ...state, mediaPerms };
		}

		case 'SET_AUDIO_MUTED':
		{
			const { audioMuted } = action.payload;

			return { ...state, audioMuted };
		}

		case 'SET_VIDEO_MUTED':
		{
			const { videoMuted } = action.payload;

			return { ...state, videoMuted };
		}

		case 'SET_LOCAL_PICTURE':
		{
			const { localPicture } = action.payload;

			return { ...state, localPicture };
		}

		default:
			return state;
	}
};

export default settings;

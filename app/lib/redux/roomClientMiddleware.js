import RoomClient from '../RoomClient';

export default ({ dispatch, getState }) => (next) =>
{
	let client;

	return (action) =>
	{
		switch (action.type)
		{
			case 'JOIN_ROOM':
			{
				const {
					roomId,
					peerName,
					displayName,
					device,
					useSimulcast,
					produce
				} = action.payload;

				client = new RoomClient(
					{
						roomId,
						peerName,
						displayName,
						device,
						useSimulcast,
						produce,
						dispatch,
						getState
					});

				// TODO: TMP
				global.CLIENT = client;

				break;
			}

			case 'LEAVE_ROOM':
			{
				client.close();

				break;
			}

			case 'CHANGE_DISPLAY_NAME':
			{
				const { displayName } = action.payload;

				client.changeDisplayName(displayName);

				break;
			}

			case 'MUTE_MIC':
			{
				client.muteMic();

				break;
			}

			case 'UNMUTE_MIC':
			{
				client.unmuteMic();

				break;
			}

			case 'ENABLE_WEBCAM':
			{
				client.enableWebcam();

				break;
			}

			case 'DISABLE_WEBCAM':
			{
				client.disableWebcam();

				break;
			}

			case 'CHANGE_WEBCAM':
			{
				const { deviceId } = action.payload;

				client.changeWebcam(deviceId);

				break;
			}

			case 'CHANGE_AUDIO_DEVICE':
			{
				const { deviceId } = action.payload;

				client.changeAudioDevice(deviceId);

				break;
			}

			case 'ENABLE_AUDIO_ONLY':
			{
				client.enableAudioOnly();

				break;
			}

			case 'DISABLE_AUDIO_ONLY':
			{
				client.disableAudioOnly();

				break;
			}

			case 'MUTE_PEER_AUDIO':
			{
				const { peerName } = action.payload;

				client.mutePeerAudio(peerName);

				break;
			}

			case 'UNMUTE_PEER_AUDIO':
			{
				const { peerName } = action.payload;

				client.unmutePeerAudio(peerName);

				break;
			}

			case 'PAUSE_PEER_VIDEO':
			{
				const { peerName } = action.payload;

				client.pausePeerVideo(peerName);

				break;
			}

			case 'RESUME_PEER_VIDEO':
			{
				const { peerName } = action.payload;

				client.resumePeerVideo(peerName);

				break;
			}

			case 'PAUSE_PEER_SCREEN':
			{
				const { peerName } = action.payload;

				client.pausePeerScreen(peerName);

				break;
			}

			case 'RESUME_PEER_SCREEN':
			{
				const { peerName } = action.payload;

				client.resumePeerScreen(peerName);

				break;
			}

			case 'RAISE_HAND':
			{
				client.sendRaiseHandState(true);

				break;
			}

			case 'USER_LOGIN':
			{
				client.login();

				break;
			}

			case 'LOWER_HAND':
			{
				client.sendRaiseHandState(false);

				break;
			}

			case 'RESTART_ICE':
			{
				client.restartIce();

				break;
			}

			case 'ENABLE_SCREEN_SHARING':
			{
				client.enableScreenSharing();

				break;
			}

			case 'DISABLE_SCREEN_SHARING':
			{
				client.disableScreenSharing();

				break;
			}

			case 'INSTALL_EXTENSION':
			{
				client.installExtension();

				break;
			}

			case 'SEND_CHAT_MESSAGE':
			{
				const { message } = action.payload;

				client.sendChatMessage(message);

				break;
			}
		}

		return next(action);
	};
};

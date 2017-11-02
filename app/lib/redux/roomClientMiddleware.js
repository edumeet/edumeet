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
				client.changeWebcam();

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

			case 'RESTART_ICE':
			{
				client.restartIce();

				break;
			}
		}

		return next(action);
	};
};

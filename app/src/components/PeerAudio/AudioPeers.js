import React from 'react';
import { connect } from 'react-redux';
import { micConsumerSelector } from '../../store/selectors';
import { withRoomContext } from '../../RoomContext';
import PropTypes from 'prop-types';
import PeerAudio from './PeerAudio';

const AudioPeers = (props) =>
{
	const {
		micConsumers,
		selectedAudioOutputDevice,
		audioOutputDevices
	} = props;

	let audioOutputDeviceId;

	if (audioOutputDevices)
	{
		if (selectedAudioOutputDevice &&
			audioOutputDevices[selectedAudioOutputDevice])
		{
			audioOutputDeviceId = selectedAudioOutputDevice;
		}
		else
		{
			audioOutputDeviceId =
				audioOutputDevices[0] ? audioOutputDevices[0].deviceId : null;
		}
	}

	return (
		<div data-component='AudioPeers'>
			{
				micConsumers.map((micConsumer) =>
				{
					return (
						<PeerAudio
							key={micConsumer.id}
							audioTrack={micConsumer.track}
							audioOutputDevice={audioOutputDeviceId}
							audioGain={micConsumer.audioGain}
						/>
					);
				})
			}
		</div>
	);
};

AudioPeers.propTypes =
{
	selectedAudioOutputDevice : PropTypes.string,
	audioOutputDevices        : PropTypes.object,
	micConsumers              : PropTypes.array
};

const mapStateToProps = (state) =>
	({
		selectedAudioOutputDevice : state.settings.selectedAudioOutputDevice,
		audioOutputDevices        : state.me.audioOutputDevices,
		micConsumers              : micConsumerSelector(state)
	});

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.consumers === next.consumers &&
				prev.room.spotlights === next.room.spotlights &&
				prev.me.audioOutputDevices === next.me.audioOutputDevices &&
				prev.settings.selectedAudioOutputDevice ===
				next.settings.selectedAudioOutputDevice
			);
		}
	}
)(AudioPeers));

import React from 'react';
import { connect } from 'react-redux';
import { micConsumerSelector } from '../Selectors';
import PropTypes from 'prop-types';
import PeerAudio from './PeerAudio';

const AudioPeers = (props) =>
{
	const {
		micConsumers,
		audioOutputDevice
	} = props;

	return (
		<div data-component='AudioPeers'>
			{
				micConsumers.map((micConsumer) =>
				{
					return (
						<PeerAudio
							key={micConsumer.id}
							audioTrack={micConsumer.track}
							audioOutputDevice={audioOutputDevice}
						/>
					);
				})
			}
		</div>
	);
};

AudioPeers.propTypes =
{
	micConsumers      : PropTypes.array,
	audioOutputDevice : PropTypes.string
};

const mapStateToProps = (state) =>
	({
		micConsumers      : micConsumerSelector(state),
		audioOutputDevice : state.settings.selectedAudioOutputDevice
	});

const AudioPeersContainer = connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.consumers === next.consumers &&
				prev.room.spotlights === next.room.spotlights &&
				prev.settings.selectedAudioOutputDevice ===
				next.settings.selectedAudioOutputDevice
			);
		}
	}
)(AudioPeers);

export default AudioPeersContainer;

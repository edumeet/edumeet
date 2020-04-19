import React from 'react';
import { connect } from 'react-redux';
import { micConsumerSelector } from '../Selectors';
import PropTypes from 'prop-types';
import PeerAudio from './PeerAudio';
import settings from '../../reducers/settings';

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
	micConsumers : PropTypes.array
};

const mapStateToProps = (state) =>
	({
		micConsumers : micConsumerSelector(state),
		audioOutputDevice : settings.selectedAudioOutputDevice
	});

const AudioPeersContainer = connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.consumers === next.consumers
			);
		}
	}
)(AudioPeers);

export default AudioPeersContainer;

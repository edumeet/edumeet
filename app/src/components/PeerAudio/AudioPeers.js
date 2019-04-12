import React from 'react';
import { connect } from 'react-redux';
import { micConsumerSelector } from '../Selectors';
import PropTypes from 'prop-types';
import PeerAudio from './PeerAudio';

const AudioPeers = (props) =>
{
	const {
		micConsumers
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
		micConsumers : micConsumerSelector(state)
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

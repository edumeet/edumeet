import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as appPropTypes from '../appPropTypes';
import PeerAudio from './PeerAudio';

const AudioPeer = ({ micConsumer }) =>
{
	return (
		<PeerAudio
			audioTrack={micConsumer ? micConsumer.track : null}
		/>
	);
};

AudioPeer.propTypes =
{
	micConsumer : appPropTypes.Consumer,
	name        : PropTypes.string
};

const mapStateToProps = (state, { name }) =>
{
	const peer = state.peers[name];
	const consumersArray = peer.consumers
		.map((consumerId) => state.consumers[consumerId]);
	const micConsumer =
		consumersArray.find((consumer) => consumer.source === 'mic');

	return {
		micConsumer
	};
};

const AudioPeerContainer = connect(
	mapStateToProps
)(AudioPeer);

export default AudioPeerContainer;

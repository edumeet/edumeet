import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import AudioPeer from './AudioPeer';

const AudioPeers = ({ peers }) =>
{
	return (
		<div data-component='AudioPeers'>
			{
				Object.values(peers).map((peer) =>
				{
					return (
						<AudioPeer
							key={peer.name}
							name={peer.name}
						/>
					);
				})
			}
		</div>
	);
};

AudioPeers.propTypes =
{
	peers : PropTypes.object
};

const mapStateToProps = (state) =>
({
	peers : state.peers
});

const AudioPeersContainer = connect(
	mapStateToProps
)(AudioPeers);

export default AudioPeersContainer;

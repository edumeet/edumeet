import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as appPropTypes from '../appPropTypes';
import AudioPeer from './AudioPeer';

const AudioPeers = ({ peers }) =>
{
	return (
		<div data-component='AudioPeers'>
			{
				peers.map((peer) =>
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
		peers : PropTypes.arrayOf(appPropTypes.Peer).isRequired
	};

const mapStateToProps = (state) =>
{
	const peers = Object.values(state.peers);

	return {
		peers
	};
};

const AudioPeersContainer = connect(
	mapStateToProps
)(AudioPeers);

export default AudioPeersContainer;

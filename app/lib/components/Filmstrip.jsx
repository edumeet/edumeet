import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import Peer from './Peer';

class Filmstrip extends Component
{
	state = {
		selectedPeerName : null
	};

	handleSelectPeer = (selectedPeerName) =>
	{
		this.setState((oldState) => ({
			selectedPeerName : oldState.selectedPeerName === selectedPeerName ?
				null : selectedPeerName
		}));
	};

	render()
	{
		const { activeSpeakerName, peers, advancedMode } = this.props;

		// Find the name of the peer which is currently speaking. This is either
		// the latest active speaker, or the manually selected peer.
		const activePeerName = this.state.selectedPeerName || activeSpeakerName;

		return (
			<div data-component='Filmstrip'>
				{peers[activePeerName] && (
					<div className='active-peer'>
						<Peer
							advancedMode={advancedMode}
							name={activePeerName}
						/>
					</div>
				)}

				<div className='filmstrip'>
					{Object.keys(peers).map((peerName) => (
						<div
							key={peerName}
							onClick={() => this.handleSelectPeer(peerName)}
							className={classnames('film', {
								selected : this.state.selectedPeerName === peerName,
								active   : activeSpeakerName === peerName
							})}
						>
							<Peer
								advancedMode={advancedMode}
								name={peerName}
							/>
						</div>
					))}
				</div>
			</div>
		);
	}
}

Filmstrip.propTypes = {
	activeSpeakerName : PropTypes.string,
	advancedMode      : PropTypes.bool,
	peers             : appPropTypes.peers
};

const mapStateToProps = (state) =>
	({
		activeSpeakerName : state.room.activeSpeakerName,
		peers             : state.peers
	});

export default connect(
	mapStateToProps
)(Filmstrip);

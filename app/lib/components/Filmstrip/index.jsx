import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as appPropTypes from '../appPropTypes';
import Peer from '../Peer';

class Filmstrip extends Component
{
	state = {
		selectedPeerName : null
	};

	handleSelectPeer = (selectedPeerName) =>
	{
		this.setState({
			selectedPeerName
		});
	};

	render()
	{
		const { activeSpeakerName, peers, advancedMode } = this.props;

		// Find the name of the peer which is currently speaking. This is either
		// the latest active speaker, or the manually selected peer.
		const activePeerName = this.state.selectedPeerName || activeSpeakerName;

		// Find the remainding peer names, which will be shown in the filmstrip.
		const remaindingPeerNames = Object.keys(peers).filter((peerName) =>
			peerName !== activePeerName);

		return (
			<div>
				{peers[activePeerName] && (
					<div>
						<Peer
							advancedMode={advancedMode}
							name={activePeerName}
						/>
					</div>
				)}

				<div>
					{remaindingPeerNames.map((peerName) => (
						<div
							key={peerName}
							onClick={() => this.handleSelectPeer(peerName)}
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

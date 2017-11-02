import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import { Appear } from './transitions';
import Peer from './Peer';

const Peers = ({ peers, activeSpeakerName }) =>
{
	return (
		<div data-component='Peers'>
			{
				peers.map((peer) =>
				{
					return (
						<Appear key={peer.name} duration={1000}>
							<div
								className={classnames('peer-container', {
									'active-speaker' : peer.name === activeSpeakerName
								})}
							>
								<Peer name={peer.name} />
							</div>
						</Appear>
					);
				})
			}
		</div>
	);
};

Peers.propTypes =
{
	peers             : PropTypes.arrayOf(appPropTypes.Peer).isRequired,
	activeSpeakerName : PropTypes.string
};

const mapStateToProps = (state) =>
{
	// TODO: This is not OK since it's creating a new array every time, so triggering a
	// component rendering.
	const peersArray = Object.values(state.peers);

	return {
		peers             : peersArray,
		activeSpeakerName : state.room.activeSpeakerName
	};
};

const PeersContainer = connect(mapStateToProps)(Peers);

export default PeersContainer;

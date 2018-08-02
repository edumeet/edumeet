import React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import * as stateActions from '../../redux/stateActions';
import PropTypes from 'prop-types';
import ListPeer from './ListPeer';
import ListMe from './ListMe';

const ParticipantList = ({ advancedMode, peers, setSelectedPeer, selectedPeerName }) => (
	<div data-component='ParticipantList'>
		<ul className='list'>
			<ListMe />

			{peers.map((peer) => (
				<li
					key={peer.name}
					className={classNames('list-item', {
						selected : peer.name === selectedPeerName
					})}
					onClick={() => setSelectedPeer(peer.name)}
				>
					<ListPeer name={peer.name} advancedMode={advancedMode} />
				</li>
			))}
		</ul>
	</div>
);

ParticipantList.propTypes =
{
	advancedMode     : PropTypes.bool,
	peers            : PropTypes.arrayOf(appPropTypes.Peer).isRequired,
	setSelectedPeer  : PropTypes.func.isRequired,
	selectedPeerName : PropTypes.string
};

const mapStateToProps = (state) =>
{
	const peersArray = Object.values(state.peers);

	return {
		peers            : peersArray,
		selectedPeerName : state.room.selectedPeerName
	};
};

const mapDispatchToProps = {
	setSelectedPeer : stateActions.setSelectedPeer
};

const ParticipantListContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(ParticipantList);

export default ParticipantListContainer;

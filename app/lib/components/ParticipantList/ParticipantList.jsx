import React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import * as requestActions from '../../redux/requestActions';
import PropTypes from 'prop-types';
import ListPeer from './ListPeer';
import ListMe from './ListMe';

const ParticipantList =
	({
		advancedMode,
		peers,
		setSelectedPeer,
		selectedPeerName,
		spotlights
	}) => (
		<div data-component='ParticipantList'>
			<ul className='list'>
				<li className='list-header'>Me:</li>
				<ListMe />
			</ul>
			<br />
			<ul className='list'>
				<li className='list-header'>Participants in Spotlight:</li>
				{peers.filter((peer) =>
				{
					return (spotlights.find((spotlight) =>
					{ return (spotlight === peer.name); }));
				}).map((peer) => (
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
			<br />
			<ul className='list'>
				<li className='list-header'>Passive Participants:</li>
				{peers.filter((peer) =>
				{
					return !(spotlights.find((spotlight) =>
					{ return (spotlight === peer.name); }));
				}).map((peer) => (
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
	selectedPeerName : PropTypes.string,
	spotlights       : PropTypes.array.isRequired
};

const mapStateToProps = (state) =>
{
	const peersArray = Object.values(state.peers);

	return {
		peers            : peersArray,
		selectedPeerName : state.room.selectedPeerName,
		spotlights       : state.room.spotlights
	};
};

const mapDispatchToProps = {
	setSelectedPeer : requestActions.setSelectedPeer
};

const ParticipantListContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(ParticipantList);

export default ParticipantListContainer;

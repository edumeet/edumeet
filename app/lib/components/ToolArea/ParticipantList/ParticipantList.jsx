import React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import * as appPropTypes from '../../appPropTypes';
import { withRoomContext } from '../../../RoomContext';
import PropTypes from 'prop-types';
import ListPeer from './ListPeer';
import ListMe from './ListMe';

const ParticipantList =
	({
		roomClient,
		advancedMode,
		peers,
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
						onClick={() => roomClient.setSelectedPeer(peer.name)}
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
						onClick={() => roomClient.setSelectedPeer(peer.name)}
					>
						<ListPeer name={peer.name} advancedMode={advancedMode} />
					</li>
				))}
			</ul>

		</div>
	);

ParticipantList.propTypes =
{
	roomClient       : PropTypes.any.isRequired,
	advancedMode     : PropTypes.bool,
	peers            : PropTypes.arrayOf(appPropTypes.Peer).isRequired,
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

const ParticipantListContainer = withRoomContext(connect(
	mapStateToProps
)(ParticipantList));

export default ParticipantListContainer;

import React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import * as appPropTypes from '../../appPropTypes';
import { withRoomContext } from '../../../RoomContext';
import PropTypes from 'prop-types';
import ListPeer from './ListPeer';
import ListMe from './ListMe';

const styles = (theme) =>
	({
		root :
		{
			width     : '100%',
			overflowY : 'auto',
			padding   : 6
		},
		list :
		{
			listStyleType   : 'none',
			padding         : theme.spacing.unit,
			boxShadow       : '0 2px 5px 2px rgba(0, 0, 0, 0.2)',
			backgroundColor : 'rgba(255, 255, 255, 1)'
		},
		listheader :
		{
			padding    : '0.5rem',
			fontWeight : 'bolder'
		},
		listItem :
		{
			padding      : '0.5rem',
			width        : '100%',
			overflow     : 'hidden',
			cursor       : 'pointer',
			'&.selected' :
			{
				backgroundColor: 'rgba(55, 126, 255, 1)'
			},
			'&:not(:last-child)' :
			{
				borderBottom : '1px solid #CBCBCB'
			}
		}
	});

class ParticipantList extends React.PureComponent
{
	componentDidMount()
	{
		this.node.scrollTop = this.node.scrollHeight;
	}

	getSnapshotBeforeUpdate()
	{
		return this.node.scrollTop
			+ this.node.offsetHeight === this.node.scrollHeight;
	}

	componentDidUpdate(prevProps, prevState, shouldScroll)
	{
		if (shouldScroll)
		{
			this.node.scrollTop = this.node.scrollHeight;
		}
	}

	render()
	{
		const {
			roomClient,
			advancedMode,
			peers,
			selectedPeerName,
			spotlights,
			classes
		} = this.props;

		return (
			<div className={classes.root} ref={(node) => { this.node = node; }}>
				<ul className={classes.list}>
					<li className={classes.listheader}>Me:</li>
					<ListMe />
				</ul>
				<br />
				<ul className={classes.list}>
					<li className={classes.listheader}>Participants in Spotlight:</li>
					{peers.filter((peer) =>
					{
						return (spotlights.find((spotlight) =>
						{ return (spotlight === peer.name); }));
					}).map((peer) => (
						<li
							key={peer.name}
							className={classNames(classes.listItem, {
								selected : peer.name === selectedPeerName
							})}
							onClick={() => roomClient.setSelectedPeer(peer.name)}
						>
							<ListPeer name={peer.name} advancedMode={advancedMode} />
						</li>
					))}
				</ul>
				<br />
				<ul className={classes.list}>
					<li className={classes.listheader}>Passive Participants:</li>
					{peers.filter((peer) =>
					{
						return !(spotlights.find((spotlight) =>
						{ return (spotlight === peer.name); }));
					}).map((peer) => (
						<li
							key={peer.name}
							className={classNames(classes.listItem, {
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
	}
}

ParticipantList.propTypes =
{
	roomClient       : PropTypes.any.isRequired,
	advancedMode     : PropTypes.bool,
	peers            : PropTypes.arrayOf(appPropTypes.Peer).isRequired,
	selectedPeerName : PropTypes.string,
	spotlights       : PropTypes.array.isRequired,
	classes          : PropTypes.object.isRequired
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
)(withStyles(styles)(ParticipantList)));

export default ParticipantListContainer;

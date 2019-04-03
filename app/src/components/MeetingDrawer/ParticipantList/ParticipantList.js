import React from 'react';
import { connect } from 'react-redux';
import {
	passivePeersSelector,
	spotlightPeersSelector
} from '../../Selectors';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
import PropTypes from 'prop-types';
import ListPeer from './ListPeer';
import ListMe from './ListMe';
import Volume from '../../Containers/Volume';

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
				backgroundColor : 'rgba(55, 126, 255, 1)'
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
			passivePeers,
			selectedPeerName,
			spotlightPeers,
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
					{ spotlightPeers.map((peer) => (
						<li
							key={peer.name}
							className={classNames(classes.listItem, {
								selected : peer.name === selectedPeerName
							})}
							onClick={() => roomClient.setSelectedPeer(peer.name)}
						>
							<ListPeer name={peer.name} advancedMode={advancedMode}>
								<Volume small name={peer.name} />
							</ListPeer>
						</li>
					))}
				</ul>
				<br />
				<ul className={classes.list}>
					<li className={classes.listheader}>Passive Participants:</li>
					{ passivePeers.map((peerName) => (
						<li
							key={peerName}
							className={classNames(classes.listItem, {
								selected : peerName === selectedPeerName
							})}
							onClick={() => roomClient.setSelectedPeer(peerName)}
						>
							<ListPeer name={peerName} advancedMode={advancedMode} />
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
	passivePeers     : PropTypes.array,
	selectedPeerName : PropTypes.string,
	spotlightPeers   : PropTypes.array,
	classes          : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		passivePeers     : passivePeersSelector(state),
		selectedPeerName : state.room.selectedPeerName,
		spotlightPeers   : spotlightPeersSelector(state)
	};
};

const ParticipantListContainer = withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.peers === next.peers &&
				prev.spotlights === next.spotlights &&
				prev.room.selectedPeerName === next.room.selectedPeerName
			);
		}
	}
)(withStyles(styles)(ParticipantList)));

export default ParticipantListContainer;

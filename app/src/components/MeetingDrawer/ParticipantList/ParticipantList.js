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
import { FormattedMessage } from 'react-intl';
import ListPeer from './ListPeer';
import ListMe from './ListMe';
import Volume from '../../Containers/Volume';

const styles = (theme) =>
	({
		root :
		{
			width     : '100%',
			overflowY : 'auto',
			padding   : theme.spacing(1)
		},
		list :
		{
			listStyleType   : 'none',
			padding         : theme.spacing(1),
			boxShadow       : '0 2px 5px 2px rgba(0, 0, 0, 0.2)',
			backgroundColor : 'rgba(255, 255, 255, 1)'
		},
		listheader :
		{
			padding    : theme.spacing(1),
			fontWeight : 'bolder'
		},
		listItem :
		{
			padding      : theme.spacing(1),
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
			selectedPeerId,
			spotlightPeers,
			classes
		} = this.props;

		return (
			<div className={classes.root} ref={(node) => { this.node = node; }}>
				<ul className={classes.list}>
					<li className={classes.listheader}>
						<FormattedMessage
							id='room.me'
							defaultMessage='Me'
						/>
					</li>
					<ListMe />
				</ul>
				<ul className={classes.list}>
					<li className={classes.listheader}>
						<FormattedMessage
							id='room.spotlights'
							defaultMessage='Participants in Spotlight'
						/>
					</li>
					{ spotlightPeers.map((peerId) => (
						<li
							key={peerId}
							className={classNames(classes.listItem, {
								selected : peerId === selectedPeerId
							})}
							onClick={() => roomClient.setSelectedPeer(peerId)}
						>
							<ListPeer id={peerId} advancedMode={advancedMode}>
								<Volume small id={peerId} />
							</ListPeer>
						</li>
					))}
				</ul>
				<ul className={classes.list}>
					<li className={classes.listheader}>
						<FormattedMessage
							id='room.passive'
							defaultMessage='Passive Participants'
						/>
					</li>
					{ passivePeers.map((peerId) => (
						<li
							key={peerId}
							className={classNames(classes.listItem, {
								selected : peerId === selectedPeerId
							})}
							onClick={() => roomClient.setSelectedPeer(peerId)}
						>
							<ListPeer id={peerId} advancedMode={advancedMode} />
						</li>
					))}
				</ul>
			</div>
		);
	}
}

ParticipantList.propTypes =
{
	roomClient     : PropTypes.any.isRequired,
	advancedMode   : PropTypes.bool,
	passivePeers   : PropTypes.array,
	selectedPeerId : PropTypes.string,
	spotlightPeers : PropTypes.array,
	classes        : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		passivePeers   : passivePeersSelector(state),
		selectedPeerId : state.room.selectedPeerId,
		spotlightPeers : spotlightPeersSelector(state)
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
				prev.room.spotlights === next.room.spotlights &&
				prev.room.selectedPeerId === next.room.selectedPeerId
			);
		}
	}
)(withStyles(styles)(ParticipantList)));

export default ParticipantListContainer;

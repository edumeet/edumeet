import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withRoomContext } from '../../../RoomContext';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import PromoteIcon from '@material-ui/icons/OpenInBrowser';

const styles = (theme) =>
	({
		root :
		{
			padding  : theme.spacing(1),
			width    : '100%',
			overflow : 'hidden',
			cursor   : 'auto',
			display  : 'flex'
		},
		avatar :
		{
			borderRadius : '50%',
			height       : '2rem'
		},
		peerInfo :
		{
			fontSize    : '1rem',
			border      : 'none',
			display     : 'flex',
			paddingLeft : theme.spacing(1),
			flexGrow    : 1,
			alignItems  : 'center'
		},
		controls :
		{
			float          : 'right',
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			alignItems     : 'center'
		},
		button :
		{
			flex               : '0 0 auto',
			margin             : '0.3rem',
			borderRadius       : 2,
			backgroundColor    : 'rgba(0, 0, 0, 0.5)',
			cursor             : 'pointer',
			transitionProperty : 'opacity, background-color',
			transitionDuration : '0.15s',
			width              : 'var(--media-control-button-size)',
			height             : 'var(--media-control-button-size)',
			opacity            : 0.85,
			'&:hover'          :
			{
				opacity : 1
			},
			'&.disabled' :
			{
				pointerEvents   : 'none',
				backgroundColor : 'var(--media-control-botton-disabled)'
			},
			'&.promote' :
			{
				backgroundColor : 'var(--media-control-botton-on)'
			}
		}
	});

const ListLobbyPeer = (props) =>
{
	const {
		roomClient,
		peer,
		classes
	} = props;

	const picture = peer.picture || EmptyAvatar;

	return (
		<div className={classes.root}>
			<img alt='Peer avatar' className={classes.avatar} src={picture} />

			<div className={classes.peerInfo}>
				{peer.displayName}
			</div>
			<div className={classes.controls}>
				<div
					className={classnames(classes.button, 'promote', {
						disabled : peer.promotionInProgress
					})}
					onClick={(e) =>
					{
						e.stopPropagation();
						roomClient.promoteLobbyPeer(peer.id);
					}}
				>
					<PromoteIcon />
				</div>
			</div>
		</div>
	);
};

ListLobbyPeer.propTypes =
{
	roomClient   : PropTypes.any.isRequired,
	advancedMode : PropTypes.bool,
	peer         : PropTypes.object.isRequired,
	classes      : PropTypes.object.isRequired
};

const mapStateToProps = (state, { id }) =>
{
	return {
		peer : state.lobbyPeers[id]
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.lobbyPeers === next.lobbyPeers
			);
		}
	}
)(withStyles(styles)(ListLobbyPeer)));
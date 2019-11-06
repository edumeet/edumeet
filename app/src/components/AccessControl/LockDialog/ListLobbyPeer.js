import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withRoomContext } from '../../../RoomContext';
import { useIntl } from 'react-intl';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import PromoteIcon from '@material-ui/icons/OpenInBrowser';
import Tooltip from '@material-ui/core/Tooltip';

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
		},
		ListItem :
		{
			alignItems : 'center'
		}
	});

const ListLobbyPeer = (props) =>
{
	const {
		roomClient,
		peer,
		classes
	} = props;

	const intl = useIntl();

	const picture = peer.picture || EmptyAvatar;

	return (
		<ListItem 
			className={classnames(classes.ListItem)}
			key={peer.peerId}
			button
			alignItems='flex-start'
		>
			<ListItemAvatar>
				<Avatar alt='Peer avatar' src={picture} />
			</ListItemAvatar>
			<ListItemText
				primary={peer.displayName}
			/>
			<Tooltip
				title={intl.formatMessage({
					id             : 'tooltip.admitFromLobby',
					defaultMessage : 'Click to let them in'
				})}
			>
				<ListItemIcon
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
				</ListItemIcon>
			</Tooltip>
		</ListItem>
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
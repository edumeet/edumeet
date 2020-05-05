import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withRoomContext } from '../../../RoomContext';
import { useIntl } from 'react-intl';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import PromoteIcon from '@material-ui/icons/OpenInBrowser';
import Tooltip from '@material-ui/core/Tooltip';

const styles = () =>
	({
		root :
		{
			alignItems : 'center'
		}
	});

const ListLobbyPeer = (props) =>
{
	const {
		roomClient,
		peer,
		promotionInProgress,
		canPromote,
		classes
	} = props;

	const intl = useIntl();

	const picture = peer.picture || EmptyAvatar;

	return (
		<ListItem 
			className={classnames(classes.root)}
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
				<IconButton
					disabled={
						!canPromote ||
						peer.promotionInProgress ||
						promotionInProgress
					}
					color='primary'
					onClick={(e) =>
					{
						e.stopPropagation();
						roomClient.promoteLobbyPeer(peer.id);
					}}
				>
					<PromoteIcon />
				</IconButton>
			</Tooltip>
		</ListItem>
	);
};

ListLobbyPeer.propTypes =
{
	roomClient          : PropTypes.any.isRequired,
	advancedMode        : PropTypes.bool,
	peer                : PropTypes.object.isRequired,
	promotionInProgress : PropTypes.bool.isRequired,
	canPromote          : PropTypes.bool.isRequired,
	classes             : PropTypes.object.isRequired
};

const mapStateToProps = (state, { id }) =>
{
	return {
		peer                : state.lobbyPeers[id],
		promotionInProgress : state.room.lobbyPeersPromotionInProgress,
		canPromote          :
			state.me.roles.some((role) =>
				state.room.permissionsFromRoles.PROMOTE_PEER.includes(role))
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
				prev.room.permissionsFromRoles === next.room.permissionsFromRoles &&
				prev.room.lobbyPeersPromotionInProgress ===
					next.room.lobbyPeersPromotionInProgress &&
				prev.me.roles === next.me.roles &&
				prev.lobbyPeers === next.lobbyPeers
			);
		}
	}
)(withStyles(styles)(ListLobbyPeer)));
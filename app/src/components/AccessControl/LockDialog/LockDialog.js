import React from 'react';
import { connect } from 'react-redux';
import {
	lobbyPeersKeySelector,
	makePermissionSelector
} from '../../Selectors';
import { permissions } from '../../../permissions';
import * as appPropTypes from '../../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
import * as roomActions from '../../../actions/roomActions';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListSubheader from '@material-ui/core/ListSubheader';
import ListLobbyPeer from './ListLobbyPeer';

const styles = (theme) =>
	({
		root :
		{
		},
		dialogPaper :
		{
			width                          : '30vw',
			[theme.breakpoints.down('lg')] :
			{
				width : '40vw'
			},
			[theme.breakpoints.down('md')] :
			{
				width : '50vw'
			},
			[theme.breakpoints.down('sm')] :
			{
				width : '70vw'
			},
			[theme.breakpoints.down('xs')] :
			{
				width : '90vw'
			}
		},
		lock :
		{
			padding : theme.spacing(2)
		}
	});

const LockDialog = ({
	roomClient,
	room,
	handleCloseLockDialog,
	lobbyPeers,
	canPromote,
	classes
}) =>
{
	return (
		<Dialog
			className={classes.root}
			open={room.lockDialogOpen}
			onClose={() => handleCloseLockDialog(false)}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>
				<FormattedMessage
					id='room.lobbyAdministration'
					defaultMessage='Lobby administration'
				/>
			</DialogTitle>
			{ lobbyPeers.length > 0 ?
				<List
					dense
					subheader={
						<ListSubheader component='div'>
							<FormattedMessage
								id='room.peersInLobby'
								defaultMessage='Participants in Lobby'
							/>
						</ListSubheader>
					}
				>
					{
						lobbyPeers.map((peerId) =>
						{
							return (<ListLobbyPeer key={peerId} id={peerId} />);
						})
					}
				</List>
				:
				<DialogContent>
					<DialogContentText gutterBottom>
						<FormattedMessage
							id='room.lobbyEmpty'
							defaultMessage='There are currently no one in the lobby'
						/>
					</DialogContentText>
				</DialogContent>
			}
			<DialogActions>
				<Button
					disabled={
						lobbyPeers.length === 0 ||
						!canPromote ||
						room.lobbyPeersPromotionInProgress
					}
					onClick={() => roomClient.promoteAllLobbyPeers()}
					color='primary'
				>
					<FormattedMessage
						id='label.promoteAllPeers'
						defaultMessage='Promote all'
					/>
				</Button>
				<Button onClick={() => handleCloseLockDialog(false)} color='primary'>
					<FormattedMessage
						id='label.close'
						defaultMessage='Close'
					/>
				</Button>
			</DialogActions>
		</Dialog>
	);
};

LockDialog.propTypes =
{
	roomClient            : PropTypes.object.isRequired,
	room                  : appPropTypes.Room.isRequired,
	handleCloseLockDialog : PropTypes.func.isRequired,
	handleAccessCode      : PropTypes.func.isRequired,
	lobbyPeers            : PropTypes.array,
	canPromote            : PropTypes.bool,
	classes               : PropTypes.object.isRequired
};

const makeMapStateToProps = () =>
{
	const hasPermission = makePermissionSelector(permissions.PROMOTE_PEER);

	const mapStateToProps = (state) =>
	{
		return {
			room       : state.room,
			lobbyPeers : lobbyPeersKeySelector(state),
			canPromote : hasPermission(state)
		};
	};

	return mapStateToProps;
};

const mapDispatchToProps = {
	handleCloseLockDialog : roomActions.setLockDialogOpen,
	handleAccessCode      : roomActions.setAccessCode
};

export default withRoomContext(connect(
	makeMapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room === next.room &&
				prev.me.roles === next.me.roles &&
				prev.peers === next.peers &&
				prev.lobbyPeers === next.lobbyPeers
			);
		}
	}
)(withStyles(styles)(LockDialog)));
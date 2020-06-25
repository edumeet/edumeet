import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import {
	highestRoleLevelSelector,
	makePermissionSelector
} from '../Selectors';
import { permissions } from '../../permissions';
import * as roomActions from '../../actions/roomActions';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

const styles = (theme) =>
	({
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
		setting :
		{
			padding : theme.spacing(2)
		},
		formControl :
		{
			display : 'flex'
		},
		divider :
		{
			marginLeft : theme.spacing(2)
		},
		green :
		{
			backgroundColor : 'rgba(0, 153, 0, 1)'
		}
	});

const RolesManager = ({
	roomClient,
	peer,
	userRoles,
	canModifyRoles,
	highestLevel,
	rolesManagerOpen,
	handleCloseRolesManager,
	classes
}) =>
{
	return (
		<Dialog
			open={rolesManagerOpen}
			onClose={() => handleCloseRolesManager(false)}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			{ peer &&
				<React.Fragment>
					<DialogTitle id='form-dialog-title'>
						{ peer.displayName }
					</DialogTitle>
					<DialogContent>
						<DialogContentText gutterBottom>
							<FormattedMessage
								id='moderator.modifyPeerRoles'
								defaultMessage='Change roles'
							/>
						</DialogContentText>
					</DialogContent>
					<List>
						{ [ ...userRoles ].map((entry) =>
						{
							const role = entry[1];

							if (role.promotable && (role.level <= highestLevel))
							{
								return (
									<ListItem
										key={role.id}
										disabled={
											(role.level > highestLevel) ||
											!canModifyRoles ||
											peer.peerModifyRolesInProgress
										}
									>
										<ListItemText
											primary={role.label}
											// secondary={role.level}
										/>
										<Button
											aria-label='Give role'
											disabled={
												Boolean(
													peer.roles.some(
														(peerRole) => peerRole === role.id
													)
												)
											}
											variant='contained'
											className={classes.green}
											onClick={() =>
											{
												roomClient.givePeerRole(peer.id, role.id);
											}}
										>
											Give role
										</Button>
										<div className={classes.divider} />
										<Button
											aria-label='Remove role'
											disabled={
												!peer.roles.some(
													(peerRole) => peerRole === role.id
												)
											}
											variant='contained'
											color='secondary'
											onClick={() =>
											{
												roomClient.removePeerRole(peer.id, role.id);
											}}
										>
											Remove role
										</Button>
									</ListItem>
								);
							}
							else
								return null;
						})
						}
					</List>
				</React.Fragment>
			}

			<DialogActions>
				<Button onClick={() => handleCloseRolesManager(false)} color='primary'>
					<FormattedMessage
						id='label.close'
						defaultMessage='Close'
					/>
				</Button>
			</DialogActions>
		</Dialog>
	);
};

RolesManager.propTypes =
{
	roomClient              : PropTypes.object.isRequired,
	peer                    : PropTypes.object,
	userRoles               : PropTypes.object.isRequired,
	canModifyRoles          : PropTypes.bool.isRequired,
	highestLevel            : PropTypes.number.isRequired,
	rolesManagerOpen        : PropTypes.bool.isRequired,
	handleCloseRolesManager : PropTypes.func.isRequired,
	classes                 : PropTypes.object.isRequired
};

const makeMapStateToProps = () =>
{
	const canModifyRoles =
		makePermissionSelector(permissions.MODIFY_ROLE);

	const mapStateToProps = (state) =>
	{
		return {
			peer             : state.peers[state.room.rolesManagerPeer],
			userRoles        : state.room.userRoles,
			canModifyRoles   : canModifyRoles(state),
			highestLevel     : highestRoleLevelSelector(state),
			rolesManagerOpen : state.room.rolesManagerOpen
		};
	};

	return mapStateToProps;
};

const mapDispatchToProps = {
	handleCloseRolesManager : roomActions.setRolesManagerOpen
};

export default withRoomContext(connect(
	makeMapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me === next.me &&
				prev.peers === next.peers &&
				prev.room === next.room
			);
		}
	}
)(withStyles(styles)(RolesManager)));
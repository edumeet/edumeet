import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../RoomContext';
import * as roomActions from '../actions/roomActions';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';
// import Divider from '@material-ui/core/Divider';

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
		logo :
		{
			marginLeft  : theme.spacing(1.5),
			marginRight : 'auto'
		},
		divider :
		{
			marginBottom : theme.spacing(3)
		}
	});

const LeaveDialog = ({
	roomClient,
	leaveOpen,
	classes,
	handleSetLeaveOpen
}) =>

{
	const handleStay = () => handleSetLeaveOpen(false);

	const handleLeave = () => roomClient.close();

	// const handleLeaveWithSavingChat = () => roomClient.close();

	return (
		<Dialog
			open={leaveOpen}
			onClose={() => handleSetLeaveOpen(false)}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title' dividers>
				<FormattedMessage
					id='room.xyz'
					defaultMessage='Leaving confirmation'
				/>
			</DialogTitle>
			<DialogContent dividers>
				<FormattedMessage
					id='room.leaveConfirmationMessage'
					defaultMessage='Do you want to leave the room?'
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleStay} color='primary'>
					<FormattedMessage
						id='label.no'
						defaultMessage='No'
					/>
				</Button>
				<Button onClick={handleLeave} color='primary'>
					<FormattedMessage
						id='label.yes'
						defaultMessage='Yes'
					/>
				</Button>

				{/*
				<Button onClick={handleLeaveWithSavingChat} color='primary'>
					<FormattedMessage
						id='label.yesWithSavingChat'
						defaultMessage='Yes (+ download Chat)'
					/>
				</Button>
				*/}
			</DialogActions>
		</Dialog>
	);
};

LeaveDialog.propTypes =
{
	roomClient         : PropTypes.object.isRequired,
	leaveOpen          : PropTypes.bool.isRequired,
	handleSetLeaveOpen : PropTypes.func.isRequired,
	classes            : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		leaveOpen : state.room.leaveOpen
	});

const mapDispatchToProps = {
	handleSetLeaveOpen : roomActions.setLeaveOpen
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room.leaveOpen === next.room.leaveOpen
			);
		}
	}
)(withStyles(styles)(LeaveDialog)));

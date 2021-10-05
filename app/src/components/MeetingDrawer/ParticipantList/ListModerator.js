import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { withRoomContext } from '../../../RoomContext';
import { useIntl, FormattedMessage } from 'react-intl';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

const styles = (theme) =>
	({
		root :
		{
			padding     : theme.spacing(1),
			display     : 'flex',
			flexWrap    : 'wrap',
			marginRight : -theme.spacing(1),
			marginTop   : -theme.spacing(1)
		},
		button :
		{
			marginTop   : theme.spacing(1),
			marginRight : theme.spacing(1),
			flexGrow    : '1'
		},
		textfield :
		{
			marginTop   : theme.spacing(1),
			marginRight : theme.spacing(1),
			flexGrow    : '1'
		}
	});

const ListModerator = (props) =>
{
	const intl = useIntl();

	const {
		roomClient,
		room,
		classes
	} = props;

	return (
		<div className={classes.root}>
			<TextField fullWidth
				aria-label={intl.formatMessage({
					id             : 'set.countdown',
					defaultMessage : 'Set timer'
				})}
				className={classes.textfield}
				variant='outlined'
				label='timer (hh:mm:ss)'
				disabled={
					room.countdownTimer.isRunning &&
					room.countdownTimer.left !== '00:00:00'
				}
				type='time'
				value={room.countdownTimer.left}
				size='small'
				InputLabelProps={{
					shrink : true
				}}
				inputProps={{
					step : 1
				}}
				onChange={(e) => { roomClient.setCountdownTimer(e.target.value); }}
			/>

			{!room.countdownTimer.isRunning ?
				<Button fullWidth
					aria-label={intl.formatMessage({
						// id             : 'room.muteAll',
						id             : 'start.countdown',
						defaultMessage : 'Start'
					})}
					className={classes.button}
					variant='contained'
					color='secondary'
					disabled={room.countdownTimer.left === '00:00:00'}
					onClick={(e) => roomClient.startCountdownTimer()}
				>
					<FormattedMessage
						// id='room.muteAll'
						id='start'
						defaultMessage='Start'
					/>

				</Button>
				:
				<Button fullWidth
					aria-label={intl.formatMessage({
						id             : 'stop.countdown',
						defaultMessage : 'Stop countdown'
					})}
					className={classes.button}
					variant='contained'
					color='secondary'
					disabled={room.countdownTimer.left === '00:00:00'}
					onClick={() => roomClient.stopCountdownTimer()}
				>
					<FormattedMessage
						id='stop'
						defaultMessage='Stop'
					/>
				</Button>
			}

			<Button
				aria-label={intl.formatMessage({
					id             : 'room.muteAll',
					defaultMessage : 'Mute all'
				})}
				className={classes.button}
				variant='contained'
				color='secondary'
				disabled={room.muteAllInProgress}
				onClick={() => roomClient.muteAllPeers()}
			>
				<FormattedMessage
					id='room.muteAll'
					defaultMessage='Mute all'
				/>
			</Button>
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.stopAllVideo',
					defaultMessage : 'Stop all video'
				})}
				className={classes.button}
				variant='contained'
				color='secondary'
				disabled={room.stopAllVideoInProgress}
				onClick={() => roomClient.stopAllPeerVideo()}
			>
				<FormattedMessage
					id='room.stopAllVideo'
					defaultMessage='Stop all video'
				/>
			</Button>
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.stopAllScreenSharing',
					defaultMessage : 'Stop all screen sharing'
				})}
				className={classes.button}
				variant='contained'
				color='secondary'
				disabled={room.stopAllScreenSharingInProgress}
				onClick={() => roomClient.stopAllPeerScreenSharing()}
			>
				<FormattedMessage
					id='room.stopAllScreenSharing'
					defaultMessage='Stop all screen sharing'
				/>
			</Button>
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.closeMeeting',
					defaultMessage : 'Close meeting'
				})}
				className={classes.button}
				variant='contained'
				color='secondary'
				disabled={room.closeMeetingInProgress}
				onClick={() => roomClient.closeMeeting()}
			>
				<FormattedMessage
					id='room.closeMeeting'
					defaultMessage='Close meeting'
				/>
			</Button>
		</div>
	);
};

ListModerator.propTypes =
{
	roomClient : PropTypes.any.isRequired,
	room       : PropTypes.object.isRequired,
	classes    : PropTypes.object.isRequired
};

const mapStateToProps = (state) => ({
	room : state.room
});

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room === next.room
			);
		}
	}
)(withStyles(styles)(ListModerator)));
import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { withRoomContext } from '../../../RoomContext';
import { useIntl, FormattedMessage } from 'react-intl';
import Button from '@material-ui/core/Button';
import { showVodSelect } from '../../Selectors';

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
		}
	});

const ListModerator = (props) =>
{
	const intl = useIntl();

	const {
		roomClient,
		room,
		classes,
		vodObject
	} = props;

	const isVodShown = (vodObject !== null);

	// TODO-VoDSync - change the hardcoded value to something from gui
	const showVodButton = true;

	return (
		<div className={classes.root}>
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
			{showVodButton && isVodShown &&
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.hideVod',
					defaultMessage : 'Hide VoD'
				})}
				className={classes.button}
				variant='contained'
				color='secondary'
				disabled={room.toggleVodInProgress}
				onClick={() => roomClient.toggleVod()}
			>
				<FormattedMessage
					id='room.hideVod'
					defaultMessage='Hide VoD'
				/>
			</Button>
			}
			{showVodButton && !isVodShown &&
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.showVod',
					defaultMessage : 'Show VoD'
				})}
				className={classes.button}
				variant='contained'
				color='secondary'
				disabled={room.toggleVodInProgress}
				onClick={() => roomClient.toggleVod()}
			>
				<FormattedMessage
					id='room.showVod'
					defaultMessage='Show VoD'
				/>
			</Button>
			}
		</div>
	);
};

ListModerator.propTypes =
{
	roomClient : PropTypes.any.isRequired,
	room       : PropTypes.object.isRequired,
	classes    : PropTypes.object.isRequired,
	vodObject  : PropTypes.object.isRequired
};

const mapStateToProps = (state) => ({
	room      : state.room,
	vodObject : showVodSelect(state)
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
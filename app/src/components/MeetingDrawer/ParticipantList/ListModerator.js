import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { withRoomContext } from '../../../RoomContext';
import { useIntl, FormattedMessage } from 'react-intl';
import Button from '@material-ui/core/Button';

const styles = (theme) =>
	({
		root :
		{
			padding : theme.spacing(1),
			display : 'flex'
		},
		divider :
		{
			marginLeft : theme.spacing(2)
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
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.muteAll',
					defaultMessage : 'Mute all'
				})}
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
			<div className={classes.divider} />
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.stopAllVideo',
					defaultMessage : 'Stop all video'
				})}
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
			<div className={classes.divider} />
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.stopAllScreenSharing',
					defaultMessage : 'Stop all screen sharing'
				})}
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
			<div className={classes.divider} />
			<Button
				aria-label={intl.formatMessage({
					id             : 'room.closeMeeting',
					defaultMessage : 'Close meeting'
				})}
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
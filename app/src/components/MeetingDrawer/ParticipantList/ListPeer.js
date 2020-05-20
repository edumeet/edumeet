import React from 'react';
import { connect } from 'react-redux';
import { makePeerConsumerSelector } from '../../Selectors';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import * as appPropTypes from '../../appPropTypes';
import { withRoomContext } from '../../../RoomContext';
import { useIntl } from 'react-intl';
import { green } from '@material-ui/core/colors';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import VideocamIcon from '@material-ui/icons/Videocam';
import VideocamOffIcon from '@material-ui/icons/VideocamOff';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import ScreenIcon from '@material-ui/icons/ScreenShare';
import ScreenOffIcon from '@material-ui/icons/StopScreenShare';
import ExitIcon from '@material-ui/icons/ExitToApp';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import PanIcon from '@material-ui/icons/PanTool';
import RecordVoiceOverIcon from '@material-ui/icons/RecordVoiceOver';

const styles = (theme) =>
	({
		root :
		{
			width    : '100%',
			overflow : 'hidden',
			cursor   : 'auto',
			display  : 'flex'
		},
		avatar :
		{
			borderRadius : '50%',
			height       : '2rem',
			marginTop    : theme.spacing(0.5)
		},
		peerInfo :
		{
			fontSize    : '1rem',
			display     : 'flex',
			paddingLeft : theme.spacing(1),
			flexGrow    : 1,
			alignItems  : 'center'
		},
		indicators :
		{
			display : 'flex',
			padding : theme.spacing(1)
		},
		buttons :
		{
			padding : theme.spacing(1)
		},
		green :
		{
			color      : 'rgba(0, 153, 0, 1)',
			marginLeft : theme.spacing(2)
		}
	});

const ListPeer = (props) =>
{
	const intl = useIntl();

	const {
		roomClient,
		isModerator,
		spotlight,
		peer,
		micConsumer,
		webcamConsumer,
		screenConsumer,
		children,
		classes
	} = props;

	const webcamEnabled = (
		Boolean(webcamConsumer) &&
		!webcamConsumer.locallyPaused &&
		!webcamConsumer.remotelyPaused
	);

	const micEnabled = (
		Boolean(micConsumer) &&
		!micConsumer.locallyPaused &&
		!micConsumer.remotelyPaused
	);

	const screenVisible = (
		Boolean(screenConsumer) &&
		!screenConsumer.locallyPaused &&
		!screenConsumer.remotelyPaused
	);

	const picture = peer.picture || EmptyAvatar;

	return (
		<div className={classes.root}>
			<img alt='Peer avatar' className={classes.avatar} src={picture} />

			<div className={classes.peerInfo}>
				{peer.displayName}
			</div>
			{ peer.raisedHand &&
				<IconButton
					className={classes.buttons}
					style={{ color: green[500] }}
					disabled={!isModerator || peer.raisedHandInProgress}
					onClick={(e) =>
					{
						e.stopPropagation();

						roomClient.lowerPeerHand(peer.id);
					}}
				>
					<PanIcon />
				</IconButton>
			}
			{ spotlight &&
				<IconButton
					className={classes.buttons}
					style={{ color: green[500] }}
					disabled
				>
					<RecordVoiceOverIcon />
				</IconButton>
			}
			{ screenConsumer && spotlight &&
				<Tooltip
					title={intl.formatMessage({
						id             : 'tooltip.muteScreenSharing',
						defaultMessage : 'Mute participant share'
					})}
					placement='bottom'
				>
					<IconButton
						aria-label={intl.formatMessage({
							id             : 'tooltip.muteScreenSharing',
							defaultMessage : 'Mute participant share'
						})}
						color={screenVisible ? 'primary' : 'secondary'}
						disabled={peer.peerScreenInProgress}
						className={classes.buttons}
						onClick={(e) =>
						{
							e.stopPropagation();

							screenVisible ?
								roomClient.modifyPeerConsumer(peer.id, 'screen', true) :
								roomClient.modifyPeerConsumer(peer.id, 'screen', false);
						}}
					>
						{ screenVisible ?
							<ScreenIcon />
							:
							<ScreenOffIcon />
						}
					</IconButton>
				</Tooltip>
			}
			{ spotlight &&
				<Tooltip
					title={intl.formatMessage({
						id             : 'tooltip.muteParticipantVideo',
						defaultMessage : 'Mute participant video'
					})}
					placement='bottom'
				>
					<IconButton
						aria-label={intl.formatMessage({
							id             : 'tooltip.muteParticipantVideo',
							defaultMessage : 'Mute participant video'
						})}
						color={webcamEnabled ? 'primary' : 'secondary'}
						disabled={peer.peerVideoInProgress}
						className={classes.buttons}
						onClick={(e) =>
						{
							e.stopPropagation();

							webcamEnabled ?
								roomClient.modifyPeerConsumer(peer.id, 'webcam', true) :
								roomClient.modifyPeerConsumer(peer.id, 'webcam', false);
						}}
					>
						{ webcamEnabled ?
							<VideocamIcon />
							:
							<VideocamOffIcon />
						}
					</IconButton>
				</Tooltip>
			}
			<Tooltip
				title={intl.formatMessage({
					id             : 'tooltip.muteParticipant',
					defaultMessage : 'Mute participant'
				})}
				placement='bottom'
			>
				<IconButton
					aria-label={intl.formatMessage({
						id             : 'tooltip.muteParticipant',
						defaultMessage : 'Mute participant'
					})}
					color={micEnabled ? 'primary' : 'secondary'}
					disabled={peer.peerAudioInProgress}
					className={classes.buttons}
					onClick={(e) =>
					{
						e.stopPropagation();

						micEnabled ?
							roomClient.modifyPeerConsumer(peer.id, 'mic', true) :
							roomClient.modifyPeerConsumer(peer.id, 'mic', false);
					}}
				>
					{ micEnabled ?
						<VolumeUpIcon />
						:
						<VolumeOffIcon />
					}
				</IconButton>
			</Tooltip>
			{ isModerator &&
				<Tooltip
					title={intl.formatMessage({
						id             : 'tooltip.kickParticipant',
						defaultMessage : 'Kick out participant'
					})}
					placement='bottom'
				>
					<IconButton
						aria-label={intl.formatMessage({
							id             : 'tooltip.kickParticipant',
							defaultMessage : 'Kick out participant'
						})}
						disabled={peer.peerKickInProgress}
						className={classes.buttons}
						color='secondary'
						onClick={(e) =>
						{
							e.stopPropagation();

							roomClient.kickPeer(peer.id);
						}}
					>
						<ExitIcon />
					</IconButton>
				</Tooltip>
			}
			{ isModerator && micConsumer &&
				<Tooltip
					title={intl.formatMessage({
						id             : 'tooltip.muteParticipantAudioModerator',
						defaultMessage : 'Mute participant audio globally'
					})}
					placement='bottom'
				>
					<IconButton
						className={classes.buttons}
						style={{ color: green[500] }}
						disabled={!isModerator || peer.stopPeerAudioInProgress}
						onClick={(e) =>
						{
							e.stopPropagation();

							roomClient.mutePeer(peer.id);
						}}
					>
						{ !micConsumer.remotelyPaused ?
							<MicIcon />
							:
							<MicOffIcon />
						}
					</IconButton>
				</Tooltip>
			}
			{ isModerator && webcamConsumer &&
				<Tooltip
					title={intl.formatMessage({
						id             : 'tooltip.muteParticipantVideoModerator',
						defaultMessage : 'Mute participant video globally'
					})}
					placement='bottom'
				>
					<IconButton
						className={classes.buttons}
						style={{ color: green[500] }}
						disabled={!isModerator || peer.stopPeerVideoInProgress}
						onClick={(e) =>
						{
							e.stopPropagation();

							roomClient.stopPeerVideo(peer.id);
						}}
					>
						{ !webcamConsumer.remotelyPaused ?
							<VideocamIcon />
							:
							<VideocamOffIcon />
						}
					</IconButton>
				</Tooltip>
			}
			{ isModerator && screenConsumer &&
				<Tooltip
					title={intl.formatMessage({
						id             : 'tooltip.muteScreenSharingModerator',
						defaultMessage : 'Mute participant screen share globally'
					})}
					placement='bottom'
				>
					<IconButton
						className={classes.buttons}
						style={{ color: green[500] }}
						disabled={!isModerator || peer.stopPeerScreenSharingInProgress}
						onClick={(e) =>
						{
							e.stopPropagation();

							roomClient.stopPeerScreenSharing(peer.id);
						}}
					>
						{ !screenConsumer.remotelyPaused ?
							<ScreenIcon />
							:
							<ScreenOffIcon />
						}
					</IconButton>
				</Tooltip>
			}
			{children}
		</div>
	);
};

ListPeer.propTypes =
{
	roomClient     : PropTypes.any.isRequired,
	advancedMode   : PropTypes.bool,
	isModerator    : PropTypes.bool,
	spotlight      : PropTypes.bool,
	peer           : appPropTypes.Peer.isRequired,
	micConsumer    : appPropTypes.Consumer,
	webcamConsumer : appPropTypes.Consumer,
	screenConsumer : appPropTypes.Consumer,
	children       : PropTypes.object,
	classes        : PropTypes.object.isRequired
};

const makeMapStateToProps = (initialState, { id }) =>
{
	const getPeerConsumers = makePeerConsumerSelector();

	const mapStateToProps = (state) =>
	{
		return {
			peer : state.peers[id],
			...getPeerConsumers(state, id)
		};
	};

	return mapStateToProps;
};

export default withRoomContext(connect(
	makeMapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.peers === next.peers &&
				prev.consumers === next.consumers
			);
		}
	}
)(withStyles(styles)(ListPeer)));
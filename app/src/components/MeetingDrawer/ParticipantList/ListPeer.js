import React from 'react';
import { connect } from 'react-redux';
import { makePeerConsumerSelector } from '../../Selectors';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import * as appPropTypes from '../../appPropTypes';
import { withRoomContext } from '../../../RoomContext';
import { useIntl } from 'react-intl';
import IconButton from '@material-ui/core/IconButton';
import VideocamIcon from '@material-ui/icons/Videocam';
import VideocamOffIcon from '@material-ui/icons/VideocamOff';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import ScreenIcon from '@material-ui/icons/ScreenShare';
import ScreenOffIcon from '@material-ui/icons/StopScreenShare';
import ExitIcon from '@material-ui/icons/ExitToApp';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import PanIcon from '@material-ui/icons/PanTool';

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
			marginTop    : theme.spacing(1)
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
			padding : theme.spacing(1.5)
		},
		green :
		{
			color : 'rgba(0, 153, 0, 1)'
		}
	});

const ListPeer = (props) =>
{
	const intl = useIntl();

	const {
		roomClient,
		isModerator,
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
			<div className={classes.indicators}>
				{ peer.raisedHand &&
					<PanIcon className={classes.green} />
				}
			</div>
			{ screenConsumer &&
				<IconButton
					aria-label={intl.formatMessage({
						id             : 'tooltip.muteScreenSharing',
						defaultMessage : 'Mute participant share'
					})}
					color={screenVisible ? 'primary' : 'secondary'}
					disabled={peer.peerScreenInProgress}
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
			}
			<IconButton
				aria-label={intl.formatMessage({
					id             : 'tooltip.muteParticipantVideo',
					defaultMessage : 'Mute participant video'
				})}
				color={webcamEnabled ? 'primary' : 'secondary'}
				disabled={peer.peerVideoInProgress}
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
			<IconButton
				aria-label={intl.formatMessage({
					id             : 'tooltip.muteParticipant',
					defaultMessage : 'Mute participant'
				})}
				color={micEnabled ? 'primary' : 'secondary'}
				disabled={peer.peerAudioInProgress}
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
			{ isModerator &&
				<IconButton
					aria-label={intl.formatMessage({
						id             : 'tooltip.kickParticipant',
						defaultMessage : 'Kick out participant'
					})}
					disabled={peer.peerKickInProgress}
					onClick={(e) =>
					{
						e.stopPropagation();

						roomClient.kickPeer(peer.id);
					}}
				>
					<ExitIcon />
				</IconButton>
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
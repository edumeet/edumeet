import React from 'react';
import { connect } from 'react-redux';
import { makePeerConsumerSelector } from '../../Selectors';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../../appPropTypes';
import { withRoomContext } from '../../../RoomContext';
import { useIntl } from 'react-intl';
import IconButton from '@material-ui/core/IconButton';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import ScreenIcon from '@material-ui/icons/ScreenShare';
import ScreenOffIcon from '@material-ui/icons/StopScreenShare';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import HandIcon from '../../../images/icon-hand-white.svg';

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
		listPeer :
		{
			display : 'flex'
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
		indicators :
		{
			left           : 0,
			top            : 0,
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			alignItems     : 'center',
			transition     : 'opacity 0.3s'
		},
		icon :
		{
			flex               : '0 0 auto',
			margin             : '0.3rem',
			borderRadius       : 2,
			backgroundPosition : 'center',
			backgroundSize     : '75%',
			backgroundRepeat   : 'no-repeat',
			backgroundColor    : 'rgba(0, 0, 0, 0.5)',
			transitionProperty : 'opacity, background-color',
			transitionDuration : '0.15s',
			width              : 'var(--media-control-button-size)',
			height             : 'var(--media-control-button-size)',
			opacity            : 0.85,
			'&:hover'          :
			{
				opacity : 1
			},
			'&.on' :
			{
				opacity : 1
			},
			'&.off' :
			{
				opacity : 0.2
			},
			'&.raise-hand' :
			{
				backgroundImage : `url(${HandIcon})`
			}
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
			'&.unsupported' :
			{
				pointerEvents : 'none'
			},
			'&.disabled' :
			{
				pointerEvents   : 'none',
				backgroundColor : 'var(--media-control-botton-disabled)'
			},
			'&.on' :
			{
				backgroundColor : 'var(--media-control-botton-on)'
			},
			'&.off' :
			{
				backgroundColor : 'var(--media-control-botton-off)'
			}
		}
	});

const ListPeer = (props) =>
{
	const intl = useIntl();

	const {
		roomClient,
		peer,
		micConsumer,
		screenConsumer,
		children,
		classes
	} = props;

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
				{ peer.raiseHandState &&
					<div className={
						classnames(
							classes.icon, 'raise-hand', {
								on  : peer.raiseHandState,
								off : !peer.raiseHandState
							}
						)
					}
					/>
				}
			</div>
			{children}
			<div className={classes.controls}>
				{ screenConsumer &&
					<IconButton
						aria-label={intl.formatMessage({
							id             : 'tooltip.muteScreenSharing',
							defaultMessage : 'Mute participant share'
						})}
						color={ screenVisible ? 'primary' : 'secondary'}
						disabled={ peer.peerScreenInProgress }
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
						id             : 'tooltip.muteParticipant',
						defaultMessage : 'Mute participant'
					})}
					color={ micEnabled ? 'primary' : 'secondary'}
					disabled={ peer.peerAudioInProgress }
					onClick={(e) =>
						{
							e.stopPropagation();
							micEnabled ?
								roomClient.modifyPeerConsumer(peer.id, 'mic', true) :
								roomClient.modifyPeerConsumer(peer.id, 'mic', false);
						}}
				>
					{ micEnabled ?
						<MicIcon />
						:
						<MicOffIcon />
					}
				</IconButton>
			</div>
		</div>
	);
};

ListPeer.propTypes =
{
	roomClient     : PropTypes.any.isRequired,
	advancedMode   : PropTypes.bool,
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
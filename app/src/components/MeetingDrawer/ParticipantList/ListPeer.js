import React from 'react';
import { connect } from 'react-redux';
import { makePeerConsumerSelector } from '../../Selectors';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../../appPropTypes';
import { withRoomContext } from '../../../RoomContext';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import ScreenIcon from '@material-ui/icons/ScreenShare';
import ScreenOffIcon from '@material-ui/icons/StopScreenShare';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import HandIcon from '../../../images/icon-hand-white.svg';

const styles = () =>
	({
		root :
		{
			padding  : '0.5rem',
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
			paddingLeft : '0.5rem',
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
		volumeContainer :
		{
			float          : 'right',
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			width          : '1vmin',
			position       : 'relative',
			backgroundSize : '75%'
		},
		bar :
		{
			flex               : '0 0 auto',
			margin             : '0.3rem',
			backgroundSize     : '75%',
			backgroundRepeat   : 'no-repeat',
			backgroundColor    : 'rgba(0, 0, 0, 1)',
			cursor             : 'pointer',
			transitionProperty : 'opacity, background-color',
			width              : 3,
			borderRadius       : 6,
			transitionDuration : '0.25s',
			position           : 'absolute',
			bottom             : 0,
			'&.level0'         : { height: 0 },
			'&.level1'         : { height: '0.2vh' },
			'&.level2'         : { height: '0.4vh' },
			'&.level3'         : { height: '0.6vh' },
			'&.level4'         : { height: '0.8vh' },
			'&.level5'         : { height: '1.0vh' },
			'&.level6'         : { height: '1.2vh' },
			'&.level7'         : { height: '1.4vh' },
			'&.level8'         : { height: '1.6vh' },
			'&.level9'         : { height: '1.8vh' },
			'&.level10'        : { height: '2.0vh' }
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
	const {
		roomClient,
		peer,
		micConsumer,
		screenConsumer,
		volume,
		classes
	} = props;

	if (!peer)
		return;

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
				{ peer.raiseHandState ?
					<div className={
						classnames(
							classes.icon, 'raise-hand', {
								on  : peer.raiseHandState,
								off : !peer.raiseHandState
							}
						)
					}
					/>
					:null
				}
			</div>
			<div className={classes.volumeContainer}>
				<div className={classnames(classes.bar, `level${volume}`)} />
			</div>
			<div className={classes.controls}>
				{ screenConsumer ?
					<div
						className={classnames(classes.button, 'screen', {
							on       : screenVisible,
							off      : !screenVisible,
							disabled : peer.peerScreenInProgress
						})}
						onClick={(e) =>
						{
							e.stopPropagation();
							screenVisible ?
								roomClient.modifyPeerConsumer(peer.name, 'screen', true) :
								roomClient.modifyPeerConsumer(peer.name, 'screen', false);
						}}
					>
						{ screenVisible ?
							<ScreenIcon />
							:
							<ScreenOffIcon />
						}
					</div>
					:null
				}
				<div
					className={classnames(classes.button, 'mic', {
						on       : micEnabled,
						off      : !micEnabled,
						disabled : peer.peerAudioInProgress
					})}
					onClick={(e) =>
					{
						e.stopPropagation();
						micEnabled ?
							roomClient.modifyPeerConsumer(peer.name, 'mic', true) :
							roomClient.modifyPeerConsumer(peer.name, 'mic', false);
					}}
				>
					{ micEnabled ?
						<MicIcon />
						:
						<MicOffIcon />
					}
				</div>
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
	volume         : PropTypes.number,
	classes        : PropTypes.object.isRequired
};

const makeMapStateToProps = (initialState, props) =>
{
	const getPeerConsumers = makePeerConsumerSelector();

	const mapStateToProps = (state) =>
	{
		return {
			peer   : state.peers[props.name],
			...getPeerConsumers(state, props),
			volume : state.peerVolumes[props.name]
		};
	};

	return mapStateToProps;
};

export default withRoomContext(connect(
	makeMapStateToProps
)(withStyles(styles)(ListPeer)));
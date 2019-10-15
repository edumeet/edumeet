import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../../appPropTypes';
import { withRoomContext } from '../../../RoomContext';
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

const ListLobbyPeer = (props) =>
{
	const {
		// roomClient,
		peer,
		classes
	} = props;

	const picture = peer.picture || EmptyAvatar;

	return (
		<div className={classes.root}>
			<img alt='Peer avatar' className={classes.avatar} src={picture} />

			<div className={classes.peerInfo}>
				{peer.displayName}
			</div>
			<div className={classes.indicators}>
				{ /* peer.raiseHandState ?
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
				*/ }
			</div>
			<div className={classes.controls}>
				{/* { screenConsumer ?
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
								roomClient.modifyPeerConsumer(peer.id, 'screen', true) :
								roomClient.modifyPeerConsumer(peer.id, 'screen', false);
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
							roomClient.modifyPeerConsumer(peer.id, 'mic', true) :
							roomClient.modifyPeerConsumer(peer.id, 'mic', false);
					}}
				>
					{ micEnabled ?
						<MicIcon />
						:
						<MicOffIcon />
					}
				</div> */}
			</div>
		</div>
	);
};

ListLobbyPeer.propTypes =
{
	roomClient   : PropTypes.any.isRequired,
	advancedMode : PropTypes.bool,
	peer         : appPropTypes.Peer.isRequired,
	classes      : PropTypes.object.isRequired
};

const mapStateToProps = (state, { id }) =>
{
	return {
		peer : state.lobbyPeers[id]
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.lobbyPeers === next.lobbyPeers
			);
		}
	}
)(withStyles(styles)(ListLobbyPeer)));
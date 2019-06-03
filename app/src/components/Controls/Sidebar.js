import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { meProducersSelector } from '../Selectors';
import { withStyles } from '@material-ui/core/styles';
import { unstable_useMediaQuery as useMediaQuery } from '@material-ui/core/useMediaQuery';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import Fab from '@material-ui/core/Fab';
import Tooltip from '@material-ui/core/Tooltip';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import VideoIcon from '@material-ui/icons/Videocam';
import VideoOffIcon from '@material-ui/icons/VideocamOff';
import ScreenIcon from '@material-ui/icons/ScreenShare';
import ScreenOffIcon from '@material-ui/icons/StopScreenShare';
import ExtensionIcon from '@material-ui/icons/Extension';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import LeaveIcon from '@material-ui/icons/Cancel';

const styles = (theme) =>
	({
		root :
		{
			position                     : 'fixed',
			zIndex                       : 500,
			display                      : 'flex',
			[theme.breakpoints.up('md')] :
			{
				top            : '50%',
				transform      : 'translate(0%, -50%)',
				flexDirection  : 'column',
				justifyContent : 'center',
				alignItems     : 'center',
				left           : '1.0em',
				width          : '2.6em'
			},
			[theme.breakpoints.down('sm')] :
			{
				flexDirection : 'row',
				bottom        : '0.5em',
				left          : '50%',
				transform     : 'translate(-50%, -0%)'
			}
		},
		fab :
		{
			margin : theme.spacing.unit
		},
		show :
		{
			opacity    : 1,
			transition : 'opacity .5s'
		},
		hide :
		{
			opacity    : 0,
			transition : 'opacity .5s'
		}
	});

const Sidebar = (props) =>
{
	const {
		roomClient,
		toolbarsVisible,
		me,
		micProducer,
		webcamProducer,
		screenProducer,
		locked,
		classes,
		theme
	} = props;

	let micState;

	let micTip;

	if (!me.canSendMic || !micProducer)
	{
		micState = 'unsupported';
		micTip = 'Audio unsupported';
	}
	else if (!micProducer.locallyPaused && !micProducer.remotelyPaused)
	{
		micState = 'on';
		micTip = 'Mute audio';
	}
	else
	{
		micState = 'off';
		micTip = 'Unmute audio';
	}

	let webcamState;

	let webcamTip;

	if (!me.canSendWebcam)
	{
		webcamState = 'unsupported';
		webcamTip = 'Video unsupported';
	}
	else if (webcamProducer)
	{
		webcamState = 'on';
		webcamTip = 'Stop video';
	}
	else
	{
		webcamState = 'off';
		webcamTip = 'Start video';
	}

	let screenState;

	let screenTip;

	if (me.needExtension)
	{
		screenState = 'need-extension';
		screenTip = 'Install screen sharing extension';
	}
	else if (!me.canShareScreen)
	{
		screenState = 'unsupported';
		screenTip = 'Screen sharing not supported';
	}
	else if (screenProducer)
	{
		screenState = 'on';
		screenTip = 'Stop screen sharing';
	}
	else
	{
		screenState = 'off';
		screenTip = 'Start screen sharing';
	}

	const smallScreen = useMediaQuery(theme.breakpoints.down('sm'));

	return (
		<div
			className={
				classnames(classes.root, toolbarsVisible ? classes.show : classes.hide)
			}
		>
			<Tooltip title={micTip} placement={smallScreen ? 'top' : 'right'}>
				<Fab
					aria-label='Mute mic'
					className={classes.fab}
					disabled={!me.canSendMic || me.audioInProgress}
					color={micState === 'on' ? 'default' : 'secondary'}
					size={smallScreen ? 'large' : 'medium'}
					onClick={() =>
					{
						micState === 'on' ?
							roomClient.disableMic() :
							roomClient.enableMic();
					}}
				>
					{ micState === 'on' ?
						<MicIcon />
						:
						<MicOffIcon />
					}
				</Fab>
			</Tooltip>
			<Tooltip title={webcamTip} placement={smallScreen ? 'top' : 'right'}>
				<Fab
					aria-label='Mute video'
					className={classes.fab}
					disabled={!me.canSendWebcam || me.webcamInProgress}
					color={webcamState === 'on' ? 'default' : 'secondary'}
					size={smallScreen ? 'large' : 'medium'}
					onClick={() =>
					{
						webcamState === 'on' ?
							roomClient.disableWebcam() :
							roomClient.enableWebcam();
					}}
				>
					{ webcamState === 'on' ?
						<VideoIcon />
						:
						<VideoOffIcon />
					}
				</Fab>
			</Tooltip>
			<Tooltip title={screenTip} placement={smallScreen ? 'top' : 'right'}>
				<Fab
					aria-label='Share screen'
					className={classes.fab}
					disabled={!me.canShareScreen || me.screenShareInProgress}
					color={screenState === 'on' ? 'primary' : 'default'}
					size={smallScreen ? 'large' : 'medium'}
					onClick={() =>
					{
						switch (screenState)
						{
							case 'on':
							{
								roomClient.disableScreenSharing();
								break;
							}
							case 'off':
							{
								roomClient.enableScreenSharing();
								break;
							}
							case 'need-extension':
							{
								roomClient.installExtension();
								break;
							}
							default:
							{
								break;
							}
						}
					}}
				>
					{ screenState === 'on' || screenState === 'unsupported' ?
						<ScreenOffIcon/>
						:null
					}
					{ screenState === 'off' ?
						<ScreenIcon/>
						:null
					}
					{ screenState === 'need-extension' ?
						<ExtensionIcon/>
						:null
					}
				</Fab>
			</Tooltip>

			<Tooltip
				title={locked ? 'Unlock room' : 'Lock room'}
				placement={smallScreen ? 'top' : 'right'}
			>
				<Fab
					aria-label='Room lock'
					className={classes.fab}
					color={locked ? 'primary' : 'default'}
					size={smallScreen ? 'large' : 'medium'}
					onClick={() =>
					{
						if (locked)
						{
							roomClient.unlockRoom();
						}
						else
						{
							roomClient.lockRoom();
						}
					}}
				>
					{ locked ?
						<LockIcon />
						:
						<LockOpenIcon />
					}
				</Fab>
			</Tooltip>

			{ /* <Fab
				aria-label='Raise hand'
				className={classes.fab}
				disabled={me.raiseHandInProgress}
				color={me.raiseHand ? 'primary' : 'default'}
				size='large'
				onClick={() => roomClient.sendRaiseHandState(!me.raiseHand)}
			>
				<Avatar alt='Hand' src={me.raiseHand ? HandOn : HandOff} />
			</Fab>  */ }

			<Tooltip title='Leave meeting' placement={smallScreen ? 'top' : 'right'}>
				<Fab
					aria-label='Leave meeting'
					className={classes.fab}
					color='secondary'
					size={smallScreen ? 'large' : 'medium'}
					onClick={() => roomClient.close()}
				>
					<LeaveIcon />
				</Fab>
			</Tooltip>
		</div>
	);
};

Sidebar.propTypes =
{
	roomClient      : PropTypes.any.isRequired,
	toolbarsVisible : PropTypes.bool.isRequired,
	me              : appPropTypes.Me.isRequired,
	micProducer     : appPropTypes.Producer,
	webcamProducer  : appPropTypes.Producer,
	screenProducer  : appPropTypes.Producer,
	locked          : PropTypes.bool.isRequired,
	classes         : PropTypes.object.isRequired,
	theme           : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		toolbarsVisible : state.room.toolbarsVisible,
		...meProducersSelector(state),
		me              : state.me,
		locked          : state.room.locked
	});

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room.toolbarsVisible === next.room.toolbarsVisible &&
				prev.room.locked === next.room.locked &&
				prev.producers === next.producers &&
				prev.me === next.me
			);
		}
	}
)(withStyles(styles, { withTheme: true })(Sidebar)));

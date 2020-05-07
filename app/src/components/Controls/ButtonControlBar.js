import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { meProducersSelector } from '../Selectors';
import { withStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
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

const styles = (theme) =>
	({
		root :
		{
			position                     : 'fixed',
			display                      : 'flex',
			[theme.breakpoints.up('md')] :
			{
				top            : '50%',
				transform      : 'translate(0%, -50%)',
				flexDirection  : 'column',
				justifyContent : 'center',
				alignItems     : 'center',
				left           : theme.spacing(1)
			},
			[theme.breakpoints.down('sm')] :
			{
				flexDirection : 'row',
				bottom        : theme.spacing(1),
				left          : '50%',
				transform     : 'translate(-50%, -0%)'
			}
		},
		fab :
		{
			margin : theme.spacing(1)
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

const ButtonControlBar = (props) =>
{
	const {
		roomClient,
		toolbarsVisible,
		hiddenControls,
		me,
		micProducer,
		webcamProducer,
		screenProducer,
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

	if (!me.canShareScreen)
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
				classnames(
					classes.root,
					hiddenControls ?
						(toolbarsVisible ? classes.show : classes.hide) :
						classes.show)
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
							roomClient.muteMic() :
							roomClient.unmuteMic();
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
				</Fab>
			</Tooltip>
		</div>
	);
};

ButtonControlBar.propTypes =
{
	roomClient      : PropTypes.any.isRequired,
	toolbarsVisible : PropTypes.bool.isRequired,
	hiddenControls  : PropTypes.bool.isRequired,
	me              : appPropTypes.Me.isRequired,
	micProducer     : appPropTypes.Producer,
	webcamProducer  : appPropTypes.Producer,
	screenProducer  : appPropTypes.Producer,
	classes         : PropTypes.object.isRequired,
	theme           : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		toolbarsVisible : state.room.toolbarsVisible,
		hiddenControls  : state.settings.hiddenControls,
		...meProducersSelector(state),
		me              : state.me
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
				prev.settings.hiddenControls === next.settings.hiddenControls &&
				prev.producers === next.producers &&
				prev.me === next.me
			);
		}
	}
)(withStyles(styles, { withTheme: true })(ButtonControlBar)));
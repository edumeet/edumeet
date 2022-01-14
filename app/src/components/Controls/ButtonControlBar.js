import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	meProducersSelector,
	makePermissionSelector
} from '../Selectors';
import { permissions } from '../../permissions';
import { withStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { useIntl } from 'react-intl';
import Fab from '@material-ui/core/Fab';
import Tooltip from '@material-ui/core/Tooltip';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import VideoIcon from '@material-ui/icons/Videocam';
import VideoOffIcon from '@material-ui/icons/VideocamOff';
import SettingsVoiceIcon from '@material-ui/icons/SettingsVoice';
import ScreenIcon from '@material-ui/icons/ScreenShare';

const styles = (theme) =>
	({
		root :
		{
			position                     : 'fixed',
			display                      : 'flex',
			zIndex                       : 30,
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
		},
		move :
		{
			left                           : '30vw',
			top                            : '50%',
			transform                      : 'translate(0%, -50%)',
			flexDirection                  : 'column',
			justifyContent                 : 'center',
			alignItems                     : 'center',
			[theme.breakpoints.down('lg')] :
			{
				left : '30vw'
			},
			[theme.breakpoints.down('md')] :
			{
				left : '40vw'
			},
			[theme.breakpoints.down('sm')] :
			{
				left : '60vw'
			},
			[theme.breakpoints.down('xs')] :
			{
				left : '80vw'
			}
		}
	});

const ButtonControlBar = (props) =>
{
	const intl = useIntl();

	const {
		roomClient,
		toolbarsVisible,
		settings,
		toolAreaOpen,
		me,
		micProducer,
		webcamProducer,
		screenProducer,
		hasAudioPermission,
		hasVideoPermission,
		hasScreenPermission,
		noiseVolume,
		classes,
		theme
	} = props;

	let micState;

	let micTip;

	if (!me.canSendMic || !hasAudioPermission)
	{
		micState = 'unsupported';
		micTip = intl.formatMessage({
			id             : 'device.audioUnsupported',
			defaultMessage : 'Audio unsupported'
		});
	}
	else if (!micProducer)
	{
		micState = 'off';
		micTip = intl.formatMessage({
			id             : 'device.activateAudio',
			defaultMessage : 'Activate audio'
		});
	}
	else if (!micProducer.locallyPaused &&
		!micProducer.remotelyPaused &&
		!settings.audioMuted)
	{
		micState = 'on';
		micTip = intl.formatMessage({
			id             : 'device.muteAudio',
			defaultMessage : 'Mute audio'
		});
	}
	else
	{
		micState = 'muted';
		micTip = intl.formatMessage({
			id             : 'device.unMuteAudio',
			defaultMessage : 'Unmute audio'
		});
	}

	let webcamState;

	let webcamTip;

	if (!me.canSendWebcam)
	{
		webcamState = 'unsupported';
		webcamTip = intl.formatMessage({
			id             : 'device.videoUnsupported',
			defaultMessage : 'Video unsupported'
		});
	}
	else if (webcamProducer)
	{
		webcamState = 'on';
		webcamTip = intl.formatMessage({
			id             : 'device.stopVideo',
			defaultMessage : 'Stop video'
		});
	}
	else
	{
		webcamState = 'off';
		webcamTip = intl.formatMessage({
			id             : 'device.startVideo',
			defaultMessage : 'Start video'
		});
	}

	let screenState;

	let screenTip;

	if (!me.canShareScreen)
	{
		screenState = 'unsupported';
		screenTip = intl.formatMessage({
			id             : 'device.screenSharingUnsupported',
			defaultMessage : 'Screen sharing not supported'
		});
	}
	else if (screenProducer)
	{
		screenState = 'on';
		screenTip = intl.formatMessage({
			id             : 'device.stopScreenSharing',
			defaultMessage : 'Stop screen sharing'
		});
	}
	else
	{
		screenState = 'off';
		screenTip = intl.formatMessage({
			id             : 'device.startScreenSharing',
			defaultMessage : 'Start screen sharing'
		});
	}

	const smallScreen = useMediaQuery(theme.breakpoints.down('sm'));

	return (
		<div
			className={
				classnames(
					classes.root,
					settings.hiddenControls ?
						(toolbarsVisible ? classes.show : classes.hide) :
						classes.show,
					toolAreaOpen &&
						(me.browser.platform !== 'mobile' && !settings.drawerOverlayed) ?
						classes.move : null
				)
			}
		>
			<Tooltip title={micTip} placement={smallScreen ? 'top' : 'right'}>
				<Fab
					aria-label={intl.formatMessage({
						id             : 'device.muteAudio',
						defaultMessage : 'Mute audio'
					})}
					className={classes.fab}
					disabled={
						!me.canSendMic ||
						!hasAudioPermission ||
						me.audioInProgress
					}
					color={micState === 'on' ?
						settings.voiceActivatedUnmute ?
							me.isAutoMuted ? 'secondary' : 'primary'
							: 'default'
						: 'secondary'
					}
					size={smallScreen ? 'large' : 'medium'}
					onClick={() =>
					{
						if (micState === 'off')
							roomClient.updateMic({ start: true });
						else if (micState === 'on')
							roomClient.muteMic();
						else
							roomClient.unmuteMic();
					}}
				>
					{ settings.voiceActivatedUnmute ?
						micState === 'on' ?
							<React.Fragment>
								<svg className='MuiSvgIcon-root' focusable='false' aria-hidden='true'style={{ 'position': 'absolute' }}>
									<defs>
										<clipPath id='cut-off-indicator'>
											<rect x='0' y='0' width='24' height={24-2.4*noiseVolume}/>
										</clipPath>
									</defs>
								</svg>
								<SettingsVoiceIcon style={{ 'position': 'absolute' }}
									color={'default'}
								/>
								<SettingsVoiceIcon
									clipPath='url(#cut-off-indicator)'
									style={{
										'position' : 'absolute',
										'opacity'  : '0.6'
									}}
									color={me.isAutoMuted ?
										'primary' : 'default'}
								/>
							</React.Fragment>
							: <MicOffIcon />
						: micState === 'on' ?
							<MicIcon />
							:
							<MicOffIcon />
					}
				</Fab>
			</Tooltip>
			<Tooltip title={webcamTip} placement={smallScreen ? 'top' : 'right'}>
				<Fab
					aria-label={intl.formatMessage({
						id             : 'device.startVideo',
						defaultMessage : 'Start video'
					})}
					className={classes.fab}
					disabled={
						!me.canSendWebcam ||
						!hasVideoPermission ||
						me.webcamInProgress
					}
					color={webcamState === 'on' ? 'defaut' : 'secondary'}
					size={smallScreen ? 'large' : 'medium'}
					onClick={() =>
					{
						webcamState === 'on' ?
							roomClient.disableWebcam() :
							roomClient.updateWebcam({ start: true });
					}}
				>
					{ webcamState === 'on' ?
						<VideoIcon />
						:
						<VideoOffIcon />
					}
				</Fab>
			</Tooltip>
			{ me.browser.platform !== 'mobile' &&
				<Tooltip title={screenTip} placement={smallScreen ? 'top' : 'right'}>
					<Fab
						aria-label={intl.formatMessage({
							id             : 'device.startScreenSharing',
							defaultMessage : 'Start screen sharing'
						})}
						className={classes.fab}
						disabled={
							!hasScreenPermission ||
							!me.canShareScreen ||
							me.screenShareInProgress
						}
						color={screenState === 'on' ? 'default' : 'secondary'}
						size={smallScreen ? 'large' : 'medium'}
						onClick={() =>
						{
							if (screenState === 'off')
								roomClient.updateScreenSharing({ start: true });
							else if (screenState === 'on')
								roomClient.disableScreenSharing();
						}}
					>
						<ScreenIcon/>
					</Fab>
				</Tooltip>
			}
		</div>
	);
};

ButtonControlBar.propTypes =
{
	roomClient          : PropTypes.any.isRequired,
	toolbarsVisible     : PropTypes.bool.isRequired,
	settings            : PropTypes.object.isRequired,
	toolAreaOpen        : PropTypes.bool.isRequired,
	me                  : appPropTypes.Me.isRequired,
	micProducer         : appPropTypes.Producer,
	webcamProducer      : appPropTypes.Producer,
	screenProducer      : appPropTypes.Producer,
	hasAudioPermission  : PropTypes.bool.isRequired,
	hasVideoPermission  : PropTypes.bool.isRequired,
	hasScreenPermission : PropTypes.bool.isRequired,
	noiseVolume         : PropTypes.number,
	classes             : PropTypes.object.isRequired,
	theme               : PropTypes.object.isRequired
};

const makeMapStateToProps = () =>
{
	const canShareAudio =
		makePermissionSelector(permissions.SHARE_AUDIO);
	const canShareVideo =
		makePermissionSelector(permissions.SHARE_VIDEO);
	const canShareScreen =
		makePermissionSelector(permissions.SHARE_SCREEN);

	const mapStateToProps = (state) =>
	{
		let noise;

		// noise = volume under threshold
		if (state.peerVolumes[state.me.id] < state.settings.noiseThreshold)
		{
			// noise mapped to range 0 ... 10
			noise = Math.round((100 + state.peerVolumes[state.me.id]) /
				(100 + state.settings.noiseThreshold)*10);
		}
		// noiseVolume over threshold: no noise but voice
		else { noise = 10; }

		return {
			toolbarsVisible     : state.room.toolbarsVisible,
			settings            : state.settings,
			noiseVolume         : noise,
			hasAudioPermission  : canShareAudio(state),
			hasVideoPermission  : canShareVideo(state),
			hasScreenPermission : canShareScreen(state),
			toolAreaOpen        : state.toolarea.toolAreaOpen,
			...meProducersSelector(state),
			me                  : state.me
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
				Math.round(prev.peerVolumes[prev.me.id]) ===
				Math.round(next.peerVolumes[prev.me.id]) &&
				prev.room.toolbarsVisible === next.room.toolbarsVisible &&
				prev.settings === next.settings &&
				prev.toolarea.toolAreaOpen === next.toolarea.toolAreaOpen &&
				prev.producers === next.producers &&
				prev.me === next.me
			);
		}
	}
)(withStyles(styles, { withTheme: true })(ButtonControlBar)));
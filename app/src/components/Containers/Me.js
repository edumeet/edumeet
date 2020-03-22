import React, { useState } from 'react';
import { connect } from 'react-redux';
import { meProducersSelector } from '../Selectors';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { useIntl, FormattedMessage } from 'react-intl';
import VideoView from '../VideoContainers/VideoView';
import Volume from './Volume';
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
			flex               : '0 0 auto',
			boxShadow          : 'var(--peer-shadow)',
			border             : 'var(--peer-border)',
			backgroundColor    : 'var(--peer-bg-color)',
			backgroundImage    : 'var(--peer-empty-avatar)',
			backgroundPosition : 'bottom',
			backgroundSize     : 'auto 85%',
			backgroundRepeat   : 'no-repeat',
			'&.hover'          :
			{
				boxShadow : '0px 1px 3px rgba(0, 0, 0, 0.05) inset, 0px 0px 8px rgba(82, 168, 236, 0.9)'
			},
			'&.active-speaker' :
			{
				// transition  : 'filter .2s',
				// filter      : 'grayscale(0)',
				borderColor : 'var(--active-speaker-border-color)'
			},
			'&:not(.active-speaker):not(.screen)' :
			{
				// transition : 'filter 10s',
				// filter     : 'grayscale(0.75)'
			},
			'&.webcam' :
			{
				order : 1
			},
			'&.screen' :
			{
				order : 2
			}
		},
		fab :
		{
			margin        : theme.spacing(1),
			pointerEvents : 'auto'
		},
		viewContainer :
		{
			position : 'relative',
			width    : '100%',
			height   : '100%'
		},
		controls :
		{
			position        : 'absolute',
			width           : '100%',
			height          : '100%',
			backgroundColor : 'rgba(0, 0, 0, 0.3)',
			display         : 'flex',
			flexDirection   : 'column',
			justifyContent  : 'center',
			alignItems      : 'flex-end',
			padding         : theme.spacing(1),
			zIndex          : 21,
			opacity         : 0,
			transition      : 'opacity 0.3s',
			touchAction     : 'none',
			pointerEvents   : 'none',
			'&.hover'       :
			{
				opacity : 1
			},
			'& p' :
			{
				position  : 'absolute',
				float     : 'left',
				top       : '50%',
				left      : '50%',
				transform : 'translate(-50%, -50%)',
				color     : 'rgba(255, 255, 255, 0.5)',
				fontSize  : '7em',
				margin    : 0
			}
		}
	});

const Me = (props) =>
{
	const [ hover, setHover ] = useState(false);

	const intl = useIntl();

	let touchTimeout = null;

	const {
		roomClient,
		me,
		settings,
		activeSpeaker,
		spacing,
		style,
		smallButtons,
		advancedMode,
		micProducer,
		webcamProducer,
		screenProducer,
		classes,
		theme
	} = props;

	const videoVisible = (
		Boolean(webcamProducer) &&
		!webcamProducer.locallyPaused &&
		!webcamProducer.remotelyPaused
	);

	const screenVisible = (
		Boolean(screenProducer) &&
		!screenProducer.locallyPaused &&
		!screenProducer.remotelyPaused
	);

	let micState;

	let micTip;

	if (!me.canSendMic)
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
	else if (!micProducer.locallyPaused && !micProducer.remotelyPaused)
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

	const spacingStyle =
	{
		'margin' : spacing
	};

	const smallScreen = useMediaQuery(theme.breakpoints.down('sm'));

	return (
		<React.Fragment>
			<div
				className={
					classnames(
						classes.root,
						'webcam',
						hover ? 'hover' : null,
						activeSpeaker ? 'active-speaker' : null
					)
				}
				onMouseOver={() => setHover(true)}
				onMouseOut={() => setHover(false)}
				onTouchStart={() =>
				{
					if (touchTimeout)
						clearTimeout(touchTimeout);

					setHover(true);
				}}
				onTouchEnd={() =>
				{
					if (touchTimeout)
						clearTimeout(touchTimeout);

					touchTimeout = setTimeout(() =>
					{
						setHover(false);
					}, 2000);
				}}
				style={spacingStyle}
			>
				<div className={classnames(classes.viewContainer)} style={style}>
					<div
						className={classnames(classes.controls, hover ? 'hover' : null)}
						onMouseOver={() => setHover(true)}
						onMouseOut={() => setHover(false)}
						onTouchStart={() =>
						{
							if (touchTimeout)
								clearTimeout(touchTimeout);

							setHover(true);
						}}
						onTouchEnd={() =>
						{
							if (touchTimeout)
								clearTimeout(touchTimeout);

							touchTimeout = setTimeout(() =>
							{
								setHover(false);
							}, 2000);
						}}
					>
						<p>
							<FormattedMessage
								id='room.me'
								defaultMessage='ME'
							/>
						</p>
						<Tooltip title={micTip} placement={smallScreen ? 'top' : 'left'}>
							<div>
								<Fab
									aria-label={intl.formatMessage({
										id             : 'device.muteAudio',
										defaultMessage : 'Mute audio'
									})}
									className={classes.fab}
									disabled={!me.canSendMic || me.audioInProgress}
									color={micState === 'on' ? 'default' : 'secondary'}
									size={smallButtons ? 'small' : 'large'}
									onClick={() =>
									{
										if (micState === 'off')
											roomClient.enableMic();
										else if (micState === 'on')
											roomClient.muteMic();
										else
											roomClient.unmuteMic();
									}}
								>
									{ micState === 'on' ?
										<MicIcon />
										:
										<MicOffIcon />
									}
								</Fab>
							</div>
						</Tooltip>
						<Tooltip title={webcamTip} placement={smallScreen ? 'top' : 'left'}>
							<div>
								<Fab
									aria-label={intl.formatMessage({
										id             : 'device.startVideo',
										defaultMessage : 'Start video'
									})}
									className={classes.fab}
									disabled={!me.canSendWebcam || me.webcamInProgress}
									color={webcamState === 'on' ? 'default' : 'secondary'}
									size={smallButtons ? 'small' : 'large'}
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
							</div>
						</Tooltip>
						<Tooltip title={screenTip} placement={smallScreen ? 'top' : 'left'}>
							<div>
								<Fab
									aria-label={intl.formatMessage({
										id             : 'device.startScreenSharing',
										defaultMessage : 'Start screen sharing'
									})}
									className={classes.fab}
									disabled={!me.canShareScreen || me.screenShareInProgress}
									color={screenState === 'on' ? 'primary' : 'default'}
									size={smallButtons ? 'small' : 'large'}
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
									{ (screenState === 'on' || screenState === 'unsupported') &&
										<ScreenOffIcon/>
									}
									{ screenState === 'off' &&
										<ScreenIcon/>
									}
								</Fab>
							</div>
						</Tooltip>
					</div>

					<VideoView
						isMe
						advancedMode={advancedMode}
						peer={me}
						displayName={settings.displayName}
						showPeerInfo
						videoTrack={webcamProducer && webcamProducer.track}
						videoVisible={videoVisible}
						audioCodec={micProducer && micProducer.codec}
						videoCodec={webcamProducer && webcamProducer.codec}
						onChangeDisplayName={(displayName) =>
						{
							roomClient.changeDisplayName(displayName);
						}}
					>
						<Volume id={me.id} />
					</VideoView>
				</div>
			</div>
			{ screenProducer &&
				<div
					className={classnames(classes.root, 'screen', hover && 'hover')}
					onMouseOver={() => setHover(true)}
					onMouseOut={() => setHover(false)}
					onTouchStart={() =>
					{
						if (touchTimeout)
							clearTimeout(touchTimeout);

						setHover(true);
					}}
					onTouchEnd={() =>
					{
						if (touchTimeout)
							clearTimeout(touchTimeout);

						touchTimeout = setTimeout(() =>
						{
							setHover(false);
						}, 2000);
					}}
					style={spacingStyle}
				>
					<div className={classnames(classes.viewContainer)} style={style}>
						<div
							className={classnames(classes.controls, hover && 'hover')}
							onMouseOver={() => setHover(true)}
							onMouseOut={() => setHover(false)}
							onTouchStart={() =>
							{
								if (touchTimeout)
									clearTimeout(touchTimeout);
			
								setHover(true);
							}}
							onTouchEnd={() =>
							{

								if (touchTimeout)
									clearTimeout(touchTimeout);
			
								touchTimeout = setTimeout(() =>
								{
									setHover(false);
								}, 2000);
							}}
						>
							<p>
								<FormattedMessage
									id='room.me'
									defaultMessage='ME'
								/>
							</p>
						</div>
						
						<VideoView
							isMe
							isScreen
							advancedMode={advancedMode}
							videoContain
							videoTrack={screenProducer && screenProducer.track}
							videoVisible={screenVisible}
							videoCodec={screenProducer && screenProducer.codec}
						/>
					</div>
				</div>
			}
		</React.Fragment>
	);
};

Me.propTypes =
{
	roomClient     : PropTypes.any.isRequired,
	advancedMode   : PropTypes.bool,
	me             : appPropTypes.Me.isRequired,
	settings       : PropTypes.object,
	activeSpeaker  : PropTypes.bool,
	micProducer    : appPropTypes.Producer,
	webcamProducer : appPropTypes.Producer,
	screenProducer : appPropTypes.Producer,
	spacing        : PropTypes.number,
	style          : PropTypes.object,
	smallButtons   : PropTypes.bool,
	classes        : PropTypes.object.isRequired,
	theme          : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		me            : state.me,
		...meProducersSelector(state),
		settings      : state.settings,
		activeSpeaker : state.me.id === state.room.activeSpeakerId
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
				prev.me === next.me &&
				prev.producers === next.producers &&
				prev.settings === next.settings &&
				prev.room.activeSpeakerId === next.room.activeSpeakerId
			);
		}
	}
)(withStyles(styles, { withTheme: true })(Me)));

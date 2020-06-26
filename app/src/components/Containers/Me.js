import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import {
	meProducersSelector,
	makePermissionSelector
} from '../Selectors';
import { permissions } from '../../permissions';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { useIntl, FormattedMessage } from 'react-intl';
import VideoView from '../VideoContainers/VideoView';
import Volume from './Volume';
import Fab from '@material-ui/core/Fab';
import IconButton from '@material-ui/core/IconButton';
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
		smallContainer :
		{
			backgroundColor : 'rgba(255, 255, 255, 0.9)',
			margin          : '0.5vmin',
			padding         : '0.5vmin',
			boxShadow       : '0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12)',
			pointerEvents   : 'auto',
			transition      : 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
			'&:hover'       :
			{
				backgroundColor : 'rgba(213, 213, 213, 1)'
			}
		},
		viewContainer :
		{
			position : 'relative',
			width    : '100%',
			height   : '100%'
		},
		meTag :
		{
			position   : 'absolute',
			float      : 'left',
			top        : '50%',
			left       : '50%',
			transform  : 'translate(-50%, -50%)',
			color      : 'rgba(255, 255, 255, 0.5)',
			fontSize   : '7em',
			zIndex     : 30,
			margin     : 0,
			opacity    : 0,
			transition : 'opacity 0.1s ease-in-out',
			'&.hover'  :
			{
				opacity : 1
			},
			'&.smallContainer' :
			{
				fontSize : '3em'
			}
		},
		controls :
		{
			position       : 'absolute',
			width          : '100%',
			height         : '100%',
			display        : 'flex',
			flexDirection  : 'column',
			justifyContent : 'center',
			alignItems     : 'flex-end',
			padding        : theme.spacing(1),
			zIndex         : 21,
			touchAction    : 'none',
			pointerEvents  : 'none',
			'&.hide'       :
			{
				transition : 'opacity 0.1s ease-in-out',
				opacity    : 0
			},
			'&.hover' :
			{
				opacity : 1
			}
		},
		ptt :
		{
			position        : 'absolute',
			float           : 'left',
			top             : '25%',
			left            : '50%',
			transform       : 'translate(-50%, 0%)',
			color           : 'rgba(255, 255, 255, 0.7)',
			fontSize        : '1.3em',
			backgroundColor : 'rgba(245, 0, 87, 0.70)',
			margin          : '4px',
			padding         : theme.spacing(2),
			zIndex          : 1200,
			borderRadius    : '20px',
			textAlign       : 'center',
			opacity         : 0,
			transition      : 'opacity 1s ease',
			pointerEvents   : 'none',
			'&.enabled'     :
			{
				transition : 'opacity 0.1s',
				opacity    : 1
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
		smallContainer,
		advancedMode,
		micProducer,
		webcamProducer,
		screenProducer,
		extraVideoProducers,
		canShareScreen,
		transports,
		noiseVolume,
		classes
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
	const [
		screenShareTooltipOpen,
		screenShareTooltipSetOpen
	] = React.useState(false);

	const screenShareTooltipHandleClose = () =>
	{
		screenShareTooltipSetOpen(false);
	};

	const screenShareTooltipHandleOpen = () =>
	{
		screenShareTooltipSetOpen(true);
	};

	if (screenState === 'off' && me.screenShareInProgress && screenShareTooltipOpen)
	{
		screenShareTooltipHandleClose();
	}

	const spacingStyle =
	{
		'margin' : spacing
	};

	let audioScore = null;

	if (micProducer && micProducer.score)
	{
		audioScore =
			micProducer.score.reduce(
				(prev, curr) =>
					(prev.score < curr.score ? prev : curr)
			);
	}

	let videoScore = null;

	if (webcamProducer && webcamProducer.score)
	{
		videoScore =
			webcamProducer.score.reduce(
				(prev, curr) =>
					(prev.score < curr.score ? prev : curr)
			);
	}

	useEffect(() =>
	{
		let poll;

		const interval = 1000;

		if (advancedMode)
		{
			poll = setInterval(() => roomClient.getTransportStats(), interval);
		}

		return () => clearInterval(poll);
	}, [ roomClient, advancedMode ]);

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

				{ me.browser.platform !== 'mobile' && smallContainer &&
				<div className={classnames(
					classes.ptt,
					(micState === 'muted' && me.isSpeaking) ? 'enabled' : null
				)}
				>
					<FormattedMessage
						id='me.mutedPTT'
						defaultMessage='You are muted, hold down SPACE-BAR to talk'
					/>
				</div>
				}
				<div className={classes.viewContainer} style={style}>
					{ me.browser.platform !== 'mobile' && !smallContainer &&
						<div className={classnames(
							classes.ptt,
							(micState === 'muted' && me.isSpeaking) ? 'enabled' : null
						)}
						>
							<FormattedMessage
								id='me.mutedPTT'
								defaultMessage='You are muted, hold down SPACE-BAR to talk'
							/>
						</div>
					}
					<p className={
						classnames(
							classes.meTag,
							hover ? 'hover' : null,
							smallContainer ? 'smallContainer' : null
						)}
					>
						<FormattedMessage
							id='room.me'
							defaultMessage='ME'
						/>
					</p>
					{ !settings.buttonControlBar &&
						<div
							className={classnames(
								classes.controls,
								settings.hiddenControls ? 'hide' : null,
								hover ? 'hover' : null
							)}
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
							<React.Fragment>
								<Tooltip title={micTip} placement='left'>
									{ smallContainer ?
										<div>
											<IconButton
												aria-label={intl.formatMessage({
													id             : 'device.muteAudio',
													defaultMessage : 'Mute audio'
												})}
												className={classes.smallContainer}
												disabled={!me.canSendMic || me.audioInProgress}
												color={
													micState === 'on' ?
														settings.voiceActivatedUnmute && !me.isAutoMuted ?
															'primary'
															: 'default'
														: 'secondary'}
												size='small'
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
												{ micState === 'on' ?
													<MicIcon
														color={me.isAutoMuted ? 'secondary' : 'primary'}
														style={{ opacity: noiseVolume }}
													/>
													:
													<MicOffIcon />
												}
											</IconButton>
										</div>
										:
										<div>
											<Fab
												aria-label={intl.formatMessage({
													id             : 'device.muteAudio',
													defaultMessage : 'Mute audio'
												})}
												className={classes.fab}
												disabled={!me.canSendMic || me.audioInProgress}
												color={micState === 'on' ?
													settings.voiceActivatedUnmute && !me.isAutoMuted? 'primary'
														: 'default'
													: 'secondary'}
												size='large'
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
												{ micState === 'on' ?
													<MicIcon
														color={me.isAutoMuted && settings.voiceActivatedUnmute ?
															'secondary' : 'primary'}
														style={me.isAutoMuted && settings.voiceActivatedUnmute ?
															{ opacity: noiseVolume }
															: { opacity: 1 }}
													/>
													:
													<MicOffIcon />
												}
											</Fab>
										</div>
									}
								</Tooltip>
								<Tooltip title={webcamTip} placement='left'>
									{ smallContainer ?
										<div>
											<IconButton
												aria-label={intl.formatMessage({
													id             : 'device.startVideo',
													defaultMessage : 'Start video'
												})}
												className={classes.smallContainer}
												disabled={!me.canSendWebcam || me.webcamInProgress}
												color={webcamState === 'on' ? 'primary' : 'secondary'}
												size='small'
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
											</IconButton>
										</div>
										:
										<div>
											<Fab
												aria-label={intl.formatMessage({
													id             : 'device.startVideo',
													defaultMessage : 'Start video'
												})}
												className={classes.fab}
												disabled={!me.canSendWebcam || me.webcamInProgress}
												color={webcamState === 'on' ? 'default' : 'secondary'}
												size='large'
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
										</div>
									}
								</Tooltip>
								{ me.browser.platform !== 'mobile' &&
									<Tooltip open={screenShareTooltipOpen}
										onClose={screenShareTooltipHandleClose}
										onOpen={screenShareTooltipHandleOpen}
										title={screenTip} placement='left'
									>
										{ smallContainer ?
											<div>
												<IconButton
													aria-label={intl.formatMessage({
														id             : 'device.startScreenSharing',
														defaultMessage : 'Start screen sharing'
													})}
													className={classes.smallContainer}
													disabled={
														!canShareScreen ||
													!me.canShareScreen ||
													me.screenShareInProgress
													}
													color='primary'
													size='small'
													onClick={() =>
													{
														if (screenState === 'off')
															roomClient.updateScreenSharing({ start: true });
														else if (screenState === 'on')
															roomClient.disableScreenSharing();
													}}
												>
													{ (screenState === 'on' || screenState === 'unsupported') &&
													<ScreenOffIcon/>
													}
													{ screenState === 'off' &&
													<ScreenIcon/>
													}

												</IconButton>
											</div>
											:
											<div>
												<Fab
													aria-label={intl.formatMessage({
														id             : 'device.startScreenSharing',
														defaultMessage : 'Start screen sharing'
													})}
													className={classes.fab}
													disabled={
														!canShareScreen ||
													!me.canShareScreen ||
													me.screenShareInProgress
													}
													color={screenState === 'on' ? 'primary' : 'default'}
													size='large'
													onClick={() =>
													{
														if (screenState === 'off')
															roomClient.updateScreenSharing({ start: true });
														else if (screenState === 'on')
															roomClient.disableScreenSharing();
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
										}
									</Tooltip>
								}
							</React.Fragment>
						</div>
					}

					<VideoView
						isMe
						VideoView
						advancedMode={advancedMode}
						peer={me}
						displayName={settings.displayName}
						showPeerInfo
						videoTrack={webcamProducer && webcamProducer.track}
						videoVisible={videoVisible}
						audioCodec={micProducer && micProducer.codec}
						videoCodec={webcamProducer && webcamProducer.codec}
						netInfo={transports && transports}
						audioScore={audioScore}
						videoScore={videoScore}
						showQuality
						onChangeDisplayName={(displayName) =>
						{
							roomClient.changeDisplayName(displayName);
						}}
					>
						{ micState === 'muted' ? null : <Volume id={me.id} /> }
					</VideoView>
				</div>
			</div>
			{ extraVideoProducers.map((producer) =>
			{
				return (
					<div key={producer.id}
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
						<div className={classes.viewContainer} style={style}>
							<p className={
								classnames(
									classes.meTag,
									hover ? 'hover' : null,
									smallContainer ? 'smallContainer' : null
								)}
							>
								<FormattedMessage
									id='room.me'
									defaultMessage='ME'
								/>
							</p>
							<div
								className={classnames(
									classes.controls,
									settings.hiddenControls ? 'hide' : null,
									hover ? 'hover' : null
								)}
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
								<Tooltip title={webcamTip} placement='left'>
									{ smallContainer ?
										<div>
											<IconButton
												aria-label={intl.formatMessage({
													id             : 'device.stopVideo',
													defaultMessage : 'Stop video'
												})}
												className={classes.smallContainer}
												disabled={!me.canSendWebcam || me.webcamInProgress}
												size='small'
												color='primary'
												onClick={() =>
												{
													roomClient.disableExtraVideo(producer.id);
												}}
											>
												<VideoIcon />

											</IconButton>
										</div>
										:
										<div>
											<Fab
												aria-label={intl.formatMessage({
													id             : 'device.stopVideo',
													defaultMessage : 'Stop video'
												})}
												className={classes.fab}
												disabled={!me.canSendWebcam || me.webcamInProgress}
												size={smallContainer ? 'small' : 'large'}
												onClick={() =>
												{
													roomClient.disableExtraVideo(producer.id);
												}}
											>
												<VideoIcon />
											</Fab>
										</div>
									}
								</Tooltip>
							</div>

							<VideoView
								isMe
								isExtraVideo
								advancedMode={advancedMode}
								peer={me}
								displayName={settings.displayName}
								showPeerInfo
								videoTrack={producer && producer.track}
								videoVisible={videoVisible}
								videoCodec={producer && producer.codec}
								onChangeDisplayName={(displayName) =>
								{
									roomClient.changeDisplayName(displayName);
								}}
							/>
						</div>
					</div>
				);
			})}
			{ screenProducer &&
				<div
					className={classnames(classes.root, 'screen', hover ? 'hover' : null)}
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
					<div className={classes.viewContainer} style={style}>
						<p className={
							classnames(
								classes.meTag,
								hover ? 'hover' : null,
								smallContainer ? 'smallContainer' : null
							)}
						>
							<FormattedMessage
								id='room.me'
								defaultMessage='ME'
							/>
						</p>

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
	roomClient          : PropTypes.any.isRequired,
	advancedMode        : PropTypes.bool,
	me                  : appPropTypes.Me.isRequired,
	settings            : PropTypes.object,
	activeSpeaker       : PropTypes.bool,
	micProducer         : appPropTypes.Producer,
	webcamProducer      : appPropTypes.Producer,
	screenProducer      : appPropTypes.Producer,
	extraVideoProducers : PropTypes.arrayOf(appPropTypes.Producer),
	spacing             : PropTypes.number,
	style               : PropTypes.object,
	smallContainer      : PropTypes.bool,
	canShareScreen      : PropTypes.bool.isRequired,
	noiseVolume         : PropTypes.number,
	classes             : PropTypes.object.isRequired,
	theme               : PropTypes.object.isRequired,
	transports          : PropTypes.object.isRequired
};

const makeMapStateToProps = () =>
{
	const hasPermission = makePermissionSelector(permissions.SHARE_SCREEN);

	const mapStateToProps = (state) =>
	{
		let volume;

		// noiseVolume under threshold
		if (state.peerVolumes[state.me.id] < state.settings.noiseThreshold)
		{
			// noiseVolume mapped to range 0.5 ... 1 (threshold switch)
			volume = 1 + ((Math.abs(state.peerVolumes[state.me.id] -
				state.settings.noiseThreshold) / (-120 -
				state.settings.noiseThreshold)));
		}
		// noiseVolume over threshold: no noise but voice
		else { volume = 0; }

		return {
			me             : state.me,
			...meProducersSelector(state),
			settings       : state.settings,
			activeSpeaker  : state.me.id === state.room.activeSpeakerId,
			canShareScreen : hasPermission(state),
			transports     : state.transports,
			noiseVolume    : volume
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
				prev.room === next.room &&
				prev.me === next.me &&
				Math.round(prev.peerVolumes[prev.me.id]) ===
					Math.round(next.peerVolumes[next.me.id]) &&
				prev.peers === next.peers &&
				prev.producers === next.producers &&
				prev.settings === next.settings &&
				prev.transports === next.transports
			);
		}
	}
)(withStyles(styles, { withTheme: true })(Me)));

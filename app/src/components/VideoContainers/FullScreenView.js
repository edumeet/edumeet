import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { permissions } from '../../permissions';
import { withStyles } from '@material-ui/core/styles';
import * as appPropTypes from '../appPropTypes';
import * as roomActions from '../../actions/roomActions';
import FullScreenExitIcon from '@material-ui/icons/FullscreenExit';
import VideoView from './VideoView';
import { useIntl } from 'react-intl';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import Tooltip from '@material-ui/core/Tooltip';
import Fab from '@material-ui/core/Fab';
import {
	meProducersSelector,
	makePermissionSelector
} from '../Selectors';
import IconButton from '@material-ui/core/IconButton';

const styles = (theme) =>
	({
		root :
		{
			position : 'absolute',
			top      : 0,
			left     : 0,
			height   : '100%',
			width    : '100%',
			zIndex   : 20000
		},
		controls :
		{
			position       : 'absolute',
			zIndex         : 20020,
			right          : 0,
			top            : 0,
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			alignItems     : 'center',
			padding        : theme.spacing(1)
		},
		button :
		{
			flex               : '0 0 auto',
			margin             : '0.2vmin',
			borderRadius       : 2,
			backgroundColor    : 'rgba(255, 255, 255, 0.7)',
			cursor             : 'pointer',
			transitionProperty : 'opacity, background-color',
			transitionDuration : '0.15s',
			width              : '5vmin',
			height             : '5vmin',
			opacity            : 1,
			'&.visible'        :
			{
				opacity : 1
			}
		},
		icon :
		{
			fontSize : '5vmin'
		},
		incompatibleVideo :
		{
			position       : 'absolute',
			zIndex         : 20010,
			top            : 0,
			bottom         : 0,
			left           : 0,
			right          : 0,
			display        : 'flex',
			flexDirection  : 'column',
			justifyContent : 'center',
			alignItems     : 'center',
			'& p'          :
			{
				padding       : '6px 12px',
				borderRadius  : 6,
				userSelect    : 'none',
				pointerEvents : 'none',
				fontSize      : 15,
				color         : 'rgba(255, 255, 255, 0.55)'
			}
		}
	});

const FullScreenView = (props) =>
{
	const {
		roomClient,
		advancedMode,
		consumer,
		toggleConsumerFullscreen,
		toolbarsVisible,
		permanentTopBar,
		classes,
		settings,
		me,
		micProducer,
		hasAudioPermission,
		smallContainer,
		noiseVolume
	} = props;

	const intl = useIntl();

	if (!consumer)
		return null;

	const consumerVisible = (
		Boolean(consumer) &&
		!consumer.locallyPaused &&
		!consumer.remotelyPaused
	);

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

	console.log('stefka');

	return (
		<div className={classes.root}>
			<div className={classes.controls}>
				<div className={classes.button} >
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
										disabled={
											!me.canSendMic ||
											!hasAudioPermission ||
											me.audioInProgress
										}
										color={micState === 'on' ?
											settings.voiceActivatedUnmute ?
												me.isAutoMuted ? 'secondary'
													: 'primary'
												: 'default'
											: 'secondary'
										}
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
										{settings.voiceActivatedUnmute ?
											micState === 'on' ?
												<React.Fragment>
													<svg style={{ 'position': 'absolute' }}>
														<defs>
															<clipPath id='cut-off-indicator'>
																<rect x='0' y='0' width='24' height={24 - 2.4 * noiseVolume} />
															</clipPath>
														</defs>
													</svg>
													<SettingsVoiceIcon style={{ 'position': 'absolute' }}
														color={'default'}
													/>
													<SettingsVoiceIcon
														clip-path='url(#cut-off-indicator)'
														style={
															(
																{ 'position': 'absolute' },
																{ 'opacity': '0.6' }
															)
														}
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
										disabled={
											!me.canSendMic ||
											!hasAudioPermission ||
											me.audioInProgress
										}
										color={micState === 'on' ?
											settings.voiceActivatedUnmute ?
												me.isAutoMuted ? 'secondary' : 'primary'
												: 'primary'
											: 'secondary'
										}
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
														clip-path='url(#cut-off-indicator)'
														style={
															(
																{ 'position': 'absolute' },
																{ 'opacity': '0.6' }
															)
														}
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
								</div>
							}
						</Tooltip>
					</React.Fragment>
				</div>
				<div
					className={classnames(classes.button, {
						visible : toolbarsVisible || permanentTopBar
					})}
					onClick={(e) =>
					{
						e.stopPropagation();
						toggleConsumerFullscreen(consumer);
					}}
				>
					<FullScreenExitIcon className={classes.icon} />
				</div>
			</div>

			<VideoView
				advancedMode={advancedMode}
				videoContain
				consumerSpatialLayers={consumer ? consumer.spatialLayers : null}
				consumerTemporalLayers={consumer ? consumer.temporalLayers : null}
				consumerCurrentSpatialLayer={
					consumer ? consumer.currentSpatialLayer : null
				}
				consumerCurrentTemporalLayer={
					consumer ? consumer.currentTemporalLayer : null
				}
				consumerPreferredSpatialLayer={
					consumer ? consumer.preferredSpatialLayer : null
				}
				consumerPreferredTemporalLayer={
					consumer ? consumer.preferredTemporalLayer : null
				}
				videoMultiLayer={consumer && consumer.type !== 'simple'}
				videoTrack={consumer && consumer.track}
				videoVisible={consumerVisible}
				videoCodec={consumer && consumer.codec}
				videoScore={consumer ? consumer.score : null}
			/>
		</div>
	);
};

FullScreenView.propTypes =
{
	roomClient               : PropTypes.any.isRequired,
	advancedMode             : PropTypes.bool,
	consumer                 : appPropTypes.Consumer,
	toggleConsumerFullscreen : PropTypes.func.isRequired,
	toolbarsVisible          : PropTypes.bool,
	permanentTopBar          : PropTypes.bool,
	classes                  : PropTypes.object.isRequired.button,
	settings                 : PropTypes.object,
	me                       : appPropTypes.Me.isRequired,
	micProducer              : appPropTypes.Producer,
	hasAudioPermission       : PropTypes.bool.isRequired,
	smallContainer           : PropTypes.bool,
	noiseVolume              : PropTypes.number
};

const canShareAudio = makePermissionSelector(permissions.SHARE_AUDIO);

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
		consumer           : state.consumers[state.room.fullScreenConsumer],
		toolbarsVisible    : state.room.toolbarsVisible,
		permanentTopBar    : state.settings.permanentTopBar,
		me                 : state.me,
		...meProducersSelector(state),
		settings           : state.settings,
		noiseVolume        : noise,
		roomClient         : global.CLIENT,
		hasAudioPermission : canShareAudio(state)
	};
};

const mapDispatchToProps = (dispatch) =>
	({
		toggleConsumerFullscreen : (consumer) =>
		{
			if (consumer)
				dispatch(roomActions.toggleConsumerFullscreen(consumer.id));
		}
	});

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.consumers[prev.room.fullScreenConsumer] ===
					next.consumers[next.room.fullScreenConsumer] &&
				prev.room.toolbarsVisible === next.room.toolbarsVisible &&
				prev.settings.permanentTopBar === next.settings.permanentTopBar &&
				prev.settings.audioMuted === next.settings.audioMuted
			);
		}
	}
)(withStyles(styles)(FullScreenView));

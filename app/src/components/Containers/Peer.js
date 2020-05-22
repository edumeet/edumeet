import React, { useState } from 'react';
import { connect } from 'react-redux';
import { makePeerConsumerSelector } from '../Selectors';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import * as roomActions from '../../actions/roomActions';
import { useIntl, FormattedMessage } from 'react-intl';
import VideoView from '../VideoContainers/VideoView';
import Tooltip from '@material-ui/core/Tooltip';
import Fab from '@material-ui/core/Fab';
import IconButton from '@material-ui/core/IconButton';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import NewWindowIcon from '@material-ui/icons/OpenInNew';
import FullScreenIcon from '@material-ui/icons/Fullscreen';
import Volume from './Volume';

const styles = (theme) =>
	({
		root :
		{
			flex               : '0 0 auto',
			boxShadow          : 'var(--peer-shadow)',
			border             : 'var(--peer-border)',
			touchAction        : 'none',
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
				order : 4
			},
			'&.screen' :
			{
				order : 3
			}
		},
		fab :
		{
			margin : theme.spacing(1)
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
			'&.hover'       :
			{
				opacity : 1
			}
		},
		videoInfo :
		{
			position        : 'absolute',
			width           : '100%',
			height          : '100%',
			backgroundColor : 'rgba(0, 0, 0, 0.3)',
			display         : 'flex',
			justifyContent  : 'center',
			alignItems      : 'center',
			padding         : theme.spacing(1),
			zIndex          : 20,
			'& p'           :
			{
				padding       : '6px 12px',
				borderRadius  : 6,
				userSelect    : 'none',
				pointerEvents : 'none',
				fontSize      : 20,
				color         : 'rgba(255, 255, 255, 0.55)'
			}
		}
	});

const Peer = (props) =>
{
	const [ hover, setHover ] = useState(false);

	const intl = useIntl();

	let touchTimeout = null;

	const {
		roomClient,
		advancedMode,
		peer,
		activeSpeaker,
		browser,
		micConsumer,
		webcamConsumer,
		screenConsumer,
		extraVideoConsumers,
		toggleConsumerFullscreen,
		toggleConsumerWindow,
		spacing,
		style,
		smallContainer,
		windowConsumer,
		classes,
		theme
	} = props;

	const micEnabled = (
		Boolean(micConsumer) &&
		!micConsumer.locallyPaused &&
		!micConsumer.remotelyPaused
	);

	const videoVisible = (
		Boolean(webcamConsumer) &&
		!webcamConsumer.locallyPaused &&
		!webcamConsumer.remotelyPaused
	);

	const screenVisible = (
		Boolean(screenConsumer) &&
		!screenConsumer.locallyPaused &&
		!screenConsumer.remotelyPaused
	);

	const smallScreen = useMediaQuery(theme.breakpoints.down('sm'));

	const rootStyle =
	{
		'margin' : spacing,
		...style
	};

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
				style={rootStyle}
			>
				<div className={classnames(classes.viewContainer)}>
					{ !videoVisible &&
						<div className={classes.videoInfo}>
							<p>
								<FormattedMessage
									id='room.videoPaused'
									defaultMessage='This video is paused'
								/>
							</p>
						</div>
					}

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
						<Tooltip
							title={intl.formatMessage({
								id             : 'device.muteAudio',
								defaultMessage : 'Mute audio'
							})}
							placement={smallScreen ? 'top' : 'left'}
						>
							{ smallContainer ?
								<IconButton
									aria-label={intl.formatMessage({
										id             : 'device.muteAudio',
										defaultMessage : 'Mute audio'
									})}
									className={classes.smallContainer}
									disabled={!micConsumer}
									color='primary'
									size='small'
									onClick={() =>
									{
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
								:
								<Fab
									aria-label={intl.formatMessage({
										id             : 'device.muteAudio',
										defaultMessage : 'Mute audio'
									})}
									className={classes.fab}
									disabled={!micConsumer}
									color={micEnabled ? 'default' : 'secondary'}
									size='large'
									onClick={() =>
									{
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
								</Fab>
							}
						</Tooltip>

						{ browser.platform !== 'mobile' &&
							<Tooltip
								title={intl.formatMessage({
									id             : 'label.newWindow',
									defaultMessage : 'New window'
								})}
								placement={smallScreen ? 'top' : 'left'}
							>
								{ smallContainer ?
									<IconButton
										aria-label={intl.formatMessage({
											id             : 'label.newWindow',
											defaultMessage : 'New window'
										})}
										className={classes.smallContainer}
										disabled={
											!videoVisible ||
											(windowConsumer === webcamConsumer.id)
										}
										size='small'
										color='primary'
										onClick={() =>
										{
											toggleConsumerWindow(webcamConsumer);
										}}
									>
										<NewWindowIcon />
									</IconButton>
									:
									<Fab
										aria-label={intl.formatMessage({
											id             : 'label.newWindow',
											defaultMessage : 'New window'
										})}
										className={classes.fab}
										disabled={
											!videoVisible ||
											(windowConsumer === webcamConsumer.id)
										}
										size='large'
										onClick={() =>
										{
											toggleConsumerWindow(webcamConsumer);
										}}
									>
										<NewWindowIcon />
									</Fab>
								}
							</Tooltip>
						}

						<Tooltip
							title={intl.formatMessage({
								id             : 'label.fullscreen',
								defaultMessage : 'Fullscreen'
							})}
							placement={smallScreen ? 'top' : 'left'}
						>
							{ smallContainer ?
								<IconButton
									aria-label={intl.formatMessage({
										id             : 'label.fullscreen',
										defaultMessage : 'Fullscreen'
									})}
									className={classes.smallContainer}
									disabled={!videoVisible}
									size='small'
									color='primary'
									onClick={() =>
									{
										toggleConsumerFullscreen(webcamConsumer);
									}}
								>
									<FullScreenIcon />
								</IconButton>
								:
								<Fab
									aria-label={intl.formatMessage({
										id             : 'label.fullscreen',
										defaultMessage : 'Fullscreen'
									})}
									className={classes.fab}
									disabled={!videoVisible}
									size='large'
									onClick={() =>
									{
										toggleConsumerFullscreen(webcamConsumer);
									}}
								>
									<FullScreenIcon />
								</Fab>
							}
						</Tooltip>
					</div>

					<VideoView
						showQuality
						advancedMode={advancedMode}
						peer={peer}
						displayName={peer.displayName}
						showPeerInfo
						consumerSpatialLayers={webcamConsumer ? webcamConsumer.spatialLayers : null}
						consumerTemporalLayers={webcamConsumer ? webcamConsumer.temporalLayers : null}
						consumerCurrentSpatialLayer={
							webcamConsumer ? webcamConsumer.currentSpatialLayer : null
						}
						consumerCurrentTemporalLayer={
							webcamConsumer ? webcamConsumer.currentTemporalLayer : null
						}
						consumerPreferredSpatialLayer={
							webcamConsumer ? webcamConsumer.preferredSpatialLayer : null
						}
						consumerPreferredTemporalLayer={
							webcamConsumer ? webcamConsumer.preferredTemporalLayer : null
						}
						videoMultiLayer={webcamConsumer && webcamConsumer.type !== 'simple'}
						videoTrack={webcamConsumer && webcamConsumer.track}
						videoVisible={videoVisible}
						audioTrack={micConsumer && micConsumer.track}
						audioCodec={micConsumer && micConsumer.codec}
						videoCodec={webcamConsumer && webcamConsumer.codec}
						audioScore={micConsumer ? micConsumer.score : null}
						videoScore={webcamConsumer ? webcamConsumer.score : null}
					>
						<Volume id={peer.id} />
					</VideoView>
				</div>
			</div>

			{ extraVideoConsumers.map((consumer) =>
			{
				return (
					<div key={consumer.id}
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
						style={rootStyle}
					>
						<div className={classnames(classes.viewContainer)}>
							{ !videoVisible &&
								<div className={classes.videoInfo}>
									<p>
										<FormattedMessage
											id='room.videoPaused'
											defaultMessage='This video is paused'
										/>
									</p>
								</div>
							}

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
								{ browser.platform !== 'mobile' &&
									<Tooltip
										title={intl.formatMessage({
											id             : 'label.newWindow',
											defaultMessage : 'New window'
										})}
										placement={smallScreen ? 'top' : 'left'}
									>
										{ smallContainer ?
											<IconButton
												aria-label={intl.formatMessage({
													id             : 'label.newWindow',
													defaultMessage : 'New window'
												})}
												className={classes.smallContainer}
												disabled={
													!videoVisible ||
													(windowConsumer === consumer.id)
												}
												size='small'
												color='primary'
												onClick={() =>
												{
													toggleConsumerWindow(consumer);
												}}
											>
												<NewWindowIcon />
											</IconButton>
											:
											<Fab
												aria-label={intl.formatMessage({
													id             : 'label.newWindow',
													defaultMessage : 'New window'
												})}
												className={classes.fab}
												disabled={
													!videoVisible ||
													(windowConsumer === consumer.id)
												}
												size='large'
												onClick={() =>
												{
													toggleConsumerWindow(consumer);
												}}
											>
												<NewWindowIcon />
											</Fab>
										}
									</Tooltip>
								}

								<Tooltip
									title={intl.formatMessage({
										id             : 'label.fullscreen',
										defaultMessage : 'Fullscreen'
									})}
									placement={smallScreen ? 'top' : 'left'}
								>
									{ smallContainer ?
										<IconButton
											aria-label={intl.formatMessage({
												id             : 'label.fullscreen',
												defaultMessage : 'Fullscreen'
											})}
											className={classes.smallContainer}
											disabled={!videoVisible}
											size='small'
											color='primary'
											onClick={() =>
											{
												toggleConsumerFullscreen(consumer);
											}}
										>
											<FullScreenIcon />
										</IconButton>
										:
										<Fab
											aria-label={intl.formatMessage({
												id             : 'label.fullscreen',
												defaultMessage : 'Fullscreen'
											})}
											className={classes.fab}
											disabled={!videoVisible}
											size='large'
											onClick={() =>
											{
												toggleConsumerFullscreen(consumer);
											}}
										>
											<FullScreenIcon />
										</Fab>
									}
								</Tooltip>
							</div>

							<VideoView
								showQuality
								advancedMode={advancedMode}
								peer={peer}
								displayName={peer.displayName}
								showPeerInfo
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
								videoVisible={videoVisible}
								videoCodec={consumer && consumer.codec}
								videoScore={consumer ? consumer.score : null}
							/>
						</div>
					</div>
				);
			})}

			{ screenConsumer &&
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
					style={rootStyle}
				>
					<div className={classnames(classes.viewContainer)}>
						{ !screenVisible &&
							<div className={classes.videoInfo}>
								<p>
									<FormattedMessage
										id='room.videoPaused'
										defaultMessage='This video is paused'
									/>
								</p>
							</div>
						}
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
							{ browser.platform !== 'mobile' &&
								<Tooltip
									title={intl.formatMessage({
										id             : 'label.newWindow',
										defaultMessage : 'New window'
									})}
									placement={smallScreen ? 'top' : 'left'}
								>
									<Fab
										aria-label={intl.formatMessage({
											id             : 'label.newWindow',
											defaultMessage : 'New window'
										})}
										className={classes.fab}
										disabled={
											!screenVisible ||
											(windowConsumer === screenConsumer.id)
										}
										size={smallContainer ? 'small' : 'large'}
										onClick={() =>
										{
											toggleConsumerWindow(screenConsumer);
										}}
									>
										<NewWindowIcon />
									</Fab>
								</Tooltip>
							}

							<Tooltip
								title={intl.formatMessage({
									id             : 'label.fullscreen',
									defaultMessage : 'Fullscreen'
								})}
								placement={smallScreen ? 'top' : 'left'}
							>
								<Fab
									aria-label={intl.formatMessage({
										id             : 'label.fullscreen',
										defaultMessage : 'Fullscreen'
									})}
									className={classes.fab}
									disabled={!screenVisible}
									size={smallContainer ? 'small' : 'large'}
									onClick={() =>
									{
										toggleConsumerFullscreen(screenConsumer);
									}}
								>
									<FullScreenIcon />
								</Fab>
							</Tooltip>
						</div>
						<VideoView
							showQuality
							advancedMode={advancedMode}
							videoContain
							consumerSpatialLayers={
								screenConsumer ? screenConsumer.spatialLayers : null
							}
							consumerTemporalLayers={
								screenConsumer ? screenConsumer.temporalLayers : null
							}
							consumerCurrentSpatialLayer={
								screenConsumer ? screenConsumer.currentSpatialLayer : null
							}
							consumerCurrentTemporalLayer={
								screenConsumer ? screenConsumer.currentTemporalLayer : null
							}
							consumerPreferredSpatialLayer={
								screenConsumer ? screenConsumer.preferredSpatialLayer : null
							}
							consumerPreferredTemporalLayer={
								screenConsumer ? screenConsumer.preferredTemporalLayer : null
							}
							videoMultiLayer={screenConsumer && screenConsumer.type !== 'simple'}
							videoTrack={screenConsumer && screenConsumer.track}
							videoVisible={screenVisible}
							videoCodec={screenConsumer && screenConsumer.codec}
							videoScore={screenConsumer ? screenConsumer.score : null}
						/>
					</div>
				</div>
			}
		</React.Fragment>
	);
};

Peer.propTypes =
{
	roomClient               : PropTypes.any.isRequired,
	advancedMode             : PropTypes.bool,
	peer                     : appPropTypes.Peer,
	micConsumer              : appPropTypes.Consumer,
	webcamConsumer           : appPropTypes.Consumer,
	screenConsumer           : appPropTypes.Consumer,
	extraVideoConsumers      : PropTypes.arrayOf(appPropTypes.Consumer),
	windowConsumer           : PropTypes.string,
	activeSpeaker            : PropTypes.bool,
	browser                  : PropTypes.object.isRequired,
	spacing                  : PropTypes.number,
	style                    : PropTypes.object,
	smallContainer           : PropTypes.bool,
	toggleConsumerFullscreen : PropTypes.func.isRequired,
	toggleConsumerWindow     : PropTypes.func.isRequired,
	classes                  : PropTypes.object.isRequired,
	theme                    : PropTypes.object.isRequired
};

const makeMapStateToProps = (initialState, { id }) =>
{
	const getPeerConsumers = makePeerConsumerSelector();

	const mapStateToProps = (state) =>
	{
		return {
			peer           : state.peers[id],
			...getPeerConsumers(state, id),
			windowConsumer : state.room.windowConsumer,
			activeSpeaker  : id === state.room.activeSpeakerId,
			browser        : state.me.browser
		};
	};

	return mapStateToProps;
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		toggleConsumerFullscreen : (consumer) =>
		{
			if (consumer)
				dispatch(roomActions.toggleConsumerFullscreen(consumer.id));
		},
		toggleConsumerWindow : (consumer) =>
		{
			if (consumer)
				dispatch(roomActions.toggleConsumerWindow(consumer.id));
		}
	};
};

export default withRoomContext(connect(
	makeMapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.peers === next.peers &&
				prev.consumers === next.consumers &&
				prev.room.activeSpeakerId === next.room.activeSpeakerId &&
				prev.room.windowConsumer === next.room.windowConsumer &&
				prev.me.browser === next.me.browser
			);
		}
	}
)(withStyles(styles, { withTheme: true })(Peer)));

import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { makePeerConsumerSelector, recordingConsentsPeersSelector } from '../../store/selectors';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import * as roomActions from '../../store/actions/roomActions';
import { useIntl, FormattedMessage } from 'react-intl';
import VideoView from '../VideoContainers/VideoView';
import Tooltip from '@material-ui/core/Tooltip';
import Fab from '@material-ui/core/Fab';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import NewWindowIcon from '@material-ui/icons/OpenInNew';
import FullScreenIcon from '@material-ui/icons/Fullscreen';
import RemoveFromQueueIcon from '@material-ui/icons/RemoveFromQueue';
import AddToQueueIcon from '@material-ui/icons/AddToQueue';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
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
				boxShadow   : 'var(--active-speaker-shadow)',
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
			justifyContent  : 'center',
			alignItems      : 'flex-end',
			padding         : theme.spacing(1),
			zIndex          : 21,
			opacity         : 1,
			transition      : 'opacity 0.3s',
			touchAction     : 'none',
			'&.hover'       :
			{
				opacity : 1
			},
			'& .fab' :
			{
				margin       : theme.spacing(1),
				'&.smallest' : {
					width     : 30,
					height    : 30,
					minHeight : 'auto',
					margin    : theme.spacing(0.5)
				}

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
			'&.hide'        :
			{
				transition : 'opacity 0.1s ease-in-out',
				opacity    : 0
			},
			'&.hover' :
			{
				opacity : 1
			},
			'& p' :
			{
				padding       : '6px 12px',
				borderRadius  : 6,
				userSelect    : 'none',
				pointerEvents : 'none',
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
		windowConsumer,
		fullScreenConsumer,
		classes,
		enableLayersSwitch,
		isSelected,
		mode,
		theme,
		localRecordingState,
		recordingConsents
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

	const rootStyle =
	{
		'margin' : spacing,
		...style
	};

	const width = style.width;

	const height = style.height;

	const [ controls, setControls ] = useState(
		{
			root : {
				style : {}
			},
			item : {
				style : {},
				size  : ''
			}
		}
	);

	const [ videoInfo, setVideoInfo ] = useState(
		{
			root : {
				style : {}
			}
		}
	);

	// Extend styles/props values
	useEffect(() =>
	{
		if (height > 0)
		{
			setControls({
				root : {
					style : {
						flexDirection : 'row',
						alignItems    : 'flex-start'
					}
				},
				item : {
					style : {
						width     : 30,
						height    : 30,
						minHeight : 'auto',
						margin    : theme.spacing(0.5)
					},
					size : 'small'
				}
			});

			setVideoInfo({
				root : {
					style : {
						fontSize : '0em'
					}
				}
			});
		}

		if (height > 120)
		{
			setVideoInfo({
				root : {
					style : {
						fontSize : '1em'
					}
				}
			});
		}

		if (height > 170)
		{
			setControls({
				root : {
					style : {
						flexDirection : 'row',
						alignItems    : 'flex-start'
					}
				},
				item : {
					style : {},
					size  : 'small'
				}
			});

			setVideoInfo({
				root : {
					style : {
						fontSize : '1.5em'
					}
				}
			});
		}

		if (height > 190)
		{
			setControls({
				root : {
					style : {
						flexDirection : 'column'
					}
				},
				item : {
					style : {},
					size  : 'small'
				}
			});
		}

		if (height > 320)
		{
			setControls({
				root : {
					style : {
						flexDirection : 'column'
					}
				},
				item : {
					style : {},
					size  : 'medium'
				}
			});

			setVideoInfo({
				root : {
					style : {
						fontSize : '2.3em'
					}
				}
			});
		}

		if (height > 400)
		{
			setControls({
				root : {
					style : {
						flexDirection : 'column'
					}
				},
				item : {
					style : {},
					size  : 'large'
				}
			});

			setVideoInfo({
				root : {
					style : {
						fontSize : '3.0em'
					}
				}
			});
		}

	}, [ height, theme ]);

	if (peer.picture)
	{
		rootStyle.backgroundImage = `url(${peer.picture})`;
		rootStyle.backgroundSize = 'auto 100%';
	}

	useEffect(() =>
	{
		const handler = setTimeout(() =>
		{
			const consumer = webcamConsumer || screenConsumer;

			if (!consumer)
				return;

			if (windowConsumer === consumer.id)
			{
				// if playing in external window, set the maximum quality levels
				roomClient.setConsumerPreferredLayersMax(consumer);
			}
			else if (enableLayersSwitch && consumer?.type !== 'simple'
				&& fullScreenConsumer !== consumer.id)
			{
				roomClient.adaptConsumerPreferredLayers(consumer, width, height);
			}
		}, 1000);

		return () => { clearTimeout(handler); };
	}, [
		enableLayersSwitch,
		webcamConsumer,
		screenConsumer,
		windowConsumer,
		fullScreenConsumer,
		roomClient, width, height
	]);

	// menu
	const [ menuAnchorElement, setMenuAnchorElement ] = React.useState(null);
	const [ showAudioAnalyzer, setShowAudioAnalyzer ] = React.useState(null);

	const handleMenuOpen = (event) =>
	{
		setMenuAnchorElement(event.currentTarget);
	};

	const handleMenuClose = () =>
	{
		setMenuAnchorElement(null);
	};

	return (
		<React.Fragment>
			<div
				style={rootStyle}
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
			>
				<div className={classnames(classes.viewContainer)}>
					{ !videoVisible &&
						<div
							style={{ ...videoInfo.root.style }}
							className={classnames(
								classes.videoInfo,
								'hide',
								hover ? 'hover' : null
							)}
						>
							<p>
								<FormattedMessage
									id='room.videoPaused'
									defaultMessage='This video is paused'
								/>
							</p>
						</div>
					}

					<div

						className={classnames(
							classes.controls, hover ? 'hover' : null,
							height <= 170 ? 'smallest': null
						)}
						style={{ ...controls.root.style }}
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

						{micConsumer &&
						<Tooltip
							title={intl.formatMessage({
								id             : 'device.muteAudio',
								defaultMessage : 'Mute audio'
							})}
							placement={height <= 190 ? 'bottom' : 'left'}
						>
							<div>
								<Fab
									aria-label={intl.formatMessage({
										id             : 'device.muteAudio',
										defaultMessage : 'Mute audio'
									})}
									// className={classes.fab}
									style={{ ...controls.item.style }}
									className={classnames('fab')}
									color={micEnabled ? 'default' : 'secondary'}
									size={controls.item.size}
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
							</div>
						</Tooltip>
						}

						{ browser.platform !== 'mobile' &&
							videoVisible && windowConsumer !== webcamConsumer.id &&
							<Tooltip
								title={intl.formatMessage({
									id             : 'label.newWindow',
									defaultMessage : 'New window'
								})}
								placement={height <= 190 ? 'bottom' : 'left'}
							>
								<div>
									<Fab
										aria-label={intl.formatMessage({
											id             : 'label.newWindow',
											defaultMessage : 'New window'
										})}
										style={{ ...controls.item.style }}
										className={classnames('fab')}
										size={controls.item.size}
										onClick={() =>
										{
											toggleConsumerWindow(webcamConsumer);
										}}
									>
										<NewWindowIcon />
									</Fab>
								</div>
							</Tooltip>
						}

						{ videoVisible &&
							<Tooltip
								title={intl.formatMessage({
									id             : 'label.fullscreen',
									defaultMessage : 'Fullscreen'
								})}
								placement={height <= 190 ? 'bottom' : 'left'}
							>
								<div>
									<Fab
										aria-label={intl.formatMessage({
											id             : 'label.fullscreen',
											defaultMessage : 'Fullscreen'
										})}
										// className={classes.fab}
										style={{ ...controls.item.style }}
										className={classnames('fab')}
										disabled={!videoVisible}
										size={controls.item.size}
										onClick={() =>
										{
											toggleConsumerFullscreen(webcamConsumer);
										}}
									>
										<FullScreenIcon />
									</Fab>
								</div>
							</Tooltip>
						}

						{ mode === 'filmstrip' &&
							<Tooltip
								title={isSelected ?
									intl.formatMessage({
										id             : 'tooltip.removeParticipantFromSpotlight',
										defaultMessage : 'Remove from spotlight'
									})
									:
									intl.formatMessage({
										id             : 'tooltip.addParticipantToSpotlight',
										defaultMessage : 'Add to spotlight'
									})
								}
								placement={height <= 190 ? 'bottom' : 'left'}
							>
								<div>
									<Fab
										aria-label={isSelected ?
											intl.formatMessage({
												id             : 'tooltip.removeParticipantFromSpotlight',
												defaultMessage : 'Remove from spotlight'
											})
											:
											intl.formatMessage({
												id             : 'tooltip.addParticipantToSpotlight',
												defaultMessage : 'Add to spotlight'
											})
										}
										// className={classes.fab}
										style={{ ...controls.item.style }}
										className={classnames('fab')}
										size={controls.item.size}
										onClick={() =>
										{
											isSelected ?
												roomClient.removeSelectedPeer(peer.id) :
												mode === 'filmstrip' ?
													roomClient.setSelectedPeer(peer.id) :
													roomClient.addSelectedPeer(peer.id);
										}}
									>
										{ isSelected ?
											<RemoveFromQueueIcon />
											:
											<AddToQueueIcon />
										}
									</Fab>
								</div>
							</Tooltip>
						}

						{advancedMode &&
						<React.Fragment>
							<Tooltip
								title={intl.formatMessage({
									id             : 'device.options',
									defaultMessage : 'Options'
								})}
								placement={height <= 190 ? 'bottom' : 'left'}
							>
								<div>
									<Fab
										aria-label={intl.formatMessage({
											id             : 'device.options',
											defaultMessage : 'Options'
										})}
										style={{ ...controls.item.style }}
										className={classnames('fab')}
										size={controls.item.size}
										onClick={handleMenuOpen}
									>
										<MoreHorizIcon />
									</Fab>
								</div>
							</Tooltip>
							<Menu
								anchorEl={menuAnchorElement}
								keepMounted
								open={Boolean(menuAnchorElement)}
								onClose={handleMenuClose}
							>
								<MenuItem
									onClick={() =>
									{
										setShowAudioAnalyzer(!showAudioAnalyzer);
										handleMenuClose();
									}}
								>
									{ showAudioAnalyzer ? 'Disable' : 'Enable' } audio analyzer
								</MenuItem>
							</Menu>
						</React.Fragment>
						}

					</div>

					<VideoView
						localRecordingState={localRecordingState}
						recordingConsents={recordingConsents}
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
						width={width}
						height={height}
						opusConfig={micConsumer && micConsumer.opusConfig}
						showAudioAnalyzer={showAudioAnalyzer}
					>
						<Volume id={peer.id} />
					</VideoView>
				</div>
			</div>

			{ extraVideoConsumers.map((consumer) =>
			{
				return (
					<div key={consumer.id}
						style={rootStyle}
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
					>
						<div className={classnames(classes.viewContainer)}>
							{ !videoVisible &&
								<div
									style={{ ...videoInfo.root.style }}
									className={classes.videoInfo}
								>
									<p>
										<FormattedMessage
											id='room.videoPaused'
											defaultMessage='This video is paused'
										/>
									</p>
								</div>
							}

							<div
								className={classnames(
									classes.controls,
									hover ? 'hover' : null
								)}
								style={{ ...controls.root.style }}
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
										placement={height <= 190 ? 'bottom' : 'left'}
									>
										<div>
											<Fab
												aria-label={intl.formatMessage({
													id             : 'label.newWindow',
													defaultMessage : 'New window'
												})}
												// className={classes.fab}
												style={{ ...controls.item.style }}
												className={classnames('fab')}
												disabled={
													!videoVisible ||
													(windowConsumer === consumer.id)
												}
												size={controls.item.size}
												onClick={() =>
												{
													toggleConsumerWindow(consumer);
												}}
											>
												<NewWindowIcon />
											</Fab>
										</div>
									</Tooltip>
								}

								<Tooltip
									title={intl.formatMessage({
										id             : 'label.fullscreen',
										defaultMessage : 'Fullscreen'
									})}
									placement={height <= 190 ? 'bottom' : 'left'}
								>
									<div>
										<Fab
											aria-label={intl.formatMessage({
												id             : 'label.fullscreen',
												defaultMessage : 'Fullscreen'
											})}
											// className={classes.fab}
											style={{ ...controls.item.style }}
											className={classnames('fab')}
											disabled={!videoVisible}
											size={controls.item.size}
											onClick={() =>
											{
												toggleConsumerFullscreen(consumer);
											}}
										>
											<FullScreenIcon />
										</Fab>
									</div>
								</Tooltip>
							</div>

							<VideoView
								localRecordingState={localRecordingState}
								recordingConsents={recordingConsents}
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
								width={width}
								height={height}
							/>
						</div>
					</div>
				);
			})}

			{ screenConsumer &&
				<div
					style={{ ...rootStyle, ...controls.root.style }}
					className={classnames(
						classes.root, 'screen',
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
					<div className={classnames(classes.viewContainer)}>
						{ !screenVisible &&
							<div
								style={{ ...videoInfo.root.style }}
								className={classes.videoInfo}
							>
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
									placement={height <= 190 ? 'bottom' : 'left'}
								>

									<div>
										<Fab
											aria-label={intl.formatMessage({
												id             : 'label.newWindow',
												defaultMessage : 'New window'
											})}
											style={{ ...controls.item.style }}
											className={classnames('fab')}
											disabled={
												!screenVisible ||
											(windowConsumer === screenConsumer.id)
											}
											size={controls.item.size}
											onClick={() =>
											{
												toggleConsumerWindow(screenConsumer);
											}}
										>
											<NewWindowIcon />
										</Fab>

									</div>
								</Tooltip>
							}

							<Tooltip
								title={intl.formatMessage({
									id             : 'label.fullscreen',
									defaultMessage : 'Fullscreen'
								})}
								placement={height <= 190 ? 'bottom' : 'left'}
							>

								<div>
									<Fab
										aria-label={intl.formatMessage({
											id             : 'label.fullscreen',
											defaultMessage : 'Fullscreen'
										})}
										// className={classes.fab}
										className={classnames(
											'fab',
											height <= 170 ? 'smallest': null
										)}
										disabled={!screenVisible}
										size={controls.item.size}
										onClick={() =>
										{
											toggleConsumerFullscreen(screenConsumer);
										}}
									>
										<FullScreenIcon />
									</Fab>
								</div>
							</Tooltip>
						</div>
						<VideoView
							localRecordingState={localRecordingState}
							recordingConsents={recordingConsents}
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
							width={width}
							height={height}
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
	fullScreenConsumer       : PropTypes.string,
	activeSpeaker            : PropTypes.bool,
	browser                  : PropTypes.object.isRequired,
	spacing                  : PropTypes.number,
	style                    : PropTypes.object,
	toggleConsumerFullscreen : PropTypes.func.isRequired,
	toggleConsumerWindow     : PropTypes.func.isRequired,
	classes                  : PropTypes.object.isRequired,
	theme                    : PropTypes.object.isRequired,
	enableLayersSwitch       : PropTypes.bool,
	isSelected               : PropTypes.bool,
	mode                     : PropTypes.string.isRequired,
	localRecordingState      : PropTypes.string,
	recordingConsents        : PropTypes.array
};

const makeMapStateToProps = (initialState, { id }) =>
{
	const getPeerConsumers = makePeerConsumerSelector();

	const mapStateToProps = (state) =>
	{
		return {
			peer                : state.peers[id],
			...getPeerConsumers(state, id),
			windowConsumer      : state.room.windowConsumer,
			fullScreenConsumer  : state.room.fullScreenConsumer,
			activeSpeaker       : id === state.room.activeSpeakerId,
			browser             : state.me.browser,
			isSelected          : state.room.selectedPeers.includes(id),
			mode                : state.room.mode,
			localRecordingState : state.recorder.localRecordingState.status,
			recordingConsents   : recordingConsentsPeersSelector(state)
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
				prev.room.fullScreenConsumer === next.room.fullScreenConsumer &&
				prev.room.mode === next.room.mode &&
				prev.room.selectedPeers === next.room.selectedPeers &&
				prev.me.browser === next.me.browser &&
				prev.enableLayersSwitch === next.enableLayersSwitch &&
				prev.recorder.localRecordingState.status ===
				next.recorder.localRecordingState.status &&
				recordingConsentsPeersSelector(prev)===recordingConsentsPeersSelector(next)
			);
		}
	}
)(withStyles(styles, { withTheme: true })(Peer)));

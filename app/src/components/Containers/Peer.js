import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import { unstable_useMediaQuery as useMediaQuery } from '@material-ui/core/useMediaQuery';
import * as stateActions from '../../actions/stateActions';
import PeerView from '../VideoContainers/PeerView';
import ScreenView from '../VideoContainers/ScreenView';
import Fab from '@material-ui/core/Fab';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import NewWindowIcon from '@material-ui/icons/OpenInNew';
import FullScreenIcon from '@material-ui/icons/Fullscreen';

const styles = (theme) =>
	({
		root :
		{
			overflow    : 'hidden',
			flex        : '0 0 auto',
			margin      : 6,
			boxShadow   : 'var(--peer-shadow)',
			border      : 'var(--peer-border)',
			touchAction : 'none',
			'&.webcam'  :
			{
				order : 2
			},
			'&.screen' :
			{
				order : 1
			},
			'&.hover' :
			{
				boxShadow : '0px 1px 3px rgba(0, 0, 0, 0.05) inset, 0px 0px 8px rgba(82, 168, 236, 0.9)'
			}
		},
		peerContainer :
		{
			width         : '100%',
			height        : '100%',
			display       : 'flex',
			flexDirection : 'row',
			flex          : '100 100 auto',
			position      : 'relative',
			touchAction   : 'none'
		},
		fab :
		{
			margin : theme.spacing.unit
		},
		viewContainer :
		{
			position   : 'relative',
			flexGrow   : 1,
			'&.webcam' :
			{
				order : 2
			},
			'&.screen' :
			{
				order    : 1,
				maxWidth : '50%'
			}
		},
		controls :
		{
			position        : 'absolute',
			width           : '100%',
			height          : '100%',
			backgroundColor : 'rgba(0, 0, 0, 0.3)',
			display         : 'flex',
			flexDirection   : 'row',
			justifyContent  : 'center',
			alignItems      : 'center',
			padding         : '0.4vmin',
			zIndex          : 20,
			opacity         : 0,
			transition      : 'opacity 0.3s',
			touchAction     : 'none',
			'&.hover'       :
			{
				opacity : 1
			}
		},
		pausedVideo :
		{
			position       : 'absolute',
			zIndex         : 11,
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
				fontSize      : 20,
				color         : 'rgba(255, 255, 255, 0.55)'
			}
		},
		incompatibleVideo :
		{
			position       : 'absolute',
			zIndex         : 10,
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
				fontSize      : 20,
				color         : 'rgba(255, 255, 255, 0.55)'
			}
		}
	});

const Peer = (props) =>
{
	const [ hover, setHover ] = useState(false);
	const [ webcamHover, setWebcamHover ] = useState(false);
	const [ screenHover, setScreenHover ] = useState(false);

	let touchTimeout = null;

	let touchWebcamTimeout = null;

	let touchScreenTimeout = null;

	const {
		roomClient,
		advancedMode,
		peer,
		micConsumer,
		webcamConsumer,
		screenConsumer,
		toggleConsumerFullscreen,
		toggleConsumerWindow,
		style,
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

	let videoProfile;

	if (webcamConsumer)
		videoProfile = webcamConsumer.profile;

	let screenProfile;

	if (screenConsumer)
		screenProfile = screenConsumer.profile;

	const smallScreen = useMediaQuery(theme.breakpoints.down('sm'));

	return (
		<React.Fragment>
			<div
				className={classnames(classes.root, 'webcam', hover ? 'hover' : null)}
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
				<div className={classes.peerContainer}>
					{ videoVisible && !webcamConsumer.supported ?
						<div className={classes.incompatibleVideo}>
							<p>incompatible video</p>
						</div>
						:null
					}

					{ !videoVisible ?
						<div className={classes.pausedVideo}>
							<p>this video is paused</p>
						</div>
						:null
					}

					<div className={classnames(classes.viewContainer)} style={style}>
						<div
							className={classnames(classes.controls, webcamHover ? 'hover' : null)}
							onMouseOver={() => setWebcamHover(true)}
							onMouseOut={() => setWebcamHover(false)}
							onTouchStart={() =>
							{
								if (touchWebcamTimeout)
									clearTimeout(touchWebcamTimeout);
			
								setWebcamHover(true);
							}}
							onTouchEnd={() =>
							{
								if (touchWebcamTimeout)
									clearTimeout(touchWebcamTimeout);
			
								touchWebcamTimeout = setTimeout(() =>
								{
									setWebcamHover(false);
								}, 2000);
							}}
						>
							<Fab
								aria-label='Mute mic'
								className={classes.fab}
								color={micEnabled ? 'default' : 'secondary'}
								onClick={() =>
								{
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
							</Fab>

							{ !smallScreen ?
								<Fab
									aria-label='New window'
									className={classes.fab}
									disabled={
										!videoVisible ||
										(windowConsumer === webcamConsumer.id)
									}
									onClick={() =>
									{
										toggleConsumerWindow(webcamConsumer);
									}}
								>
									<NewWindowIcon />
								</Fab>
								:null
							}

							<Fab
								aria-label='Fullscreen'
								className={classes.fab}
								disabled={!videoVisible}
								onClick={() =>
								{
									toggleConsumerFullscreen(webcamConsumer);
								}}
							>
								<FullScreenIcon />
							</Fab>
						</div>

						<PeerView
							advancedMode={advancedMode}
							peer={peer}
							volume={micConsumer ? micConsumer.volume : null}
							videoTrack={webcamConsumer ? webcamConsumer.track : null}
							videoVisible={videoVisible}
							videoProfile={videoProfile}
							audioCodec={micConsumer ? micConsumer.codec : null}
							videoCodec={webcamConsumer ? webcamConsumer.codec : null}
						/>
					</div>
				</div>
			</div>

			{ screenConsumer ?
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
				>
					<div className={classes.peerContainer}>
						{ screenVisible && !screenConsumer.supported ?
							<div className={classes.incompatibleVideo}>
								<p>incompatible video</p>
							</div>
							:null
						}

						{ !screenVisible ?
							<div className={classes.pausedVideo}>
								<p>this video is paused</p>
							</div>
							:null
						}
						<div className={classnames(classes.viewContainer)} style={style}>
							<div
								className={classnames(classes.controls, screenHover ? 'hover' : null)}
								onMouseOver={() => setScreenHover(true)}
								onMouseOut={() => setScreenHover(false)}
								onTouchStart={() =>
								{
									if (touchScreenTimeout)
										clearTimeout(touchScreenTimeout);
				
									setScreenHover(true);
								}}
								onTouchEnd={() =>
								{

									if (touchScreenTimeout)
										clearTimeout(touchScreenTimeout);
				
									touchScreenTimeout = setTimeout(() =>
									{
										setScreenHover(false);
									}, 2000);
								}}
							>
								{ !smallScreen ?
									<Fab
										aria-label='New window'
										className={classes.fab}
										disabled={
											!screenVisible ||
											(windowConsumer === screenConsumer.id)
										}
										onClick={() =>
										{
											toggleConsumerWindow(screenConsumer);
										}}
									>
										<NewWindowIcon />
									</Fab>
									:null
								}

								<Fab
									aria-label='Fullscreen'
									className={classes.fab}
									disabled={!screenVisible}
									onClick={() =>
									{
										toggleConsumerFullscreen(screenConsumer);
									}}
								>
									<FullScreenIcon />
								</Fab>
							</div>
							<ScreenView
								advancedMode={advancedMode}
								screenTrack={screenConsumer ? screenConsumer.track : null}
								screenVisible={screenVisible}
								screenProfile={screenProfile}
								screenCodec={screenConsumer ? screenConsumer.codec : null}
							/>
						</div>
					</div>
				</div>
				:null
			}
		</React.Fragment>
	);
};

Peer.propTypes =
{
	roomClient               : PropTypes.any.isRequired,
	advancedMode             : PropTypes.bool,
	peer                     : appPropTypes.Peer.isRequired,
	micConsumer              : appPropTypes.Consumer,
	webcamConsumer           : appPropTypes.Consumer,
	screenConsumer           : appPropTypes.Consumer,
	windowConsumer           : PropTypes.number,
	streamDimensions         : PropTypes.object,
	style                    : PropTypes.object,
	toggleConsumerFullscreen : PropTypes.func.isRequired,
	toggleConsumerWindow     : PropTypes.func.isRequired,
	classes                  : PropTypes.object.isRequired,
	theme                    : PropTypes.object.isRequired
};

const mapStateToProps = (state, { name }) =>
{
	const peer = state.peers[name];
	const consumersArray = peer.consumers
		.map((consumerId) => state.consumers[consumerId]);
	const micConsumer =
		consumersArray.find((consumer) => consumer.source === 'mic');
	const webcamConsumer =
		consumersArray.find((consumer) => consumer.source === 'webcam');
	const screenConsumer =
		consumersArray.find((consumer) => consumer.source === 'screen');

	return {
		peer,
		micConsumer,
		webcamConsumer,
		screenConsumer,
		windowConsumer : state.room.windowConsumer
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		toggleConsumerFullscreen : (consumer) =>
		{
			if (consumer)
				dispatch(stateActions.toggleConsumerFullscreen(consumer.id));
		},
		toggleConsumerWindow : (consumer) =>
		{
			if (consumer)
				dispatch(stateActions.toggleConsumerWindow(consumer.id));
		}
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles, { withTheme: true })(Peer)));

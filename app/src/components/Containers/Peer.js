import React, { useState } from 'react';
import { connect } from 'react-redux';
import { makePeerConsumerSelector } from '../Selectors';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import * as stateActions from '../../actions/stateActions';
import VideoView from '../VideoContainers/VideoView';
import Fab from '@material-ui/core/Fab';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
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
			'&.webcam'         :
			{
				order : 4
			},
			'&.screen' :
			{
				order : 3
			},
			'&.hover' :
			{
				boxShadow : '0px 1px 3px rgba(0, 0, 0, 0.05) inset, 0px 0px 8px rgba(82, 168, 236, 0.9)'
			},
			'&.active-speaker' :
			{
				borderColor : 'var(--active-speaker-border-color)'
			}
		},
		fab :
		{
			margin : theme.spacing.unit
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
			padding         : '0.4vmin',
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
			padding         : '0.4vmin',
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
	const [ webcamHover, setWebcamHover ] = useState(false);
	const [ screenHover, setScreenHover ] = useState(false);

	let touchTimeout = null;

	let touchWebcamTimeout = null;

	let touchScreenTimeout = null;

	const {
		roomClient,
		advancedMode,
		peer,
		activeSpeaker,
		micConsumer,
		webcamConsumer,
		screenConsumer,
		toggleConsumerFullscreen,
		toggleConsumerWindow,
		spacing,
		style,
		smallButtons,
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
					{ !videoVisible ?
						<div className={classes.videoInfo}>
							<p>this video is paused</p>
						</div>
						:null
					}

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
							disabled={!micConsumer}
							color={micEnabled ? 'default' : 'secondary'}
							size={smallButtons ? 'small' : 'large'}
							onClick={() =>
							{
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
						</Fab>

						{ !smallScreen ?
							<Fab
								aria-label='New window'
								className={classes.fab}
								disabled={
									!videoVisible ||
									(windowConsumer === webcamConsumer.id)
								}
								size={smallButtons ? 'small' : 'large'}
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
							size={smallButtons ? 'small' : 'large'}
							onClick={() =>
							{
								toggleConsumerFullscreen(webcamConsumer);
							}}
						>
							<FullScreenIcon />
						</Fab>
					</div>

					<VideoView
						advancedMode={advancedMode}
						peer={peer}
						displayName={peer.displayName}
						showPeerInfo
						videoTrack={webcamConsumer ? webcamConsumer.track : null}
						videoVisible={videoVisible}
						videoProfile={videoProfile}
						audioCodec={micConsumer ? micConsumer.codec : null}
						videoCodec={webcamConsumer ? webcamConsumer.codec : null}
					>
						<Volume id={peer.id} />
					</VideoView>
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
					style={rootStyle}
				>
					{ !screenVisible ?
						<div className={classes.videoInfo}>
							<p>this video is paused</p>
						</div>
						:null
					}

					{ screenVisible ?
						<div className={classnames(classes.viewContainer)}>
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
										size={smallButtons ? 'small' : 'large'}
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
									size={smallButtons ? 'small' : 'large'}
									onClick={() =>
									{
										toggleConsumerFullscreen(screenConsumer);
									}}
								>
									<FullScreenIcon />
								</Fab>
							</div>
							<VideoView
								advancedMode={advancedMode}
								videoContain
								videoTrack={screenConsumer ? screenConsumer.track : null}
								videoVisible={screenVisible}
								videoProfile={screenProfile}
								videoCodec={screenConsumer ? screenConsumer.codec : null}
							/>
						</div>
						:null
					}
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
	peer                     : appPropTypes.Peer,
	micConsumer              : appPropTypes.Consumer,
	webcamConsumer           : appPropTypes.Consumer,
	screenConsumer           : appPropTypes.Consumer,
	windowConsumer           : PropTypes.string,
	activeSpeaker            : PropTypes.bool,
	spacing                  : PropTypes.number,
	style                    : PropTypes.object,
	smallButtons             : PropTypes.bool,
	toggleConsumerFullscreen : PropTypes.func.isRequired,
	toggleConsumerWindow     : PropTypes.func.isRequired,
	classes                  : PropTypes.object.isRequired,
	theme                    : PropTypes.object.isRequired
};

const makeMapStateToProps = (initialState, props) =>
{
	const getPeerConsumers = makePeerConsumerSelector();

	const mapStateToProps = (state) =>
	{
		return {
			peer           : state.peers[props.id],
			...getPeerConsumers(state, props),
			windowConsumer : state.room.windowConsumer,
			activeSpeaker  : props.id === state.room.activeSpeakerId
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
				prev.room.windowConsumer === next.room.windowConsumer
			);
		}
	}
)(withStyles(styles, { withTheme: true })(Peer)));

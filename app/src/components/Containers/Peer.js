import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import * as stateActions from '../../actions/stateActions';
import PeerView from '../VideoContainers/PeerView';
import ScreenView from '../VideoContainers/ScreenView';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import NewWindowIcon from '@material-ui/icons/OpenInNew';
import FullScreenIcon from '@material-ui/icons/Fullscreen';

const styles = () =>
	({
		root :
		{
			width         : '100%',
			height        : '100%',
			display       : 'flex',
			flexDirection : 'row',
			flex          : '100 100 auto',
			position      : 'relative'
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
			position       : 'absolute',
			right          : 0,
			top            : 0,
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			alignItems     : 'center',
			padding        : '0.4vmin',
			zIndex         : 20,
			opacity        : 0,
			transition     : 'opacity 0.3s',
			'&.visible'    :
			{
				opacity : 1
			}
		},
		button :
		{
			flex               : '0 0 auto',
			margin             : '0.2vmin',
			borderRadius       : 2,
			opacity            : 0.85,
			width              : 'var(--media-control-button-size)',
			height             : 'var(--media-control-button-size)',
			backgroundColor    : 'var(--media-control-button-color)',
			cursor             : 'pointer',
			transitionProperty : 'opacity, background-color',
			transitionDuration : '0.15s',
			'&:hover'          :
			{
				opacity : 1
			},
			'&.unsupported' :
			{
				pointerEvents : 'none'
			},
			'&.disabled' :
			{
				pointerEvents   : 'none',
				backgroundColor : 'var(--media-control-botton-disabled)'
			},
			'&.on' :
			{
				backgroundColor : 'var(--media-control-botton-on)'
			},
			'&.off' :
			{
				backgroundColor : 'var(--media-control-botton-off)'
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

class Peer extends React.PureComponent
{
	state = {
		controlsVisible : false
	};

	handleMouseOver = () =>
	{
		this.setState({
			controlsVisible : true
		});
	};

	handleMouseOut = () =>
	{
		this.setState({
			controlsVisible : false
		});
	};

	render()
	{
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
			classes
		} = this.props;

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

		return (
			<div
				className={classnames(classes.root, {
					screen : screenConsumer
				})}
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>
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

				<div className={classnames(classes.viewContainer, 'webcam')} style={style}>
					<div
						className={classnames(classes.controls, {
							visible : this.state.controlsVisible
						})}
					>
						<div
							className={classnames(classes.button, {
								on       : micEnabled,
								off      : !micEnabled,
								disabled : peer.peerAudioInProgress
							})}
							onClick={(e) =>
							{
								e.stopPropagation();
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
						</div>

						<div
							className={classnames(classes.button, {
								disabled : !videoVisible ||
									(windowConsumer === webcamConsumer.id)
							})}
							onClick={(e) =>
							{
								e.stopPropagation();
								toggleConsumerWindow(webcamConsumer);
							}}
						>
							<NewWindowIcon />
						</div>

						<div
							className={classnames(classes.button, 'fullscreen', {
								disabled : !videoVisible
							})}
							onClick={(e) =>
							{
								e.stopPropagation();
								toggleConsumerFullscreen(webcamConsumer);
							}}
						>
							<FullScreenIcon />
						</div>
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

				{ screenConsumer ?
					<div className={classnames(classes.viewContainer, 'screen')} style={style}>
						<div
							className={classnames(classes.controls, {
								visible : this.state.controlsVisible
							})}
						>
							<div
								className={classnames(classes.button, 'newwindow', {
									disabled : !screenVisible ||
										(windowConsumer === screenConsumer.id)
								})}
								onClick={(e) =>
								{
									e.stopPropagation();
									toggleConsumerWindow(screenConsumer);
								}}
							>
								<NewWindowIcon />
							</div>

							<div
								className={classnames(classes.button, 'fullscreen', {
									disabled : !screenVisible
								})}
								onClick={(e) =>
								{
									e.stopPropagation();
									toggleConsumerFullscreen(screenConsumer);
								}}
							>
								<FullScreenIcon />
							</div>
						</div>
						<ScreenView
							advancedMode={advancedMode}
							screenTrack={screenConsumer ? screenConsumer.track : null}
							screenVisible={screenVisible}
							screenProfile={screenProfile}
							screenCodec={screenConsumer ? screenConsumer.codec : null}
						/>
					</div>
					:null
				}
			</div>
		);
	}
}

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
	classes                  : PropTypes.object
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
)(withStyles(styles)(Peer)));

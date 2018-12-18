import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import * as stateActions from '../../redux/stateActions';
import PeerView from '../VideoContainers/PeerView';
import ScreenView from '../VideoContainers/ScreenView';

class Peer extends Component
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
			windowConsumer
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
				data-component='Peer'
				className={classnames({
					screen : screenConsumer
				})}
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>
				<If condition={videoVisible && !webcamConsumer.supported}>
					<div className='incompatible-video'>
						<p>incompatible video</p>
					</div>
				</If>

				<If condition={!videoVisible}>
					<div className='paused-video'>
						<p>this video is paused</p>
					</div>
				</If>

				<div className={classnames('view-container', 'webcam')} style={style}>
					<div className='indicators'>
						<If condition={peer.raiseHandState}>
							<div className={
								classnames(
									'icon', 'raise-hand', {
										on  : peer.raiseHandState,
										off : !peer.raiseHandState
									}
								)
							}
							/>
						</If>
					</div>
					<div
						className={classnames('controls', {
							visible : this.state.controlsVisible
						})}
					>
						<div
							className={classnames('button', 'mic', {
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
						/>

						<div
							className={classnames('button', 'newwindow', {
								disabled : !videoVisible ||
									(windowConsumer === webcamConsumer.id)
							})}
							onClick={(e) =>
							{
								e.stopPropagation();
								toggleConsumerWindow(webcamConsumer);
							}}
						/>

						<div
							className={classnames('button', 'fullscreen', {
								disabled : !videoVisible
							})}
							onClick={(e) =>
							{
								e.stopPropagation();
								toggleConsumerFullscreen(webcamConsumer);
							}}
						/>
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

				<If condition={screenConsumer}>
					<div className={classnames('view-container', 'screen')} style={style}>
						<div
							className={classnames('controls', {
								visible : this.state.controlsVisible
							})}
						>
							<div
								className={classnames('button', 'newwindow', {
									disabled : !screenVisible ||
										(windowConsumer === screenConsumer.id)
								})}
								onClick={(e) =>
								{
									e.stopPropagation();
									toggleConsumerWindow(screenConsumer);
								}}
							/>

							<div
								className={classnames('button', 'fullscreen', {
									disabled : !screenVisible
								})}
								onClick={(e) =>
								{
									e.stopPropagation();
									toggleConsumerFullscreen(screenConsumer);
								}}
							/>
						</div>
						<ScreenView
							advancedMode={advancedMode}
							screenTrack={screenConsumer ? screenConsumer.track : null}
							screenVisible={screenVisible}
							screenProfile={screenProfile}
							screenCodec={screenConsumer ? screenConsumer.codec : null}
						/>
					</div>
				</If>
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
	toggleConsumerWindow     : PropTypes.func.isRequired
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

const PeerContainer = withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps
)(Peer));

export default PeerContainer;

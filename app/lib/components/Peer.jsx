import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
import PeerView from './PeerView';
import ScreenView from './ScreenView';

const Peer = (props) =>
{
	const {
		advancedMode,
		peer,
		micConsumer,
		webcamConsumer,
		screenConsumer,
		onMuteMic,
		onUnmuteMic,
		onDisableWebcam,
		onEnableWebcam,
		style
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

	return (
		<div
			data-component='Peer'
			className={classnames({
				screen : screenConsumer
			})}
		>
			<div className='controls'>
				<div
					className={classnames('button', 'mic', {
						on       : micEnabled,
						off      : !micEnabled,
						disabled : peer.peerAudioInProgress
					})}
					onClick={(e) =>
					{
						e.stopPropagation();
						micEnabled ? onMuteMic(peer.name) : onUnmuteMic(peer.name);
					}}
				/>

				<div
					className={classnames('button', 'webcam', {
						on       : videoVisible,
						off      : !videoVisible,
						disabled : peer.peerVideoInProgress
					})}
					onClick={(e) =>
					{
						e.stopPropagation();
						videoVisible ?
							onDisableWebcam(peer.name) : onEnableWebcam(peer.name);
					}}
				/>
			</div>

			{videoVisible && !webcamConsumer.supported ?
				<div className='incompatible-video'>
					<p>incompatible video</p>
				</div>
				:null
			}

			<div className={classnames('view-container', 'webcam')} style={style}>
				<PeerView
					advancedMode={advancedMode}
					peer={peer}
					audioTrack={micConsumer ? micConsumer.track : null}
					videoTrack={webcamConsumer ? webcamConsumer.track : null}
					videoVisible={videoVisible}
					videoProfile={videoProfile}
					audioCodec={micConsumer ? micConsumer.codec : null}
					videoCodec={webcamConsumer ? webcamConsumer.codec : null}
				/>
			</div>

			{screenConsumer ?
				<div className={classnames('view-container', 'screen')} style={style}>
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
};

Peer.propTypes =
{
	advancedMode     : PropTypes.bool,
	peer             : appPropTypes.Peer.isRequired,
	micConsumer      : appPropTypes.Consumer,
	webcamConsumer   : appPropTypes.Consumer,
	screenConsumer   : appPropTypes.Consumer,
	onMuteMic        : PropTypes.func.isRequired,
	onUnmuteMic      : PropTypes.func.isRequired,
	onEnableWebcam   : PropTypes.func.isRequired,
	onDisableWebcam  : PropTypes.func.isRequired,
	streamDimensions : PropTypes.object,
	style            : PropTypes.object
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
		screenConsumer
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onMuteMic : (peerName) =>
		{
			dispatch(requestActions.mutePeerAudio(peerName));
		},
		onUnmuteMic : (peerName) =>
		{
			dispatch(requestActions.unmutePeerAudio(peerName));
		},
		onEnableWebcam : (peerName) =>
		{
			
			dispatch(requestActions.resumePeerVideo(peerName));
		},
		onDisableWebcam : (peerName) =>
		{
			dispatch(requestActions.pausePeerVideo(peerName));
		}
	};
};

const PeerContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Peer);

export default PeerContainer;

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import * as requestActions from '../../redux/requestActions';

const ListPeer = (props) =>
{
	const {
		peer,
		micConsumer,
		webcamConsumer,
		screenConsumer,
		onMuteMic,
		onUnmuteMic,
		onDisableWebcam,
		onEnableWebcam,
		onDisableScreen,
		onEnableScreen
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

	return (
		<div data-component='ListPeer'>
			<img className='avatar' />
			<div className='peer-info'>
				{peer.displayName}
			</div>
			<div className='controls'>
				{ screenConsumer ?
					<div
						className={classnames('button', 'screen', {
							on       : screenVisible,
							off      : !screenVisible,
							disabled : peer.peerScreenInProgress
						})}
						onClick={(e) =>
						{
							e.stopPropagation();
							screenVisible ?
								onDisableScreen(peer.name) : onEnableScreen(peer.name);
						}}
					/>
					:null
				}
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
		</div>
	);
};

ListPeer.propTypes =
{
	advancedMode    : PropTypes.bool,
	peer            : appPropTypes.Peer.isRequired,
	micConsumer     : appPropTypes.Consumer,
	webcamConsumer  : appPropTypes.Consumer,
	screenConsumer  : appPropTypes.Consumer,
	onMuteMic       : PropTypes.func.isRequired,
	onUnmuteMic     : PropTypes.func.isRequired,
	onEnableWebcam  : PropTypes.func.isRequired,
	onDisableWebcam : PropTypes.func.isRequired,
	onEnableScreen  : PropTypes.func.isRequired,
	onDisableScreen : PropTypes.func.isRequired
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
		},
		onEnableScreen : (peerName) =>
		{
			dispatch(requestActions.resumePeerScreen(peerName));
		},
		onDisableScreen : (peerName) =>
		{
			dispatch(requestActions.pausePeerScreen(peerName));
		}
	};
};

const ListPeerContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(ListPeer);

export default ListPeerContainer;

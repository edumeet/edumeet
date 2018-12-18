import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../../appPropTypes';
import { withRoomContext } from '../../../RoomContext';

const ListPeer = (props) =>
{
	const {
		roomClient,
		peer,
		micConsumer,
		screenConsumer
	} = props;

	const micEnabled = (
		Boolean(micConsumer) &&
		!micConsumer.locallyPaused &&
		!micConsumer.remotelyPaused
	);

	const screenVisible = (
		Boolean(screenConsumer) &&
		!screenConsumer.locallyPaused &&
		!screenConsumer.remotelyPaused
	);

	const picture = peer.picture || 'resources/images/avatar-empty.jpeg';

	return (
		<div data-component='ListPeer'>
			<img className='avatar' src={picture} />

			<div className='peer-info'>
				{peer.displayName}
			</div>
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
			<div className='volume-container'>
				<div className={classnames('bar', `level${micEnabled && micConsumer ? micConsumer.volume:0}`)} />
			</div>
			<div className='controls'>
				<If condition={screenConsumer}>
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
								roomClient.modifyPeerConsumer(peer.name, 'screen', true) :
								roomClient.modifyPeerConsumer(peer.name, 'screen', false);
						}}
					/>
				</If>
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
			</div>
		</div>
	);
};

ListPeer.propTypes =
{
	roomClient     : PropTypes.any.isRequired,
	advancedMode   : PropTypes.bool,
	peer           : appPropTypes.Peer.isRequired,
	micConsumer    : appPropTypes.Consumer,
	webcamConsumer : appPropTypes.Consumer,
	screenConsumer : appPropTypes.Consumer
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

const ListPeerContainer = withRoomContext(connect(
	mapStateToProps
)(ListPeer));

export default ListPeerContainer;

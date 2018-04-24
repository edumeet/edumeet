import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from './appPropTypes';
import PeerView from './PeerView';

const Peer = (props) =>
{
	const {
		peer,
		micConsumer,
		webcamConsumer,
		screenConsumer
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
		<div data-component='Peer'>
			<div className='indicators'>
				{peer.raiseHandState ?
					<div className='icon raise-hand' />
					:null
				}
				{!micEnabled ?
					<div className='icon mic-off' />
					:null
				}
				{!videoVisible ?
					<div className='icon webcam-off' />
					:null
				}
			</div>

			{videoVisible && !webcamConsumer.supported ?
				<div className='incompatible-video'>
					<p>incompatible video</p>
				</div>
				:null
			}

			<PeerView
				peer={peer}
				audioTrack={micConsumer ? micConsumer.track : null}
				videoTrack={webcamConsumer ? webcamConsumer.track : null}
				screenTrack={screenConsumer ? screenConsumer.track : null}
				videoVisible={videoVisible}
				videoProfile={videoProfile}
				screenVisible={screenVisible}
				screenProfile={screenProfile}
				audioCodec={micConsumer ? micConsumer.codec : null}
				videoCodec={webcamConsumer ? webcamConsumer.codec : null}
				screenCodec={screenConsumer ? screenConsumer.codec : null}
			/>
		</div>
	);
};

Peer.propTypes =
{
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

const PeerContainer = connect(mapStateToProps)(Peer);

export default PeerContainer;

import React from 'react';
import { connect } from 'react-redux';
import NewWindow from './NewWindow';
import PropTypes from 'prop-types';
import * as appPropTypes from '../appPropTypes';
import * as roomActions from '../../actions/roomActions';
import FullView from '../VideoContainers/FullView';

const VideoWindow = (props) =>
{
	const {
		advancedMode,
		consumer,
		toggleConsumerWindow
	} = props;

	if (!consumer)
		return null;

	const consumerVisible = (
		Boolean(consumer) &&
		!consumer.locallyPaused &&
		!consumer.remotelyPaused
	);

	let consumerProfile;

	if (consumer)
		consumerProfile = consumer.profile;

	return (
		<NewWindow onUnload={toggleConsumerWindow}>
			<FullView
				advancedMode={advancedMode}
				videoTrack={consumer ? consumer.track : null}
				videoVisible={consumerVisible}
				videoProfile={consumerProfile}
			/>
		</NewWindow>
	);
};

VideoWindow.propTypes =
{
	advancedMode         : PropTypes.bool,
	consumer             : appPropTypes.Consumer,
	toggleConsumerWindow : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		consumer : state.consumers[state.room.windowConsumer]
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		toggleConsumerWindow : () =>
		{
			dispatch(roomActions.toggleConsumerWindow());
		}
	};
};

const VideoWindowContainer = connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.consumers[prev.room.windowConsumer] ===
					next.consumers[next.room.windowConsumer]
			);
		}
	}
)(VideoWindow);

export default VideoWindowContainer;

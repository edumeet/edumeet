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
		aspectRatio,
		toggleConsumerWindow
	} = props;

	if (!consumer)
		return null;

	const consumerVisible = (
		Boolean(consumer) &&
		!consumer.locallyPaused &&
		!consumer.remotelyPaused
	);

	return (
		<NewWindow onUnload={toggleConsumerWindow} aspectRatio={aspectRatio}>
			<FullView
				advancedMode={advancedMode}
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
				videoVisible={consumerVisible}
				videoCodec={consumer && consumer.codec}
				videoScore={consumer ? consumer.score : null}
			/>
		</NewWindow>
	);
};

VideoWindow.propTypes =
{
	advancedMode         : PropTypes.bool,
	consumer             : appPropTypes.Consumer,
	aspectRatio          : PropTypes.number.isRequired,
	toggleConsumerWindow : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		consumer    : state.consumers[state.room.windowConsumer],
		aspectRatio : state.settings.aspectRatio
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
					next.consumers[next.room.windowConsumer] &&
				prev.settings.aspectRatio === next.settings.aspectRatio
			);
		}
	}
)(VideoWindow);

export default VideoWindowContainer;

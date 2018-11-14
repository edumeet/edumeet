import React from 'react';
import { connect } from 'react-redux';
import NewWindow from 'react-new-window';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import * as stateActions from '../../redux/stateActions';
import FullView from '../FullView';

const VideoWindow = (props) =>
{
	const {
		advancedMode,
		consumer,
		toggleConsumerWindow,
		toolbarsVisible
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
			<div data-component='FullScreenView'>
				{consumerVisible && !consumer.supported ?
					<div className='incompatible-video'>
						<p>incompatible video</p>
					</div>
					:null
				}

				<div className='controls'>
					<div
						className={classnames('button', 'fullscreen', 'room-controls', {
							visible : toolbarsVisible
						})}
						onClick={(e) =>
						{
							e.stopPropagation();
							toggleConsumerWindow();
						}}
					/>
				</div>

				<FullView
					advancedMode={advancedMode}
					videoTrack={consumer ? consumer.track : null}
					videoVisible={consumerVisible}
					videoProfile={consumerProfile}
				/>
			</div>
		</NewWindow>
	);
};

VideoWindow.propTypes =
{
	advancedMode         : PropTypes.bool,
	consumer             : appPropTypes.Consumer,
	toggleConsumerWindow : PropTypes.func.isRequired,
	toolbarsVisible      : PropTypes.bool
};

const mapStateToProps = (state) =>
{
	return {
		consumer        : state.consumers[state.room.windowConsumer],
		toolbarsVisible : state.room.toolbarsVisible
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		toggleConsumerWindow : () =>
		{
			dispatch(stateActions.toggleConsumerWindow(null));
		}
	};
};

const VideoWindowContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(VideoWindow);

export default VideoWindowContainer;

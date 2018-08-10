import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import * as stateActions from '../redux/stateActions';
import FullView from './FullView';

const FullScreenView = (props) =>
{
	const {
		advancedMode,
		consumer,
		toggleConsumerFullscreen,
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
						toggleConsumerFullscreen(consumer);
					}}
				/>
			</div>

			<FullView
				advancedMode={advancedMode}
				videoTrack={consumer ? consumer.track : null}
				videoVisible={consumerVisible}
				videoProfile={consumerProfile}
				toggleFullscreen={() => toggleConsumerFullscreen(consumer)}
			/>
		</div>
	);
};

FullScreenView.propTypes =
{
	advancedMode             : PropTypes.bool,
	consumer                 : appPropTypes.Consumer,
	toggleConsumerFullscreen : PropTypes.func.isRequired,
	toolbarsVisible          : PropTypes.bool
};

const mapStateToProps = (state) =>
{
	return {
		consumer        : state.consumers[state.room.fullScreenConsumer],
		toolbarsVisible : state.room.toolbarsVisible
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		toggleConsumerFullscreen : (consumer) =>
		{
			if (consumer)
				dispatch(stateActions.toggleConsumerFullscreen(consumer.id));
		}
	};
};

const FullScreenViewContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(FullScreenView);

export default FullScreenViewContainer;

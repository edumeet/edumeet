import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import * as appPropTypes from '../appPropTypes';
import * as roomActions from '../../actions/roomActions';
import FullScreenExitIcon from '@material-ui/icons/FullscreenExit';
import VideoView from './VideoView';

const styles = (theme) =>
	({
		root :
		{
			position : 'absolute',
			top      : 0,
			left     : 0,
			height   : '100%',
			width    : '100%',
			zIndex   : 20000
		},
		controls :
		{
			position       : 'absolute',
			zIndex         : 20020,
			right          : 0,
			top            : 0,
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			alignItems     : 'center',
			padding        : theme.spacing(1)
		},
		button :
		{
			flex               : '0 0 auto',
			margin             : '0.2vmin',
			borderRadius       : 2,
			backgroundColor    : 'rgba(255, 255, 255, 0.7)',
			cursor             : 'pointer',
			transitionProperty : 'opacity, background-color',
			transitionDuration : '0.15s',
			width              : '5vmin',
			height             : '5vmin',
			opacity            : 0,
			'&.visible'        :
			{
				opacity : 1
			}
		},
		icon :
		{
			fontSize : '5vmin'
		},
		incompatibleVideo :
		{
			position       : 'absolute',
			zIndex         : 20010,
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
				fontSize      : 15,
				color         : 'rgba(255, 255, 255, 0.55)'
			}
		}
	});

const FullScreenView = (props) =>
{
	const {
		advancedMode,
		consumer,
		toggleConsumerFullscreen,
		toolbarsVisible,
		permanentTopBar,
		classes
	} = props;

	if (!consumer)
		return null;

	const consumerVisible = (
		Boolean(consumer) &&
		!consumer.locallyPaused &&
		!consumer.remotelyPaused
	);

	return (
		<div className={classes.root}>
			<div className={classes.controls}>
				<div
					className={classnames(classes.button, {
						visible : toolbarsVisible || permanentTopBar
					})}
					onClick={(e) =>
					{
						e.stopPropagation();
						toggleConsumerFullscreen(consumer);
					}}
				>
					<FullScreenExitIcon className={classes.icon} />
				</div>
			</div>

			<VideoView
				advancedMode={advancedMode}
				videoContain
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
		</div>
	);
};

FullScreenView.propTypes =
{
	advancedMode             : PropTypes.bool,
	consumer                 : appPropTypes.Consumer,
	toggleConsumerFullscreen : PropTypes.func.isRequired,
	toolbarsVisible          : PropTypes.bool,
	permanentTopBar          : PropTypes.bool,
	classes                  : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		consumer        : state.consumers[state.room.fullScreenConsumer],
		toolbarsVisible : state.room.toolbarsVisible,
		permanentTopBar : state.settings.permanentTopBar
	});

const mapDispatchToProps = (dispatch) =>
	({
		toggleConsumerFullscreen : (consumer) =>
		{
			if (consumer)
				dispatch(roomActions.toggleConsumerFullscreen(consumer.id));
		}
	});

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.consumers[prev.room.fullScreenConsumer] ===
					next.consumers[next.room.fullScreenConsumer] &&
				prev.room.toolbarsVisible === next.room.toolbarsVisible &&
				prev.settings.permanentTopBar === next.settings.permanentTopBar
			);
		}
	}
)(withStyles(styles)(FullScreenView));

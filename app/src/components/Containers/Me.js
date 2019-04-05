import React from 'react';
import { connect } from 'react-redux';
import { meProducersSelector } from '../Selectors';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import VideoView from '../VideoContainers/VideoView';
import Volume from './Volume';

const styles = () =>
	({
		root :
		{
			flexDirection      : 'row',
			margin             : 6,
			flex               : '0 0 auto',
			boxShadow          : 'var(--peer-shadow)',
			border             : 'var(--peer-border)',
			backgroundColor    : 'var(--peer-bg-color)',
			backgroundImage    : 'var(--peer-empty-avatar)',
			backgroundPosition : 'bottom',
			backgroundSize     : 'auto 85%',
			backgroundRepeat   : 'no-repeat',
			'&.active-speaker' :
			{
				borderColor : 'var(--active-speaker-border-color)'
			}
		},
		viewContainer :
		{
			position   : 'relative',
			'&.webcam' :
			{
				order : 2
			},
			'&.screen' :
			{
				order : 1
			}
		}
	});

const Me = (props) =>
{
	const {
		roomClient,
		me,
		activeSpeaker,
		style,
		advancedMode,
		micProducer,
		webcamProducer,
		screenProducer,
		classes
	} = props;

	const videoVisible = (
		Boolean(webcamProducer) &&
		!webcamProducer.locallyPaused &&
		!webcamProducer.remotelyPaused
	);

	const screenVisible = (
		Boolean(screenProducer) &&
		!screenProducer.locallyPaused &&
		!screenProducer.remotelyPaused
	);

	return (
		<React.Fragment>
			<div
				className={
					classnames(
						classes.root,
						activeSpeaker ? 'active-speaker' : null
					)
				}
			>
				<div className={classnames(classes.viewContainer, 'webcam')} style={style}>
					<VideoView
						isMe
						advancedMode={advancedMode}
						peer={me}
						showPeerInfo
						videoTrack={webcamProducer ? webcamProducer.track : null}
						videoVisible={videoVisible}
						audioCodec={micProducer ? micProducer.codec : null}
						videoCodec={webcamProducer ? webcamProducer.codec : null}
						onChangeDisplayName={(displayName) =>
						{
							roomClient.changeDisplayName(displayName);
						}}
					>
						<Volume name={me.name} />
					</VideoView>
				</div>
			</div>
			{ screenProducer ?
				<div className={classes.root}>
					<div className={classnames(classes.viewContainer, 'screen')} style={style}>
						<VideoView
							isMe
							advancedMode={advancedMode}
							videoContain
							videoTrack={screenProducer ? screenProducer.track : null}
							videoVisible={screenVisible}
							videoCodec={screenProducer ? screenProducer.codec : null}
						/>
					</div>
				</div>
				:null
			}
		</React.Fragment>
	);
};

Me.propTypes =
{
	roomClient     : PropTypes.any.isRequired,
	advancedMode   : PropTypes.bool,
	me             : appPropTypes.Me.isRequired,
	activeSpeaker  : PropTypes.bool,
	micProducer    : appPropTypes.Producer,
	webcamProducer : appPropTypes.Producer,
	screenProducer : appPropTypes.Producer,
	style          : PropTypes.object,
	classes        : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		me            : state.me,
		...meProducersSelector(state),
		activeSpeaker : state.me.name === state.room.activeSpeakerName
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me === next.me &&
				prev.producers === next.producers &&
				prev.room.activeSpeakerName === next.room.activeSpeakerName
			);
		}
	}
)(withStyles(styles)(Me)));

import React from 'react';
import { connect } from 'react-redux';
import { makePeerConsumerSelector } from '../Selectors';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import { FormattedMessage } from 'react-intl';
import VideoView from '../VideoContainers/VideoView';
import Volume from './Volume';

const styles = (theme) =>
	({
		root :
		{
			flex               : '0 0 auto',
			boxShadow          : 'var(--peer-shadow)',
			border             : 'var(--peer-border)',
			touchAction        : 'none',
			backgroundColor    : 'var(--peer-bg-color)',
			backgroundImage    : 'var(--peer-empty-avatar)',
			backgroundPosition : 'bottom',
			backgroundSize     : 'auto 85%',
			backgroundRepeat   : 'no-repeat',
			'&.webcam'         :
			{
				order : 2
			},
			'&.screen' :
			{
				order : 1
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
		},
		videoInfo :
		{
			position        : 'absolute',
			width           : '100%',
			height          : '100%',
			backgroundColor : 'rgba(0, 0, 0, 0.3)',
			display         : 'flex',
			justifyContent  : 'center',
			alignItems      : 'center',
			padding         : theme.spacing(1),
			zIndex          : 21,
			'& p'           :
			{
				padding       : '6px 12px',
				borderRadius  : 6,
				userSelect    : 'none',
				pointerEvents : 'none',
				fontSize      : 20,
				color         : 'rgba(255, 255, 255, 0.55)'
			}
		}
	});

const SpeakerPeer = (props) =>
{
	const {
		advancedMode,
		peer,
		micConsumer,
		webcamConsumer,
		screenConsumer,
		spacing,
		style,
		classes
	} = props;

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

	const spacingStyle =
	{
		'margin' : spacing
	};

	return (
		<React.Fragment>
			<div
				className={
					classnames(
						classes.root,
						'webcam'
					)
				}
				style={spacingStyle}
			>
				<div className={classnames(classes.viewContainer)} style={style}>
					{ !videoVisible &&
						<div className={classes.videoInfo}>
							<p>
								<FormattedMessage
									id='room.videoPaused'
									defaultMessage='This video is paused'
								/>
							</p>
						</div>
					}

					<VideoView
						advancedMode={advancedMode}
						peer={peer}
						displayName={peer.displayName}
						showPeerInfo
						consumerSpatialLayers={webcamConsumer ? webcamConsumer.spatialLayers : null}
						consumerTemporalLayers={webcamConsumer ? webcamConsumer.temporalLayers : null}
						consumerCurrentSpatialLayer={
							webcamConsumer ? webcamConsumer.currentSpatialLayer : null
						}
						consumerCurrentTemporalLayer={
							webcamConsumer ? webcamConsumer.currentTemporalLayer : null
						}
						consumerPreferredSpatialLayer={
							webcamConsumer ? webcamConsumer.preferredSpatialLayer : null
						}
						consumerPreferredTemporalLayer={
							webcamConsumer ? webcamConsumer.preferredTemporalLayer : null
						}
						videoMultiLayer={webcamConsumer && webcamConsumer.type !== 'simple'}
						videoTrack={webcamConsumer && webcamConsumer.track}
						videoVisible={videoVisible}
						audioCodec={micConsumer && micConsumer.codec}
						videoCodec={webcamConsumer && webcamConsumer.codec}
						audioScore={micConsumer ? micConsumer.score : null}
						videoScore={webcamConsumer ? webcamConsumer.score : null}
					>
						<Volume id={peer.id} />
					</VideoView>
				</div>
			</div>

			{ screenConsumer &&
				<div
					className={classnames(classes.root, 'screen')}
				>
					{ !screenVisible &&
						<div className={classes.videoInfo} style={style}>
							<p>
								<FormattedMessage
									id='room.videoPaused'
									defaultMessage='This video is paused'
								/>
							</p>
						</div>
					}

					{ screenVisible &&
						<div className={classnames(classes.viewContainer)} style={style}>
							<VideoView
								advancedMode={advancedMode}
								videoContain
								consumerSpatialLayers={
									screenConsumer ? screenConsumer.spatialLayers : null
								}
								consumerTemporalLayers={
									screenConsumer ? screenConsumer.temporalLayers : null
								}
								consumerCurrentSpatialLayer={
									screenConsumer ? screenConsumer.currentSpatialLayer : null
								}
								consumerCurrentTemporalLayer={
									screenConsumer ? screenConsumer.currentTemporalLayer : null
								}
								consumerPreferredSpatialLayer={
									screenConsumer ? screenConsumer.preferredSpatialLayer : null
								}
								consumerPreferredTemporalLayer={
									screenConsumer ? screenConsumer.preferredTemporalLayer : null
								}
								videoMultiLayer={screenConsumer && screenConsumer.type !== 'simple'}
								videoTrack={screenConsumer && screenConsumer.track}
								videoVisible={screenVisible}
								videoCodec={screenConsumer && screenConsumer.codec}
								videoScore={screenConsumer ? screenConsumer.score : null}
							/>
						</div>
					}
				</div>
			}
		</React.Fragment>
	);
};

SpeakerPeer.propTypes =
{
	advancedMode   : PropTypes.bool,
	peer           : appPropTypes.Peer,
	micConsumer    : appPropTypes.Consumer,
	webcamConsumer : appPropTypes.Consumer,
	screenConsumer : appPropTypes.Consumer,
	spacing        : PropTypes.number,
	style          : PropTypes.object,
	classes        : PropTypes.object.isRequired
};

const mapStateToProps = (state, { id }) =>
{
	const getPeerConsumers = makePeerConsumerSelector();

	return {
		peer : state.peers[id],
		...getPeerConsumers(state, id)
	};
};

export default connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.peers === next.peers &&
				prev.consumers === next.consumers &&
				prev.room.activeSpeakerId === next.room.activeSpeakerId
			);
		}
	}
)(withStyles(styles, { withTheme: true })(SpeakerPeer));

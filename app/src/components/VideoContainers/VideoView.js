import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import EditableInput from '../Controls/EditableInput';

const styles = (theme) =>
	({
		root :
		{
			position      : 'relative',
			flex          : '100 100 auto',
			height        : '100%',
			width         : '100%',
			display       : 'flex',
			flexDirection : 'column',
			overflow      : 'hidden'
		},
		video :
		{
			flex               : '100 100 auto',
			height             : '100%',
			width              : '100%',
			objectFit          : 'cover',
			userSelect         : 'none',
			transitionProperty : 'opacity',
			transitionDuration : '.15s',
			backgroundColor    : 'var(--peer-video-bg-color)',
			'&.isMe'           :
			{
				transform : 'scaleX(-1)'
			},
			'&.hidden' :
			{
				opacity            : 0,
				transitionDuration : '0s'
			},
			'&.loading' :
			{
				filter : 'blur(5px)'
			},
			'&.contain' :
			{
				objectFit       : 'contain',
				backgroundColor : 'rgba(0, 0, 0, 1)'
			}
		},
		info :
		{
			width          : '100%',
			height         : '100%',
			padding        : theme.spacing(1),
			position       : 'absolute',
			zIndex         : 10,
			display        : 'flex',
			flexDirection  : 'column',
			justifyContent : 'space-between'
		},
		media :
		{
			display            : 'flex',
			transitionProperty : 'opacity',
			transitionDuration : '.15s',
			'&.hidden'         :
			{
				opacity            : 0,
				transitionDuration : '0s'
			}
		},
		box :
		{
			padding         : theme.spacing(0.5),
			borderRadius    : 2,
			backgroundColor : 'rgba(0, 0, 0, 0.25)',
			'& p'           :
			{
				userSelect : 'none',
				margin     : 0,
				color      : 'rgba(255, 255, 255, 0.7)',
				fontSize   : '0.8em'
			}
		},
		peer :
		{
			display : 'flex'
		},
		displayNameEdit :
		{
			fontSize        : 14,
			fontWeight      : 400,
			color           : 'rgba(255, 255, 255, 0.85)',
			border          : 'none',
			borderBottom    : '1px solid #aeff00',
			backgroundColor : 'transparent'
		},
		displayNameStatic :
		{
			userSelect : 'none',
			cursor     : 'text',
			fontSize   : 14,
			fontWeight : 400,
			color      : 'rgba(255, 255, 255, 0.85)',
			'&:hover'  :
			{
				backgroundColor : 'rgb(174, 255, 0, 0.25)'
			}
		}
	});

class VideoView extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			videoWidth  : null,
			videoHeight : null
		};

		// Latest received video track.
		// @type {MediaStreamTrack}
		this._videoTrack = null;

		// Periodic timer for showing video resolution.
		this._videoResolutionTimer = null;
	}

	render()
	{
		const {
			isMe,
			isScreen,
			displayName,
			showPeerInfo,
			videoContain,
			advancedMode,
			videoVisible,
			videoMultiLayer,
			// audioScore,
			// videoScore,
			// consumerSpatialLayers,
			// consumerTemporalLayers,
			consumerCurrentSpatialLayer,
			consumerCurrentTemporalLayer,
			consumerPreferredSpatialLayer,
			consumerPreferredTemporalLayer,
			audioCodec,
			videoCodec,
			onChangeDisplayName,
			children,
			classes
		} = this.props;

		const {
			videoWidth,
			videoHeight
		} = this.state;

		return (
			<div className={classes.root}>
				<div className={classes.info}>
					<div className={classnames(classes.media, 
						{
							hidden : !advancedMode
						})}
					>
						<div className={classes.box}>
							{ audioCodec && <p>{audioCodec}</p> }

							{ videoCodec &&
								<p>
									{videoCodec}
								</p>
							}

							{ videoMultiLayer &&
								<p>
									{`current spatial-temporal layers: ${consumerCurrentSpatialLayer} ${consumerCurrentTemporalLayer}`}
									<br />
									{`preferred spatial-temporal layers: ${consumerPreferredSpatialLayer} ${consumerPreferredTemporalLayer}`}
								</p>
							}

							{ (videoVisible && videoWidth !== null) &&
								<p>{videoWidth}x{videoHeight}</p>
							}
						</div>
					</div>

					{ showPeerInfo &&
						<div className={classes.peer}>
							<div className={classes.box}>
								{ isMe ?
									<EditableInput
										value={displayName}
										propName='newDisplayName'
										className={classes.displayNameEdit}
										classLoading='loading'
										classInvalid='invalid'
										shouldBlockWhileLoading
										editProps={{
											maxLength   : 30,
											autoCorrect : 'off',
											spellCheck  : false
										}}
										onChange={({ newDisplayName }) => onChangeDisplayName(newDisplayName)}
									/>
									:
									<span className={classes.displayNameStatic}>
										{displayName}
									</span>
								}
							</div>
						</div>
					}
				</div>

				<video
					ref='video'
					className={classnames(classes.video, {
						hidden  : !videoVisible,
						'isMe'  : isMe && !isScreen,
						contain : videoContain
					})}
					autoPlay
					playsInline
				/>

				{children}
			</div>
		);
	}

	componentDidMount()
	{
		const { videoTrack } = this.props;

		this._setTracks(videoTrack);
	}

	componentWillUnmount()
	{
		clearInterval(this._videoResolutionTimer);
	}

	// eslint-disable-next-line camelcase
	UNSAFE_componentWillReceiveProps(nextProps)
	{
		const { videoTrack } = nextProps;

		this._setTracks(videoTrack);

	}

	_setTracks(videoTrack)
	{
		if (this._videoTrack === videoTrack)
			return;

		this._videoTrack = videoTrack;

		clearInterval(this._videoResolutionTimer);
		this._hideVideoResolution();

		const { video } = this.refs;

		if (videoTrack)
		{
			const stream = new MediaStream();

			if (videoTrack)
				stream.addTrack(videoTrack);

			video.srcObject = stream;

			if (videoTrack)
				this._showVideoResolution();
		}
		else
		{
			video.srcObject = null;
		}
	}

	_showVideoResolution()
	{
		this._videoResolutionTimer = setInterval(() =>
		{
			const { videoWidth, videoHeight } = this.state;
			const { video } = this.refs;

			// Don't re-render if nothing changed.
			if (video.videoWidth === videoWidth && video.videoHeight === videoHeight)
				return;

			this.setState(
				{
					videoWidth  : video.videoWidth,
					videoHeight : video.videoHeight
				});
		}, 1000);
	}

	_hideVideoResolution()
	{
		this.setState({ videoWidth: null, videoHeight: null });
	}
}

VideoView.propTypes =
{
	isMe                           : PropTypes.bool,
	isScreen                       : PropTypes.bool,
	displayName                    : PropTypes.string,
	showPeerInfo                   : PropTypes.bool,
	videoContain                   : PropTypes.bool,
	advancedMode                   : PropTypes.bool,
	videoTrack                     : PropTypes.any,
	videoVisible                   : PropTypes.bool.isRequired,
	consumerSpatialLayers          : PropTypes.number,
	consumerTemporalLayers         : PropTypes.number,
	consumerCurrentSpatialLayer    : PropTypes.number,
	consumerCurrentTemporalLayer   : PropTypes.number,
	consumerPreferredSpatialLayer  : PropTypes.number,
	consumerPreferredTemporalLayer : PropTypes.number,
	videoMultiLayer                : PropTypes.bool,
	audioScore                     : PropTypes.any,
	videoScore                     : PropTypes.any,
	audioCodec                     : PropTypes.string,
	videoCodec                     : PropTypes.string,
	onChangeDisplayName            : PropTypes.func,
	children                       : PropTypes.object,
	classes                        : PropTypes.object.isRequired
};

export default withStyles(styles)(VideoView);

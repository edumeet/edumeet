import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import * as appPropTypes from '../appPropTypes';
import EditableInput from '../Controls/EditableInput';

const styles = () =>
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
			'&.is-me'          :
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
			position       : 'absolute',
			zIndex         : 10,
			top            : '0.6vmin',
			left           : '0.6vmin',
			bottom         : 0,
			right          : 0,
			display        : 'flex',
			flexDirection  : 'column',
			justifyContent : 'space-between'
		},
		media :
		{
			flex          : '0 0 auto',
			display       : 'flex',
			flexDirection : 'row'
		},
		box :
		{
			padding         : '0.4vmin',
			borderRadius    : 2,
			backgroundColor : 'rgba(0, 0, 0, 0.25)',
			'& p'           :
			{
				userSelect    : 'none',
				pointerEvents : 'none',
				margin        : 0,
				color         : 'rgba(255, 255, 255, 0.7)',
				fontSize      : 10,

				'&:last-child' :
				{
					marginBottom : 0
				}
			}
		},
		peer :
		{
			flex            : '0 0 auto',
			display         : 'flex',
			flexDirection   : 'column',
			justifyContent  : 'flex-end',
			position        : 'absolute',
			bottom          : '0.6vmin',
			left            : 0,
			borderRadius    : 2,
			backgroundColor : 'rgba(0, 0, 0, 0.25)',
			padding         : '0.5vmin',
			alignItems      : 'flex-start'
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
		},
		deviceInfo :
		{
			marginTop      : '0.4vmin',
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			alignItems     : 'flex-end',
			'& span'       :
			{
				userSelect    : 'none',
				pointerEvents : 'none',
				fontSize      : 11,
				color         : 'rgba(255, 255, 255, 0.55)'
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
			peer,
			showPeerInfo,
			videoContain,
			advancedMode,
			videoVisible,
			videoProfile,
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
					{ advancedMode ?
						<div className={classes.media}>
							<div className={classes.box}>
								{ audioCodec ?
									<p>{audioCodec}</p>
									:null
								}

								{ videoCodec ?
									<p>{videoCodec} {videoProfile}</p>
									:null
								}

								{ (videoVisible && videoWidth !== null) ?
									<p>{videoWidth}x{videoHeight}</p>
									:null
								}
							</div>
						</div>
						:null
					}

					{ showPeerInfo ?
						<div className={classes.peer}>
							{ isMe ?
								<EditableInput
									value={peer.displayName}
									propName='displayName'
									className={classnames(classes.displayNameEdit, 'display-name')}
									classLoading='loading'
									classInvalid='invalid'
									shouldBlockWhileLoading
									editProps={{
										maxLength   : 30,
										autoCorrect : false,
										spellCheck  : false
									}}
									onChange={({ displayName }) => onChangeDisplayName(displayName)}
								/>
								:
								<span className={classes.displayNameStatic}>
									{peer.displayName}
								</span>
							}

							{ advancedMode ?
								<div className={classes.deviceInfo}>
									<span>
										{peer.device.name} {Math.floor(peer.device.version) || null}
									</span>
								</div>
								:null
							}
						</div>
						:null
					}
				</div>

				<video
					ref='video'
					className={classnames(classes.video, {
						hidden  : !videoVisible,
						'is-me' : isMe,
						loading : videoProfile === 'none',
						contain : videoContain
					})}
					autoPlay
					playsInline
					muted={isMe}
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

	componentWillReceiveProps(nextProps)
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
	isMe : PropTypes.bool,
	peer : PropTypes.oneOfType(
		[ appPropTypes.Me, appPropTypes.Peer ]),
	showPeerInfo        : PropTypes.bool,
	videoContain        : PropTypes.bool,
	advancedMode        : PropTypes.bool,
	videoTrack          : PropTypes.any,
	videoVisible        : PropTypes.bool.isRequired,
	videoProfile        : PropTypes.string,
	audioCodec          : PropTypes.string,
	videoCodec          : PropTypes.string,
	onChangeDisplayName : PropTypes.func,
	children            : PropTypes.object,
	classes             : PropTypes.object.isRequired
};

export default withStyles(styles)(VideoView);

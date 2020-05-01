import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import EditableInput from '../Controls/EditableInput';
import Logger from '../../Logger';
import { green, yellow, orange, red } from '@material-ui/core/colors';
import SignalCellularOffIcon from '@material-ui/icons/SignalCellularOff';
import SignalCellular0BarIcon from '@material-ui/icons/SignalCellular0Bar';
import SignalCellular1BarIcon from '@material-ui/icons/SignalCellular1Bar';
import SignalCellular2BarIcon from '@material-ui/icons/SignalCellular2Bar';
import SignalCellular3BarIcon from '@material-ui/icons/SignalCellular3Bar';
import SignalCellularAltIcon from '@material-ui/icons/SignalCellularAlt';

const logger = new Logger('VideoView');

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
			transitionDuration : '.15s'
		},
		box :
		{
			padding      : theme.spacing(0.5),
			borderRadius : 2,
			'& p'        :
			{
				userSelect : 'none',
				margin     : 0,
				color      : 'rgba(255, 255, 255, 0.7)',
				fontSize   : '0.8em'
			},
			'&.left' :
			{
				backgroundColor : 'rgba(0, 0, 0, 0.25)'
			},
			'&.right' :
			{
				marginLeft : 'auto',
				width      : 30
			},
			'&.hidden' :
			{
				opacity            : 0,
				transitionDuration : '0s'
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

		// Latest received audio track
		// @type {MediaStreamTrack}
		this._audioTrack = null;

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
			audioScore,
			videoScore,
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

		let quality = <SignalCellularOffIcon style={{ color: red[500] }}/>;

		if (videoScore || audioScore)
		{
			const score = videoScore ? videoScore : audioScore;

			switch (score.producerScore)
			{
				case 0:
				case 1:
				{
					quality = <SignalCellular0BarIcon style={{ color: red[500] }}/>;

					break;
				}

				case 2:
				case 3:
				{
					quality = <SignalCellular1BarIcon style={{ color: red[500] }}/>;

					break;
				}

				case 4:
				case 5:
				case 6:
				{
					quality = <SignalCellular2BarIcon style={{ color: orange[500] }}/>;

					break;
				}

				case 7:
				case 8:
				{
					quality = <SignalCellular3BarIcon style={{ color: yellow[500] }}/>;

					break;
				}

				case 9:
				case 10:
				{
					quality = <SignalCellularAltIcon style={{ color: green[500] }}/>;

					break;
				}

				default:
				{
					break;
				}
			}
		}

		return (
			<div className={classes.root}>
				<div className={classes.info}>
					<div className={classes.media}>
						<div className={classnames(classes.box, 'left', { hidden: !advancedMode })}>
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
						{ !isMe &&
							<div className={classnames(classes.box, 'right')}>
								{ 
									quality
								}
							</div>
						}
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
					ref='videoElement'
					className={classnames(classes.video, {
						hidden  : !videoVisible,
						'isMe'  : isMe && !isScreen,
						contain : videoContain
					})}
					autoPlay
					playsInline
					muted
					controls={false}
				/>

				<audio
					ref='audioElement'
					autoPlay
					playsInline
					muted={isMe}
					controls={false}
				/>

				{children}
			</div>
		);
	}

	componentDidMount()
	{
		const { videoTrack, audioTrack } = this.props;

		this._setTracks(videoTrack, audioTrack);
	}

	componentWillUnmount()
	{
		clearInterval(this._videoResolutionTimer);

		const { videoElement } = this.refs;

		if (videoElement)
		{
			videoElement.oncanplay = null;
			videoElement.onplay = null;
			videoElement.onpause = null;
		}
	}

	componentWillUpdate()
	{
		const { videoTrack, audioTrack } = this.props;

		this._setTracks(videoTrack, audioTrack);
	}

	_setTracks(videoTrack, audioTrack)
	{
		if (this._videoTrack === videoTrack && this._audioTrack === audioTrack)
			return;

		this._videoTrack = videoTrack;
		this._audioTrack = audioTrack;

		clearInterval(this._videoResolutionTimer);
		this._hideVideoResolution();

		const { videoElement, audioElement } = this.refs;

		if (videoTrack)
		{
			const stream = new MediaStream();

			stream.addTrack(videoTrack);

			videoElement.srcObject = stream;

			videoElement.oncanplay = () => this.setState({ videoCanPlay: true });

			videoElement.onplay = () =>
			{
				audioElement.play()
					.catch((error) => logger.warn('audioElement.play() [error:"%o]', error));
			};

			videoElement.play()
				.catch((error) => logger.warn('videoElement.play() [error:"%o]', error));

			this._showVideoResolution();
		}
		else
		{
			videoElement.srcObject = null;
		}

		if (audioTrack)
		{
			const stream = new MediaStream();

			stream.addTrack(audioTrack);
			audioElement.srcObject = stream;

			audioElement.play()
				.catch((error) => logger.warn('audioElement.play() [error:"%o]', error));
		}
		else
		{
			audioElement.srcObject = null;
		}
	}

	_showVideoResolution()
	{
		this._videoResolutionTimer = setInterval(() =>
		{
			const { videoWidth, videoHeight } = this.state;
			const { videoElement } = this.refs;

			// Don't re-render if nothing changed.
			if (
				videoElement.videoWidth === videoWidth &&
				videoElement.videoHeight === videoHeight
			)
				return;

			this.setState(
				{
					videoWidth  : videoElement.videoWidth,
					videoHeight : videoElement.videoHeight
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
	audioTrack                     : PropTypes.any,
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

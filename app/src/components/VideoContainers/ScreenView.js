import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

const styles = () =>
	({
		root :
		{
			position           : 'relative',
			flex               : '100 100 auto',
			height             : '100%',
			width              : '100%',
			display            : 'flex',
			flexDirection      : 'column',
			overflow           : 'hidden',
			backgroundColor    : 'var(--peer-bg-color)',
			backgroundImage    : 'var(--peer-empty-avatar)',
			backgroundPosition : 'bottom',
			backgroundSize     : 'auto 85%',
			backgroundRepeat   : 'no-repeat'
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
		}
	});

class ScreenView extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			screenWidth  : null,
			screenHeight : null
		};

		// Latest received screen track.
		// @type {MediaStreamTrack}
		this._screenTrack = null;

		// Periodic timer for showing video resolution.
		this._screenResolutionTimer = null;
	}

	render()
	{
		const {
			isMe,
			advancedMode,
			screenVisible,
			screenProfile,
			screenCodec,
			classes
		} = this.props;

		const {
			screenWidth,
			screenHeight
		} = this.state;

		return (
			<div className={classes.root}>
				<div className={classes.info}>
					{ advancedMode ?
						<div className={classnames(classes.media, { 'is-me': isMe })}>
							{ screenVisible ?
								<div className={classes.box}>
									{ screenCodec ?
										<p>{screenCodec} {screenProfile}</p>
										:null
									}

									{ (screenVisible && screenWidth !== null) ?
										<p>{screenWidth}x{screenHeight}</p>
										:null
									}
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
						hidden  : !screenVisible,
						'is-me' : isMe,
						loading : screenProfile === 'none'
					})}
					autoPlay
					playsInline
					muted={Boolean(true)}
				/>
			</div>
		);
	}

	componentDidMount()
	{
		const { screenTrack } = this.props;

		this._setTracks(screenTrack);
	}

	componentWillUnmount()
	{
		clearInterval(this._screenResolutionTimer);
	}

	componentWillReceiveProps(nextProps)
	{
		const { screenTrack } = nextProps;

		this._setTracks(screenTrack);
	}

	_setTracks(screenTrack)
	{
		if (this._screenTrack === screenTrack)
			return;

		this._screenTrack = screenTrack;

		clearInterval(this._screenResolutionTimer);
		this._hideScreenResolution();

		const { video } = this.refs;

		if (screenTrack)
		{
			const stream = new MediaStream();

			if (screenTrack)
				stream.addTrack(screenTrack);

			video.srcObject = stream;

			if (screenTrack)
				this._showScreenResolution();
		}
		else
		{
			video.srcObject = null;
		}
	}

	_showScreenResolution()
	{
		this._screenResolutionTimer = setInterval(() =>
		{
			const { screenWidth, screenHeight } = this.state;
			const { video } = this.refs;

			// Don't re-render if nothing changed.
			if (video.videoWidth === screenWidth && video.videoHeight === screenHeight)
				return;

			this.setState(
				{
					screenWidth  : video.videoWidth,
					screenHeight : video.videoHeight
				});
		}, 1000);
	}

	_hideScreenResolution()
	{
		this.setState({ screenWidth: null, screenHeight: null });
	}
}

ScreenView.propTypes =
{
	isMe          : PropTypes.bool,
	advancedMode  : PropTypes.bool,
	screenTrack   : PropTypes.any,
	screenVisible : PropTypes.bool,
	screenProfile : PropTypes.string,
	screenCodec   : PropTypes.string,
	classes       : PropTypes.object.isRequired
};

export default withStyles(styles)(ScreenView);
import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

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
			objectFit          : 'contain',
			userSelect         : 'none',
			transitionProperty : 'opacity',
			transitionDuration : '.15s',
			backgroundColor    : 'rgba(0, 0, 0, 1)',
			'&.hidden'         :
			{
				opacity            : 0,
				transitionDuration : '0s'
			},
			'&.loading' :
			{
				filter : 'blur(5px)'
			}
		}
	});

class FullView extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		// Latest received video track.
		// @type {MediaStreamTrack}
		this._videoTrack = null;

		this.video = React.createRef();
	}

	render()
	{
		const {
			videoVisible,
			videoProfile,
			classes
		} = this.props;

		return (
			<div className={classes.root}>
				<video
					ref={this.video}
					className={classnames(classes.video, {
						hidden  : !videoVisible,
						loading : videoProfile === 'none'
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
		const { videoTrack } = this.props;

		this._setTracks(videoTrack);
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps !== this.props)
		{
			const { videoTrack } = this.props;

			this._setTracks(videoTrack);
		}
	}

	_setTracks(videoTrack)
	{
		if (this._videoTrack === videoTrack)
			return;

		this._videoTrack = videoTrack;

		const video = this.video.current;

		if (videoTrack)
		{
			const stream = new MediaStream();

			stream.addTrack(videoTrack);
			video.srcObject = stream;
		}
		else
		{
			video.srcObject = null;
		}
	}
}

FullView.propTypes =
{
	videoTrack   : PropTypes.any,
	videoVisible : PropTypes.bool,
	videoProfile : PropTypes.string,
	classes      : PropTypes.object.isRequired
};

export default withStyles(styles)(FullView);

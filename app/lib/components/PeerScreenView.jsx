import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Spinner from 'react-spinner';

export default class PeerScreenView extends React.Component
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
			videoVisible,
			videoProfile,
			videoCodec
		} = this.props;

		const {
			videoWidth,
			videoHeight
		} = this.state;

		return (
			<div data-component='PeerScreenView'>
				<div className='info'>
					<div className={classnames('media', { 'is-me': isMe })}>
						<div className='box'>
							{videoCodec ?
								<p className='codec'>{videoCodec} {videoProfile}</p>
								:null
							}

							{(videoVisible && videoWidth !== null) ?
								<p className='resolution'>{videoWidth}x{videoHeight}</p>
								:null
							}
						</div>
					</div>
				</div>

				<video
					ref='video'
					className={classnames({
						hidden  : !videoVisible,
						'is-me' : isMe,
						loading : videoProfile === 'none'
					})}
					autoPlay
					muted={isMe}
				/>

				{videoProfile === 'none' ?
					<div className='spinner-container'>
						<Spinner />
					</div>
					:null
				}
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
			const stream = new MediaStream;

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

PeerScreenView.propTypes =
{
	isMe         : PropTypes.bool,
	videoTrack   : PropTypes.any,
	videoVisible : PropTypes.bool.isRequired,
	videoProfile : PropTypes.string,
	videoCodec   : PropTypes.string
};

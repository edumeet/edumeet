import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Spinner from 'react-spinner';

export default class FullView extends React.Component
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
			videoProfile
		} = this.props;

		return (
			<div data-component='FullView'>
				<video
					ref={this.video}
					className={classnames({
						hidden  : !videoVisible,
						loading : videoProfile === 'none'
					})}
					autoPlay
					muted={Boolean(true)}
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

	componentDidUpdate()
	{
		const { videoTrack } = this.props;

		this._setTracks(videoTrack);
	}

	_setTracks(videoTrack)
	{
		if (this._videoTrack === videoTrack)
			return;

		this._videoTrack = videoTrack;

		const video = this.video.current;

		if (videoTrack)
		{
			const stream = new MediaStream;

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
	videoTrack       : PropTypes.any,
	videoVisible     : PropTypes.bool,
	videoProfile     : PropTypes.string,
	toggleFullscreen : PropTypes.func.isRequired
};

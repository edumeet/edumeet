'use strict';

import React from 'react';
import Logger from '../Logger';
import classnames from 'classnames';
import hark from 'hark';

const logger = new Logger('Video'); // eslint-disable-line no-unused-vars

export default class Video extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			width      : 0,
			height     : 0,
			resolution : null,
			volume     : 0 // Integer from 0 to 10.
		};

		let stream = props.stream;

		// Clean stream.
		// Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
		this._cleanStream(stream);

		// Current MediaStreamTracks info.
		this._tracksHash = this._getTracksHash(stream);

		// Periodic timer to show video dimensions.
		this._videoResolutionTimer = null;

		// Hark instance.
		this._hark = null;
	}

	render()
	{
		let props = this.props;
		let state = this.state;

		return (
			<div data-component='Video'>
				{state.width ?
					(
						<div
							className={classnames('resolution', { clickable: !!props.resolution })}
							onClick={this.handleResolutionClick.bind(this)}
						>
							<p>{state.width}x{state.height}</p>
							{props.resolution ?
								<p>{props.resolution}</p>
							:null}
						</div>
					)
				:null}
				<div className='volume'>
					<div className={classnames('bar', `level${state.volume}`)}/>
				</div>

				<video
					ref='video'
					className={classnames(
						{
							mirror : props.mirror,
							hidden : props.videoDisabled
						})}
					autoPlay
					muted={props.muted}
				/>
			</div>
		);
	}

	componentDidMount()
	{
		let stream = this.props.stream;
		let video = this.refs.video;

		video.srcObject = stream;

		this._showVideoResolution();
		this._videoResolutionTimer = setInterval(() =>
		{
			this._showVideoResolution();
		}, 500);

		if (stream.getAudioTracks().length > 0)
		{
			this._hark = hark(stream);

			this._hark.on('speaking', () =>
			{
				// logger.debug('hark "speaking" event');
			});

			this._hark.on('stopped_speaking', () =>
			{
				// logger.debug('hark "stopped_speaking" event');

				this.setState({ volume: 0 });
			});

			this._hark.on('volume_change', (volume, threshold) =>
			{
				if (volume < threshold)
					return;

				// logger.debug('hark "volume_change" event [volume:%sdB, threshold:%sdB]', volume, threshold);

				this.setState(
					{
						volume : Math.round((volume - threshold) * (-10) / threshold)
					});
			});
		}
	}

	componentWillUnmount()
	{
		clearInterval(this._videoResolutionTimer);

		if (this._hark)
			this._hark.stop();
	}

	componentWillReceiveProps(nextProps)
	{
		let stream = nextProps.stream;

		// Clean stream.
		// Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
		this._cleanStream(stream);

		// If there is something different in the stream, re-render it.

		let previousTracksHash = this._tracksHash;

		this._tracksHash = this._getTracksHash(stream);

		if (this._tracksHash !== previousTracksHash)
			this.refs.video.srcObject = stream;
	}

	handleResolutionClick()
	{
		if (!this.props.resolution)
			return;

		logger.debug('handleResolutionClick()');

		this.props.onResolutionChange();
	}

	_getTracksHash(stream)
	{
		return stream.getTracks()
			.map((track) =>
			{
				return track.id;
			})
			.join('|');
	}

	_showVideoResolution()
	{
		let video = this.refs.video;

		this.setState(
			{
				width  : video.videoWidth,
				height : video.videoHeight
			});
	}

	_cleanStream(stream)
	{
		// Hack for Firefox bug:
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1347578

		if (!stream)
			return;

		let tracks = stream.getTracks();
		let previousNumTracks = tracks.length;

		// Remove ended tracks.
		for (let track of tracks)
		{
			if (track.readyState === 'ended')
			{
				logger.warn('_cleanStream() | removing ended track [track:%o]', track);

				stream.removeTrack(track);
			}
		}

		// If there are multiple live audio tracks (related to the bug?) just keep
		// the last one.
		while (stream.getAudioTracks().length > 1)
		{
			let track = stream.getAudioTracks()[0];

			logger.warn('_cleanStream() | removing live audio track due the presence of others [track:%o]', track);

			stream.removeTrack(track);
		}

		// If there are multiple live video tracks (related to the bug?) just keep
		// the last one.
		while (stream.getVideoTracks().length > 1)
		{
			let track = stream.getVideoTracks()[0];

			logger.warn('_cleanStream() | removing live video track due the presence of others [track:%o]', track);

			stream.removeTrack(track);
		}

		let numTracks = stream.getTracks().length;

		if (numTracks !== previousNumTracks)
			logger.warn('_cleanStream() | num tracks changed from %s to %s', previousNumTracks, numTracks);
	}
}

Video.propTypes =
{
	stream             : React.PropTypes.object.isRequired,
	resolution         : React.PropTypes.string,
	muted              : React.PropTypes.bool,
	videoDisabled      : React.PropTypes.bool,
	mirror             : React.PropTypes.bool,
	onResolutionChange : React.PropTypes.func
};

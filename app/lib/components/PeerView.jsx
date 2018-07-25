import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Spinner from 'react-spinner';
import * as appPropTypes from './appPropTypes';
import EditableInput from './EditableInput';
import emotionModel from './Me/emotionModel';
import emotionClassifier from './Me/emotionClassifier';
import clm from 'clmtrackr';
import pModel from './Me/model.js';

// set eigenvector 9 and 11 to not be regularized. This is to better detect motion of the eyebrows
pModel.shapeModel.nonRegularizedVectors.push(9);
pModel.shapeModel.nonRegularizedVectors.push(11);

const videoIsPlaying = (video) =>
	!video.paused && !video.ended && video.readyState > 2;

export default class PeerView extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			volume      : 0, // Integer from 0 to 10.,
			videoWidth  : null,
			videoHeight : null
		};

		// Latest received video track.
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
			peer,
			volume,
			advancedMode,
			videoVisible,
			videoProfile,
			audioCodec,
			videoCodec,
			onChangeDisplayName,
			clmTracking
		} = this.props;

		const {
			videoWidth,
			videoHeight
		} = this.state;

		return (
			<div data-component='PeerView'>
				<div className='info'>
					{advancedMode ?
						<div className={classnames('media', { 'is-me': isMe })}>
							<div className='box'>
								{audioCodec ?
									<p className='codec'>{audioCodec}</p>
									:null
								}

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
						:null
					}

					<div className={classnames('peer', { 'is-me': isMe })}>
						{isMe ?
							<EditableInput
								value={peer.displayName}
								propName='displayName'
								className='display-name editable'
								classLoading='loading'
								classInvalid='invalid'
								shouldBlockWhileLoading
								editProps={{
									maxLength   : 20,
									autoCorrect : false,
									spellCheck  : false
								}}
								onChange={({ displayName }) => onChangeDisplayName(displayName)}
							/>
							:
							<span className='display-name'>
								{peer.displayName}
							</span>
						}

						{advancedMode ?
							<div className='row'>
								<span
									className={classnames('device-icon', peer.device.flag)}
								/>
								<span className='device-version'>
									{peer.device.name} {Math.floor(peer.device.version) || null}
								</span>
							</div>
							:null
						}
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
					width={226}
					height={170}
				/>

				<div className='volume-container'>
					<div className={classnames('bar', `level${volume}`)} />
				</div>

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
		const { audioTrack, videoTrack } = this.props;

		this._setTracks(audioTrack, videoTrack);

		this.cTrack = new clm.tracker({ useWebGL: true });
		this.cTrack.init(pModel);
		this.ec = new emotionClassifier();
		this.ec.init(emotionModel);
	}

	componentWillUnmount()
	{
		clearInterval(this._videoResolutionTimer);

		this.cTrack.stop();
	}

	componentWillReceiveProps(nextProps)
	{
		const { audioTrack, videoTrack } = nextProps;

		this._setTracks(audioTrack, videoTrack);
		
		if (nextProps.clmTracking && videoIsPlaying(this.refs.video) && !this.interval)
		{
			setTimeout(() => {
				if (!this.interval) {
				this.cTrack.start(this.refs.video);
			
				console.log('starting!!')
			
				this.interval = setInterval(() => {
					const cp = this.cTrack.getCurrentParameters();
					const er = this.ec.meanPredict(cp);
					console.log(cp, er);
				}, 3000);
			}
			}, 5000);
		} else if (!videoTrack && this.interval)
		{
			this.cTrack.stop();
			clearInterval(this.interval);
			console.log('stopping')
		}
	}

	_setTracks(audioTrack, videoTrack)
	{
		if (this._audioTrack === audioTrack && this._videoTrack === videoTrack)
			return;

		this._audioTrack = audioTrack;
		this._videoTrack = videoTrack;

		clearInterval(this._videoResolutionTimer);
		this._hideVideoResolution();

		const { video } = this.refs;

		if (audioTrack || videoTrack)
		{
			const stream = new MediaStream;

			if (audioTrack)
				stream.addTrack(audioTrack);

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

PeerView.propTypes =
{
	isMe : PropTypes.bool,
	peer : PropTypes.oneOfType(
		[ appPropTypes.Me, appPropTypes.Peer ]).isRequired,
	advancedMode        : PropTypes.bool,
	audioTrack          : PropTypes.any,
	volume              : PropTypes.number,
	videoTrack          : PropTypes.any,
	videoVisible        : PropTypes.bool.isRequired,
	videoProfile        : PropTypes.string,
	audioCodec          : PropTypes.string,
	videoCodec          : PropTypes.string,
	onChangeDisplayName : PropTypes.func
};

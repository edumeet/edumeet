import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

export default class ScreenView extends React.Component
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
			screenCodec
		} = this.props;

		const {
			screenWidth,
			screenHeight
		} = this.state;

		return (
			<div data-component='ScreenView'>
				<div className='info'>
					<If condition={advancedMode}>
						<div className={classnames('media', { 'is-me': isMe })}>
							<If condition={screenVisible}>
								<div className='box'>
									<If condition={screenCodec}>
										<p className='codec'>{screenCodec} {screenProfile}</p>
									</If>

									<If condition={(screenVisible && screenWidth !== null)}>
										<p className='resolution'>{screenWidth}x{screenHeight}</p>
									</If>
								</div>
							</If>
						</div>
					</If>
				</div>

				<video
					ref='video'
					className={classnames({
						hidden  : !screenVisible,
						'is-me' : isMe,
						loading : screenProfile === 'none'
					})}
					autoPlay
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
			const stream = new MediaStream;

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
	screenCodec   : PropTypes.string
};

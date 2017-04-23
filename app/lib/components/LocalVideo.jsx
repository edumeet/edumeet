'use strict';

import React from 'react';
import IconButton from 'material-ui/IconButton/IconButton';
import MicOffIcon from 'material-ui/svg-icons/av/mic-off';
import VideoCamOffIcon from 'material-ui/svg-icons/av/videocam-off';
import ChangeVideoCamIcon from 'material-ui/svg-icons/av/repeat';
import Video from './Video';
import Logger from '../Logger';

const logger = new Logger('LocalVideo'); // eslint-disable-line no-unused-vars

export default class LocalVideo extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			micMuted       : false,
			webcam         : props.stream && !!props.stream.getVideoTracks()[0],
			togglingWebcam : false
		};
	}

	render()
	{
		let props = this.props;
		let state = this.state;

		return (
			<div data-component='LocalVideo' className={`state-${props.connectionState}`}>
				{props.stream ?
					<Video
						stream={props.stream}
						resolution={props.resolution}
						muted
						mirror={props.webcamType === 'front'}
						onResolutionChange={this.handleResolutionChange.bind(this)}
					/>
				:null}

				<div className='controls'>
					<IconButton
						className='control'
						onClick={this.handleClickMuteMic.bind(this)}
					>
						<MicOffIcon
							color={!state.micMuted ? '#fff' : '#ff0000'}
						/>
					</IconButton>

					<IconButton
						className='control'
						disabled={state.togglingWebcam}
						onClick={this.handleClickWebcam.bind(this)}
					>
						<VideoCamOffIcon
							color={state.webcam ? '#fff' : '#ff8a00'}
						/>
					</IconButton>

					{props.multipleWebcams ?
						<IconButton
							className='control'
							disabled={!state.webcam || state.togglingWebcam}
							onClick={this.handleClickChangeWebcam.bind(this)}
						>
							<ChangeVideoCamIcon
								color='#fff'
							/>
						</IconButton>
					:null}
				</div>

				<div className='info'>
					<div className='peer-id'>{props.peerId}</div>
				</div>
			</div>
		);
	}

	componentWillReceiveProps(nextProps)
	{
		this.setState({ webcam: nextProps.stream && !!nextProps.stream.getVideoTracks()[0] });
	}

	handleClickMuteMic()
	{
		logger.debug('handleClickMuteMic()');

		let value = !this.state.micMuted;

		this.props.onMicMute(value)
			.then(() =>
			{
				this.setState({ micMuted: value });
			});
	}

	handleClickWebcam()
	{
		logger.debug('handleClickWebcam()');

		let value = !this.state.webcam;

		this.setState({ togglingWebcam: true });

		this.props.onWebcamToggle(value)
			.then(() =>
			{
				this.setState({ webcam: value, togglingWebcam: false });
			})
			.catch(() =>
			{
				this.setState({ togglingWebcam: false });
			});
	}

	handleClickChangeWebcam()
	{
		logger.debug('handleClickChangeWebcam()');

		this.props.onWebcamChange();
	}

	handleResolutionChange()
	{
		logger.debug('handleResolutionChange()');

		this.props.onResolutionChange();
	}
}

LocalVideo.propTypes =
{
	peerId             : React.PropTypes.string.isRequired,
	stream             : React.PropTypes.object,
	resolution         : React.PropTypes.string,
	multipleWebcams    : React.PropTypes.bool.isRequired,
	webcamType         : React.PropTypes.string,
	connectionState    : React.PropTypes.string,
	onMicMute          : React.PropTypes.func.isRequired,
	onWebcamToggle     : React.PropTypes.func.isRequired,
	onWebcamChange     : React.PropTypes.func.isRequired,
	onResolutionChange : React.PropTypes.func.isRequired
};

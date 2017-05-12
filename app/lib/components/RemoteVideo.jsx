'use strict';

import React from 'react';
import IconButton from 'material-ui/IconButton/IconButton';
import VolumeOffIcon from 'material-ui/svg-icons/av/volume-off';
import VideoOffIcon from 'material-ui/svg-icons/av/videocam-off';
import classnames from 'classnames';
import Video from './Video';
import Logger from '../Logger';

const logger = new Logger('RemoteVideo');

export default class RemoteVideo extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			audioMuted : false
		};

		let videoTrack = props.stream.getVideoTracks()[0];

		if (videoTrack)
		{
			videoTrack.addEventListener('mute', () =>
			{
				logger.debug('video track "mute" event');
			});

			videoTrack.addEventListener('unmute', () =>
			{
				logger.debug('video track "unmute" event');
			});
		}
	}

	render()
	{
		let props = this.props;
		let state = this.state;
		let videoTrack = props.stream.getVideoTracks()[0];
		let videoEnabled = videoTrack && videoTrack.enabled;

		return (
			<div
				data-component='RemoteVideo'
				className={classnames({
					fullsize         : !!props.fullsize,
					'active-speaker' : props.isActiveSpeaker
				})}
			>
				<Video
					stream={props.stream}
					muted={state.audioMuted}
					videoDisabled={!videoEnabled}
				/>

				<div className='controls'>
					<IconButton
						className='control'
						onClick={this.handleClickMuteAudio.bind(this)}
					>
						<VolumeOffIcon
							color={!state.audioMuted ? '#fff' : '#ff0000'}
						/>
					</IconButton>

					{videoTrack ?
						<IconButton
							className='control'
							onClick={this.handleClickDisableVideo.bind(this)}
						>
							<VideoOffIcon
								color={videoEnabled ? '#fff' : '#ff8a00'}
							/>
						</IconButton>
					:null}
				</div>

				<div className='info'>
					<div className='peer-id'>{props.peer.id}</div>
				</div>
			</div>
		);
	}

	handleClickMuteAudio()
	{
		logger.debug('handleClickMuteAudio()');

		let value = !this.state.audioMuted;

		this.setState({ audioMuted: value });
	}

	handleClickDisableVideo()
	{
		logger.debug('handleClickDisableVideo()');

		let videoTrack = this.props.stream.getVideoTracks()[0];
		let videoEnabled = videoTrack && videoTrack.enabled;
		let stream = this.props.stream;
		let msid = stream.id;

		if (videoEnabled)
		{
			this.props.onDisableVideo(msid)
				.then(() =>
				{
					videoTrack.enabled = false;
					this.forceUpdate();
				});
		}
		else
		{
			this.props.onEnableVideo(msid)
				.then(() =>
				{
					videoTrack.enabled = true;
					this.forceUpdate();
				});
		}
	}
}

RemoteVideo.propTypes =
{
	peer            : React.PropTypes.object.isRequired,
	stream          : React.PropTypes.object.isRequired,
	fullsize        : React.PropTypes.bool,
	isActiveSpeaker : React.PropTypes.bool.isRequired,
	onDisableVideo  : React.PropTypes.func.isRequired,
	onEnableVideo   : React.PropTypes.func.isRequired
};

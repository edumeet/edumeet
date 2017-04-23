'use strict';

import React from 'react';
import IconButton from 'material-ui/IconButton/IconButton';
import VolumeOffIcon from 'material-ui/svg-icons/av/volume-off';
import VideoOffIcon from 'material-ui/svg-icons/av/videocam-off';
import classnames from 'classnames';
import Video from './Video';
import Logger from '../Logger';

const logger = new Logger('RemoteVideo'); // eslint-disable-line no-unused-vars

export default class RemoteVideo extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			audioMuted : false
		};
	}

	render()
	{
		let props = this.props;
		let state = this.state;
		let hasVideo = !!props.stream.getVideoTracks()[0];

		global.SS = props.stream;

		return (
			<div
				data-component='RemoteVideo'
				className={classnames({ fullsize: !!props.fullsize })}
			>
				<Video
					stream={props.stream}
					muted={state.audioMuted}
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

					<IconButton
						className='control'
						onClick={this.handleClickDisableVideo.bind(this)}
					>
						<VideoOffIcon
							color={hasVideo ? '#fff' : '#ff8a00'}
						/>
					</IconButton>
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

		let stream = this.props.stream;
		let msid = stream.id;
		let hasVideo = !!stream.getVideoTracks()[0];

		if (hasVideo)
			this.props.onDisableVideo(msid);
		else
			this.props.onEnableVideo(msid);
	}
}

RemoteVideo.propTypes =
{
	peer           : React.PropTypes.object.isRequired,
	stream         : React.PropTypes.object.isRequired,
	fullsize       : React.PropTypes.bool,
	onDisableVideo : React.PropTypes.func.isRequired,
	onEnableVideo  : React.PropTypes.func.isRequired
};

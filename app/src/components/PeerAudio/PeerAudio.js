import React from 'react';
import PropTypes from 'prop-types';

export default class PeerAudio extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		// Latest received audio track.
		// @type {MediaStreamTrack}
		this._audioTrack = null;
		this._audioOutputDevice = null;
	}

	render()
	{
		return (
			<audio
				ref='audio'
				autoPlay
			/>
		);
	}

	componentDidMount()
	{
		const { audioTrack, audioOutputDevice } = this.props;

		this._setTrack(audioTrack);
		this._setOutputDevice(audioOutputDevice);
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps !== this.props)
		{
			const { audioTrack, audioOutputDevice } = this.props;

			this._setTrack(audioTrack);
			this._setOutputDevice(audioOutputDevice);
		}
	}

	_setTrack(audioTrack)
	{
		if (this._audioTrack === audioTrack)
			return;

		this._audioTrack = audioTrack;

		const { audio } = this.refs;

		if (audioTrack)
		{
			const stream = new MediaStream();

			if (audioTrack)
				stream.addTrack(audioTrack);

			audio.srcObject = stream;
		}
		else
		{
			audio.srcObject = null;
		}
	}

	_setOutputDevice(audioOutputDevice)
	{
		if (this._audioOutputDevice === audioOutputDevice)
			return;

		this._audioOutputDevice = audioOutputDevice;

		const { audio } = this.refs;

		if (audioOutputDevice && typeof audio.setSinkId === 'function')
			audio.setSinkId(audioOutputDevice);
	}
}

PeerAudio.propTypes =
{
	audioTrack        : PropTypes.any,
	audioOutputDevice : PropTypes.string
};

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
		this._gainNode = null;
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
		const { audioTrack, audioOutputDevice, audioGain } = this.props;

		this._setTrack(audioTrack);
		this._setOutputDevice(audioOutputDevice);
		this._setAudioGain(audioGain);
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps !== this.props)
		{
			const { audioTrack, audioOutputDevice, audioGain } = this.props;

			this._setTrack(audioTrack);
			this._setOutputDevice(audioOutputDevice);
			this._setAudioGain(audioGain);
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

	_setAudioGain(audioGain)
	{
		if (audioGain === undefined)
		{
			return;
		}

		if (this._gainNode == null)
		{
			const	{ audio } = this.refs;

			if (!audio.srcObject)
			{
				return;
			}

			const	AudioContext = window.AudioContext || window.webkitAudioContext,
				audioCtx = new AudioContext(),
				src = audioCtx.createMediaStreamSource(audio.srcObject);

			/* dst = audioCtx.createMediaStreamDestination() */

			this._gainNode = audioCtx.createGain();
			src.connect(this._gainNode);
			this._gainNode.connect(audioCtx.destination);
			audio.volume = 0;
		}

		this._gainNode.gain.value = audioGain;
	}
}

PeerAudio.propTypes =
{
	audioTrack        : PropTypes.any,
	audioOutputDevice : PropTypes.string,
	audioGain         : PropTypes.number
};

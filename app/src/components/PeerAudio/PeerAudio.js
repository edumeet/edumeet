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
		const { audioTrack } = this.props;

		this._setTrack(audioTrack);
	}

	// eslint-disable-next-line camelcase
	UNSAFE_componentWillReceiveProps(nextProps)
	{
		const { audioTrack } = nextProps;

		this._setTrack(audioTrack);
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
}

PeerAudio.propTypes =
{
	audioTrack : PropTypes.any
};

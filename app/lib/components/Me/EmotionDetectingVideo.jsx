import React, { Component } from 'react';
import { connect } from 'react-redux';
import emotionModel from './emotionModel';
import emotionClassifier from './emotionClassifier';
import clm from 'clmtrackr';
import pModel from './model.js';
import * as stateActions from '../../redux/stateActions';

// set eigenvector 9 and 11 to not be regularized. This is to better detect motion of the eyebrows
pModel.shapeModel.nonRegularizedVectors.push(9);
pModel.shapeModel.nonRegularizedVectors.push(11);

const videoIsPlaying = (video) =>
	!video.paused && !video.ended && video.readyState > 2;
  
class EmotionDetectingVideo extends Component
{
	constructor(props)
	{
		super(props);

		this.videoRef = props.videoRef();
	}

	componentDidMount()
	{
		this.cTracker = new clm.tracker({ useWebGL: true });
		this.cTracker.init(pModel);
		this.ec = new emotionClassifier();
		this.ec.init(emotionModel);
	}

	componentWillUnmount()
	{
		this.cTracker.stop();
	}

	componentDidUpdate()
	{
		if (videoIsPlaying(this.videoRef.current) && !this.interval)
		{
			this.videoRef.current.play();
			this.cTracker.start(this.videoRef.current);

			this.interval = setInterval(() =>
			{
				const cp = this.cTracker.getCurrentParameters();
				const er = this.ec.meanPredict(cp);

				console.log(this.cTracker.getScore(), this.ec.meanPredict(cp));
				if (this.cTracker.getScore() > 0.5)
				{

					// we want people to be really happy on their avatars :-)
					// however, people are rarely happy in a conference call, so
					// reasonably speaking, you are pretty happy when this is 0.1
					if (er && er.find((entry) => entry.emotion === 'happy').value > 0.1)
					{
						const canvas = document.createElement('canvas');
						canvas.width = this.videoRef.current.width;
						canvas.height = this.videoRef.current.height;
						
						const context = canvas.getContext('2d');

						context.drawImage(this.videoRef.current, 0, 0, 220, 150);
						const dataURL = canvas.toDataURL();

						this.props.setPicture(dataURL);
					}
				}
			}, 5000);
		}
		else if (!videoIsPlaying(this.videoRef.current) && this.interval)
		{
			this.cTracker.stop();
			clearInterval(this.interval);
		}
	}

	render()
	{
		const { videoRef, setPicture, ...rest } = this.props;

		return (
			<video ref={this.videoRef} {...rest} />
		);
	}
}

console.log(stateActions.setPicture);
const mapDispatchToProps = {
	setPicture : stateActions.setPicture
};

export default connect(
	undefined,
	mapDispatchToProps
)(EmotionDetectingVideo);
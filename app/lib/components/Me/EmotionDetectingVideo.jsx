import React, { Component } from 'react';
import { connect } from 'react-redux';
import emotionModel from './emotionModel';
import emotionClassifier from './emotionClassifier';
import clm from 'clmtrackr';
import pModel from './model.js';
import * as stateActions from '../../redux/stateActions';
import ResizeObserver from 'resize-observer-polyfill';

// set eigenvector 9 and 11 to not be regularized. This is to better detect motion of the eyebrows
pModel.shapeModel.nonRegularizedVectors.push(9);
pModel.shapeModel.nonRegularizedVectors.push(11);

const videoIsPlaying = (video) =>
	!video.paused && !video.ended && video.readyState > 2;
	
	function crop(can, a, b) {
    // get your canvas and a context for it
    var ctx = can.getContext('2d');
    
    // get the image data you want to keep.
    var imageData = ctx.getImageData(a.x, a.y, b.x, b.y);
  
    // create a new cavnas same as clipped size and a context
    var newCan = document.createElement('canvas');
    newCan.width = b.x - a.x;
    newCan.height = b.y - a.y;
    var newCtx = newCan.getContext('2d');
  
    // put the clipped image on the new canvas.
    newCtx.putImageData(imageData, 0, 0);
  
    return newCan;    
 }

class EmotionDetectingVideo extends Component
{
	constructor(props)
	{
		super(props);

		this.videoRef = props.videoRef();

		this.initialized = false;
	}

	state = {
		score: 0,
		interval: 500,
		width: null,
		height: null
	};

	initializeTrackerIfNeeded = () =>
	{
		if (this.props.clmTracking && !this.initialized)
			{
			this.cTracker = new clm.tracker({ useWebGL: true });
			this.cTracker.init(pModel);
			this.ec = new emotionClassifier();
			this.ec.init(emotionModel);
			this.initialized = true;
		}
	}

	updateDimensions = () =>
	{
		this.setState({
			width: this.videoRef.current.clientWidth,
			height: this.videoRef.current.clientHeight
		});

		if (this.props.clmTracking)
		{
			this.initializeTrackerIfNeeded();
			this.restartTracking();
		}
	};

	componentDidMount()
	{
		this.initializeTrackerIfNeeded();

		window.addEventListener('resize', this.updateDimensions);
		const observer = new ResizeObserver(this.updateDimensions);
		observer.observe(this.videoRef.current);
	}

	componentWillUnmount()
	{
		if (this.cTracker)
		{
			this.cTracker.stop();
		}

		window.removeEventListener('resize', this.updateDimensions);
	}

	update = (weightedScore) => {
		const canvas = document.createElement('canvas');
		canvas.width = this.videoRef.current.width;
		canvas.height = this.videoRef.current.height;
		
		const context = canvas.getContext('2d');

		context.drawImage(this.videoRef.current, 0, 0, 220, 150);

		var positions = this.cTracker.getCurrentPosition();

		if (positions) {
			const nose = positions[37];

			if (nose) {
				const topLeft = {
					x: Math.max(nose[0] - 64, 0),
					y: Math.max(nose[1] - 64, 0)
				};

				const bottomRight = {
					x: nose[0] + 64,
					y: nose[1] + 64
				};

				const cropped = crop(canvas, topLeft, bottomRight);

				const data = cropped.toDataURL();

				this.props.setPicture(data);

				this.setState({
					interval: Math.pow(weightedScore, 4) * 10 * 1000,
				});

				this.restartTracking();
			}
		}
	};

	async startTracking()
	{
		if (!this.props.clmTracking)
		{
			return;
		}

		await this.videoRef.current.play();
		this.cTracker.start(this.videoRef.current);

		if (this.interval)
		{
			clearInterval(this.interval);
		}

		this.interval = setInterval(() =>
		{
			const cp = this.cTracker.getCurrentParameters();
			const er = this.ec.meanPredict(cp);

			console.log('Face tracker score:', this.cTracker.getScore())

			const happy = er && er.find((entry) => entry.emotion === 'happy').value > 0.2;
			const score = this.cTracker.getScore();
 
			if (score > 0.5 && happy)
			{
				const weightedScore = score * 0.7 + happy * 0.3;

				if (weightedScore > this.state.score)
				{
					this.update(weightedScore);

					this.setState({
						score: weightedScore
					});
				}
			}
		}, this.state.interval);
	}
	
	restartTracking = async () =>
	{
		await this.cTracker.stop();
		await this.startTracking();
	}

	async componentDidUpdate()
	{
		this.initializeTrackerIfNeeded();

		if (this.props.clmTracking)
		{
			await this.restartTracking();
		} else if (this.interval)
		{
			clearInterval(this.interval);
			await this.cTracker.stop();
		}
	}

	render()
	{
		const { videoRef, setPicture, clmTracking, ...rest } = this.props;

		return (
			<video
				ref={this.videoRef}
				width={this.state.width}
				height={this.state.height}
				{...rest}
			/>
		);
	}
}

const mapDispatchToProps = {
	setPicture : stateActions.setPicture
};

export default connect(
	undefined,
	mapDispatchToProps
)(EmotionDetectingVideo);
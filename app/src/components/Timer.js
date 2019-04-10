/* eslint-disable no-console */
import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

export default class Timer extends React.Component
{
	state = {
		meetingTime : '00:00'
	}

	render()
	{
		// this.time = null;
		const {
			startTime
		} = this.props;

		this.startTime = startTime;

		return (
			<div className={classnames('view-container', 'meeting-time', {
				hidden : !startTime
			})}
			>{this.state.meetingTime}</div>
		);
	}

	componentDidMount() 
	{

		console.log('zxj::Timer>>', this.startTime, this.props);
		if (this.startTime)
		{
			this.interval = setInterval(() => 
			{
				let remainTime = new Date().getTime() - this.startTime;
	
				remainTime = new Date(remainTime);
				const h = parseInt(remainTime/1000/60/60%24) > 9 ? parseInt(remainTime/1000/60/60%24) :`0${parseInt(remainTime/1000/60/60%24)}`;
				const mm = parseInt(remainTime/1000/60%60) > 9 ? parseInt(remainTime/1000/60%60) :`0${parseInt(remainTime/1000/60%60)}`;
				const s = parseInt(remainTime/1000%60) > 9 ? parseInt(remainTime/1000%60) :`0${parseInt(remainTime/1000%60)}`;
		
				const meetingTime = parseInt(h) > 0 ? `${h}:${mm}:${s}` : `${mm}:${s}`;
				
				this.setState({ meetingTime });
				// this.state = { meetingTime: this.meetingTime };
			}, 1000);
		}

	}

	componentWillUnmount() 
	{
		clearInterval(this.interval);
	}
}

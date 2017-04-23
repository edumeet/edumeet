'use strict';

import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

const DEFAULT_DURATION = 1000;

export default class TransitionAppear extends React.Component
{
	constructor(props)
	{
		super(props);
	}

	render()
	{
		let props = this.props;
		let duration = props.hasOwnProperty('duration') ? props.duration : DEFAULT_DURATION;

		return (
			<ReactCSSTransitionGroup
				component={FakeTransitionWrapper}
				transitionName='transition'
				transitionAppear={!!duration}
				transitionAppearTimeout={duration}
				transitionEnter={false}
				transitionLeave={false}
			>
				{this.props.children}
			</ReactCSSTransitionGroup>
		);
	}
}

TransitionAppear.propTypes =
{
	children : React.PropTypes.any,
	duration : React.PropTypes.number
};

class FakeTransitionWrapper extends React.Component
{
	constructor(props)
	{
		super(props);
	}

	render()
	{
		let children = React.Children.toArray(this.props.children);

		return children[0] || null;
	}
}

FakeTransitionWrapper.propTypes =
{
	children : React.PropTypes.any
};

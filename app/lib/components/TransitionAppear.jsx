'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import TransitionGroup from 'react-transition-group/TransitionGroup';

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
			<TransitionGroup
				component={FakeTransitionWrapper}
				transitionName='transition'
				transitionAppear={!!duration}
				transitionAppearTimeout={duration}
				transitionEnter={false}
				transitionLeave={false}
			>
				{this.props.children}
			</TransitionGroup>
		);
	}
}

TransitionAppear.propTypes =
{
	children : PropTypes.any,
	duration : PropTypes.number
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
	children : PropTypes.any
};

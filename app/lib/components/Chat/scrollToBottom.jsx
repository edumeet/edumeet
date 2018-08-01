import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';

/**
 * A higher order component which scrolls the user to the bottom of the
 * wrapped component, provided that the user already was at the bottom
 * of the wrapped component. Useful for chats and similar use cases.
 * @param {number} treshold The required distance from the bottom required.
 */
const scrollToBottom = (treshold = 0) => (WrappedComponent) =>
{
	return class AutoScroller extends Component
	{
		constructor(props)
		{
			super(props);

			this.ref = React.createRef();
		}

		getSnapshotBeforeUpdate()
		{
			// Check if the user has scrolled close enough to the bottom for
			// us to scroll to the bottom or not.
			return this.elem.scrollHeight - this.elem.scrollTop <=
				this.elem.clientHeight - treshold;
		}

		scrollToBottom = () =>
		{
			// Scroll the user to the bottom of the wrapped element.
			this.elem.scrollTop = this.elem.scrollHeight;
		};

		componentDidMount()
		{
			// eslint-disable-next-line react/no-find-dom-node
			this.elem = findDOMNode(this.ref.current);

			this.scrollToBottom();
		}

		componentDidUpdate(prevProps, prevState, atBottom)
		{
			if (atBottom)
			{
				this.scrollToBottom();
			}
		}

		render()
		{
			return (
				<WrappedComponent
					ref={this.ref}
					{...this.props}
				/>
			);
		}
	};
};

export default scrollToBottom;
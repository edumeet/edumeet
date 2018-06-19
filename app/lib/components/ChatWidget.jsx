import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as stateActions from '../redux/stateActions';
import * as requestActions from '../redux/requestActions';
import MessageList from './Chat/MessageList';

class ChatWidget extends Component
{
	componentWillReceiveProps(nextProps)
	{
		if (nextProps.chatmessages.length !== this.props.chatmessages.length)
			if (!this.props.showChat)
				this.props.increaseBadge();
	}

	render()
	{
		const {
			senderPlaceHolder,
			onSendMessage,
			onToggleChat,
			showChat,
			disabledInput,
			badge,
			autofocus,
			displayName
		} = this.props;

		return (
			<div data-component='ChatWidget'>
				{
					showChat &&
					<div data-component='Conversation'>
						<MessageList />
						<form
							data-component='Sender'
							onSubmit={(e) => { onSendMessage(e, displayName); }}
						>
							<input
								type='text'
								className='new-message'
								name='message'
								placeholder={senderPlaceHolder}
								disabled={disabledInput}
								autoFocus={autofocus}
								autoComplete='off'
							/>
						</form>
					</div>
				}
				{
					<div
						className='launcher'
						data-type='dark'
						data-tip='Show room chat'
						onClick={onToggleChat}
					>
						{
							badge > 0 && <span className='badge'>{badge}</span>
						}
					</div>
				}
			</div>
		);
	}
}

ChatWidget.propTypes =
{
	onToggleChat      : PropTypes.func,
	showChat          : PropTypes.bool,
	senderPlaceHolder : PropTypes.string,
	onSendMessage     : PropTypes.func,
	disabledInput     : PropTypes.bool,
	badge             : PropTypes.number,
	autofocus         : PropTypes.bool,
	displayName       : PropTypes.string,
	chatmessages      : PropTypes.arrayOf(PropTypes.object),
	increaseBadge     : PropTypes.func
};

ChatWidget.defaultProps =
{
	senderPlaceHolder : 'Type a message...',
	autofocus         : true
};

const mapStateToProps = (state) =>
{
	return {
		showChat      : state.chatbehavior.showChat,
		disabledInput : state.chatbehavior.disabledInput,
		displayName   : state.me.displayName,
		badge         : state.chatbehavior.badge,
		chatmessages  : state.chatmessages
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onToggleChat : () =>
		{
			dispatch(stateActions.toggleChat());
		},
		onSendMessage : (event, displayName) =>
		{
			event.preventDefault();
			const userInput = event.target.message.value;

			if (userInput)
			{
				dispatch(stateActions.addUserMessage(userInput));
				dispatch(requestActions.sendChatMessage(userInput, displayName));
			}
			event.target.message.value = '';
		},
		increaseBadge : () =>
		{
			dispatch(stateActions.increaseBadge());
		}
	};
};

const ChatWidgetContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(ChatWidget);

export default ChatWidgetContainer;

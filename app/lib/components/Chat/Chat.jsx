import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as stateActions from '../../redux/stateActions';
import * as requestActions from '../../redux/requestActions';
import MessageList from './MessageList';

class Chat extends Component
{
	render()
	{
		const {
			senderPlaceHolder,
			onSendMessage,
			disabledInput,
			autofocus,
			displayName
		} = this.props;

		return (
			<div data-component='Chat'>
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
		);
	}
}

Chat.propTypes =
{
	senderPlaceHolder : PropTypes.string,
	onSendMessage     : PropTypes.func,
	disabledInput     : PropTypes.bool,
	autofocus         : PropTypes.bool,
	displayName       : PropTypes.string
};

Chat.defaultProps =
{
	senderPlaceHolder : 'Type a message...',
	autofocus         : true,
	displayName       : null
};

const mapStateToProps = (state) =>
{
	return {
		disabledInput : state.chatbehavior.disabledInput,
		displayName   : state.me.displayName
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
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
		}
	};
};

const ChatContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Chat);

export default ChatContainer;

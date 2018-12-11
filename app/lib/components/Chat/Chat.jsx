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
			displayName,
			picture
		} = this.props;

		return (
			<div data-component='Chat'>
				<MessageList />
				<form
					data-component='Sender'
					onSubmit={(e) => { onSendMessage(e, displayName, picture); }}
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
					<input
						type='submit'
						className='send'
						value='Send'
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
	displayName       : PropTypes.string,
	picture           : PropTypes.string
};

Chat.defaultProps =
{
	senderPlaceHolder : 'Type a message...',
	autofocus         : false,
	displayName       : null
};

const mapStateToProps = (state) =>
{
	return {
		disabledInput : state.chatbehavior.disabledInput,
		displayName   : state.me.displayName,
		picture       : state.me.picture
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onSendMessage : (event, displayName, picture) =>
		{
			event.preventDefault();
			const userInput = event.target.message.value;

			if (userInput)
			{
				dispatch(stateActions.addUserMessage(userInput));
				dispatch(requestActions.sendChatMessage(userInput, displayName, picture));
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

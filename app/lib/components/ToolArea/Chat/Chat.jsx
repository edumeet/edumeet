import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withRoomContext } from '../../../RoomContext';
import MessageList from './MessageList';

class Chat extends Component
{
	createNewMessage(text, sender, name, picture)
	{
		return {
			type : 'message',
			text,
			time : Date.now(),
			name,
			sender,
			picture
		};
	}

	render()
	{
		const {
			roomClient,
			senderPlaceHolder,
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
					onSubmit={(e) =>
					{
						e.preventDefault();
						const userInput = e.target.message.value;

						if (userInput)
						{
							const message = this.createNewMessage(userInput, 'response', displayName, picture);

							roomClient.sendChatMessage(message);
						}
						e.target.message.value = '';
					}}
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
	roomClient        : PropTypes.any.isRequired,
	senderPlaceHolder : PropTypes.string,
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

const ChatContainer = withRoomContext(connect(
	mapStateToProps
)(Chat));

export default ChatContainer;

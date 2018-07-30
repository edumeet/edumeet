import React, { Component } from 'react';
import PropTypes from 'prop-types';
import marked from 'marked';
import { connect } from 'react-redux';

const scrollToBottom = () =>
{
	const messagesDiv = document.getElementById('messages');

	messagesDiv.scrollTop = messagesDiv.scrollHeight;
};

const linkRenderer = new marked.Renderer();

linkRenderer.link = (href, title, text) =>
{
	title = title ? title : href;
	text = text ? text : href;
	
	return (`<a target='_blank' href='${ href }' title='${ title }'>${ text }</a>`);
};

class MessageList extends Component
{
	componentDidMount()
	{
		scrollToBottom();
	}

	componentDidUpdate()
	{
		scrollToBottom();
	}
	
	getTimeString(time)
	{
		return `${(time.getHours() < 10 ? '0' : '')}${time.getHours()}:${(time.getMinutes() < 10 ? '0' : '')}${time.getMinutes()}`;
	}

	render()
	{
		const {
			chatmessages
		} = this.props;

		return (
			<div data-component='MessageList' id='messages'>
				{
					chatmessages.map((message, i) =>
					{
						const messageTime = new Date(message.time);

						const picture = (message.sender === 'response' ?
							message.picture : this.props.myPicture) || 'resources/images/avatar-empty.jpeg';
					
						return (
							<div className='message' key={i}>
								<div className={message.sender}>
									<img className='message-avatar' src={picture} />

									<div className='message-content'>
										<div
											className='message-text'
											// eslint-disable-next-line react/no-danger
											dangerouslySetInnerHTML={{ __html : marked.parse(
												message.text,
												{ sanitize: true, renderer: linkRenderer }
											) }}
										/>

										<span className='message-time'>
											{message.name} - {this.getTimeString(messageTime)}
										</span>
									</div>
								</div>
							</div>
						);
					})
				}
			</div>
		);
	}
}

MessageList.propTypes =
{
	chatmessages : PropTypes.arrayOf(PropTypes.object).isRequired,
	myPicture    : PropTypes.string
};

const mapStateToProps = (state) =>
{
	return {
		chatmessages : state.chatmessages,
		myPicture    : state.me.picture
	};
};

const MessageListContainer = connect(
	mapStateToProps
)(MessageList);

export default MessageListContainer;

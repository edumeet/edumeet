import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { injectIntl, FormattedMessage } from 'react-intl';
import * as appPropTypes from '../../../appPropTypes';
import * as chatActions from '../../../../actions/chatActions';
import classnames from 'classnames';
import Message from './Item/Message';
import File from './Item/File';
import EmptyAvatar from '../../../../images/avatar-empty.jpeg';
import Button from '@material-ui/core/Button';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';

const styles = (theme) =>
	({
		root :
		{
			height        : '100%',
			display       : 'flex',
			flexDirection : 'column',
			alignItems    : 'center',
			overflowY     : 'auto',
			padding       : theme.spacing(1)
		},
		'@global' : {
			'*' : {
				'scrollbar-width' : 'thin'
			},
			'*::-webkit-scrollbar' : {
				width  : '5px',
				height : '5px'
			},
			'*::-webkit-scrollbar-track' : {
				background : 'white'

			},
			'*::-webkit-scrollbar-thumb' : {
				backgroundColor : '#999999'
			}
		},
		'MsgContainer' :
		{
			backgroundColor : 'red'
		},
		buttonGoToNewest :
		{
			position     : 'fixed',
			borderRadius : '50px',
			'&.show'     :
			{
				transition : 'opacity 0.5s',
				opacity    : '1'
			},
			'&.hide' :
			{
				transition : 'opacity 0.5s',
				opacity    : '0'
			},
			'&.asc' : {
				bottom : '100px'
			},
			'&.desc' : {
				top : '130px'
			}
		}
	});

class MessageList extends React.Component
{
	constructor(props)
	{
		super(props);

		this.refList = React.createRef();

		this.currWidth = 0;
	}

	componentDidMount()
	{
		this.refList.current.addEventListener('scroll', this.handleSetScrollEnd);

		this.refList.current.addEventListener('scroll', this.handleIsMessageSeen);
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps.chat.count !== this.props.chat.count)
		{
			this.isMessageSeen();
		}

		if (this.props.chat.isScrollEnd)
		{
			this.handleGoToNewest();
		}

		if (prevProps.chat.order !== this.props.chat.order)
		{
			this.setIsScrollEnd();

			this.handleGoToNewest();
		}
	}

	handleSetScrollEnd = () =>
	{
		this.setIsScrollEnd();
	}

	handleIsMessageSeen = (e) =>
	{
		this.isMessageSeen(e);
	}

	setWidth(el)
	{
		const prev = el.previousSibling;

		const curr = el;

		const prevName = prev.getAttribute('data-name');

		const currName = curr.getAttribute('data-name');

		const currWidth = curr.offsetWidth;

		if (currName !== prevName)
		{
			this.currWidth = currWidth;

			curr.style.minWidth = `${this.currWidth}px`;
		}
		else
		if (currWidth > this.currWidth)
		{
			this.currWidth = currWidth;

			prev.style.minWidth = `${this.currWidth}px`;

			curr.style.minWidth = `${this.currWidth}px`;

			this.forceUpdate();
		}
		else
		{
			curr.style.minWidth = `${this.currWidth}px`;
		}
	}

	setIsScrollEnd = () =>
	{
		let isScrollEnd = undefined;

		if (this.props.chat.order === 'asc')
			isScrollEnd = (
				Math.abs(
					Math.floor(this.refList.current.scrollTop) +
					this.refList.current.offsetHeight -
					this.refList.current.scrollHeight

				) < 2
			);
		else
		if (this.props.chat.order === 'desc')
			isScrollEnd = (this.refList.current.scrollTop === 0 ? true : false);

		this.props.setIsScrollEnd(isScrollEnd);

	}

	isMessageSeen = () =>
	{
		const list = this.refList.current;

		const listRect = list.getBoundingClientRect();

		const items = [ ...list.childNodes ];

		let isSeen = null;

		items.forEach((item) =>
		{
			const itemRect = item.getBoundingClientRect();

			if (this.props.chat.order === 'asc')
				isSeen = itemRect.top <= listRect.bottom;
			else
				isSeen = itemRect.top >= listRect.top;

			if (item.tagName === 'DIV')
			{
				if (isSeen && item.dataset.isseen === 'false')
				{
					this.props.setIsMessageRead(item.dataset.time, true);
				}
			}
		});
	}

	handleGoToNewest = () =>
	{
		if (this.props.chat.order === 'asc')
			this.refList.current.scrollTop = this.refList.current.scrollHeight;
		else
		if (this.props.chat.order === 'desc')
			this.refList.current.scrollTop = 0;
	}

	render()
	{
		const {
			chat,
			myPicture,
			classes,
			files,
			me,
			peers,
			intl
		} = this.props;

		const items = [ ...chat.messages, ...files.files ];

		items.sort((a, b) => (a.time < b.time ? -1: 1));

		if (items.length > 0)
		{
			if (chat.order === 'asc')
				items.sort();
			else
			if (chat.order === 'desc')
				items.reverse();
		}

		return (
			<React.Fragment>
				<div id='chatList' className={classes.root} ref={this.refList}>
					<Button
						variant='contained'
						color='primary'
						size='small'
						onClick={() => this.handleGoToNewest()}
						className={
							classnames(
								classes.buttonGoToNewest,
								chat.countUnread > 0 ? 'show': 'hide',
								chat.order === 'asc' ? 'asc' : 'desc'
							)
						}
						endIcon={
							(chat.order === 'asc' ?
								<ChevronLeftIcon
									style={{
										color     : 'white',
										transform : 'rotate(270deg)'
									}}
								/> :
								<ChevronLeftIcon
									style={{
										color     : 'white',
										transform : 'rotate(90deg)'
									}}
								/>
							)
						}
					>
						( {chat.countUnread} )&nbsp;
						<FormattedMessage
							id='label.chatNewMessages'
							defaultMessage='New messages'
						/>
					</Button>

					{items.length === 0
						? (<div>
							{intl.formatMessage({
								id             : 'label.chatNoMessages',
								defaultMessage : 'No messages'
							})}

						</div>)
						:
						items.map((item, index) =>
						{
							const prev = (index > 0) ?
								`${items[index-1].peerId}-${items[index-1].name}` : null;

							const curr = `${item.peerId}-${item.name}`;

							const next = (index < items.length - 1) ?
								`${items[index+1].peerId}-${items[index+1].name}` : null;

							let format = null;

							if (curr !== prev && curr !== next)
								format = 'single';
							else if (curr !== prev && curr === next)
								format = 'combinedBegin';
							else if (curr === prev && curr === next)
								format = 'combinedMiddle';
							else if (curr === prev && curr !== next)
								format = 'combinedEnd';

							if (item.type === 'message')
							{
								const message = (
									<Message
										refMessage={
											(el) => el && this.setWidth(
												el
											)
										}
										key={item.time}
										time={item.time}
										avatar={(item.sender === 'response' ?
											item.picture : myPicture) || EmptyAvatar
										}
										name={item.name}
										text={item.text}
										isseen={item.isRead}
										sender={me.id === item.peerId ?
											'client' : item.sender
										}
										self={item.sender === 'client'}
										format={format}
									/>);

								return message;
							}

							else if (item.type === 'file')
							{

								// let displayName;

								let filePicture;

								if (me.id === item.peerId)
								{
									/*
									displayName = intl.formatMessage({
										id             : 'room.me',
										defaultMessage : 'Me'
									});
									*/

									filePicture = me.picture;
								}
								else if (peers[item.peerId])
								{
									// displayName = peers[item.peerId].displayName;

									filePicture = peers[item.peerId].picture;
								}
								else
								{
									/*
									displayName = intl.formatMessage({
										id             : 'label.unknown',
										defaultMessage : 'Unknown'
									});
									*/
								}

								return (
									<File
										refMessage={
											(el) => el && this.setWidth(
												el
											)
										}
										key={item.time}
										time={item.time}
										magnetUri={item.magnetUri}
										name={item.name}
										avatar={filePicture || EmptyAvatar}
										isseen={item.isRead}
										sender={me.id === item.peerId ?
											'client' : item.sender
										}
										self={item.sender === 'client'}
										format={format}

									/>
								);

							}

							return 0;
						})
					}

				</div>
			</React.Fragment>
		);
	}
}

MessageList.propTypes =
{
	chat      : PropTypes.object,
	myPicture : PropTypes.string,
	classes   : PropTypes.object.isRequired,

	files            : PropTypes.object.isRequired,
	me               : appPropTypes.Me.isRequired,
	peers            : PropTypes.object.isRequired,
	intl             : PropTypes.object.isRequired,
	setIsScrollEnd   : PropTypes.func.isRequired,
	setIsMessageRead : PropTypes.func.isRequired

};

const mapStateToProps = (state) =>
	({
		chat      : state.chat,
		myPicture : state.me.picture,
		me        : state.me,
		peers     : state.peers,
		files     : state.files

	});

const mapDispatchToProps = (dispatch) =>
	({
		setIsScrollEnd : (flag) =>
		{
			dispatch(chatActions.setIsScrollEnd(flag));
		},
		setIsMessageRead : (id, isRead) =>
		{
			dispatch(chatActions.setIsMessageRead(id, isRead));
		}
	});

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.chat === next.chat &&
				prev.files === next.files &&
				prev.me.picture === next.me.picture &&
				prev.me === next.me &&
				prev.peers === next.peers
			);
		}
	}
)(withStyles(styles)(injectIntl(MessageList)));

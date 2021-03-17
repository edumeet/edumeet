import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { injectIntl } from 'react-intl';
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

		this.refMessage = React.createRef();

		this.isMessageSeen= this.isMessageSeen.bind(this);

		this.state = { width: 0 };
	}

	componentDidMount()
	{
		this.refList.current.addEventListener('scroll', this.handleSetScrollEnd);

		this.refList.current.addEventListener('scroll', this.handleIsMesagesSeen);
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

		this.setAreNewMessages(prevProps);

		this.setCurrWidth();
	}

	handleSetScrollEnd = () =>
	{
		this.setIsScrollEnd();
	}

	handleIsMesagesSeen = (e) =>
	{
		this.isMessageSeen(e);
	}

	setCurrWidth = () =>
	{
		let width = 0;

		if (this.props.chat.messages.length !== 0)
		{
			width = this.refMessage.current.offsetWidth;

			if (width > this.state.width)
				this.setState({ width: width });
		}

		else if (this.state.width !== 0)
			this.setState({ width: 0 });
	}

	setAreNewMessages = (prevProps) =>
	{
		if (
			this.props.chat.messages.length + this.props.files.length > 0 &&
			this.props.chat.isScrollEnd === false &&
			(
				this.props.chat.messages.length !== prevProps.chat.messages.length ||
				this.props.files.length !== prevProps.files.length
			)
		)
			this.props.setAreNewMessages(true);

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

		if (this.props.chat.isScrollEnd)
			this.props.setAreNewMessages(false);

	}

	isMessageSeen = () =>
	{
		const list = this.refList.current;

		const listRect = list.getBoundingClientRect();

		const items = [ ...list.childNodes ];

		items.forEach((item) =>
		{
			const itemRect = item.getBoundingClientRect();

			const isSeen = itemRect.top <= listRect.bottom;

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
			intl,
			settings
		} = this.props;

		const items = [ ...chat.messages, ...files ];

		items.sort((a, b) => (a.time < b.time ? -1: 1));

		if (items.length > 0)
		{
			if (chat.order === 'asc')
				items.sort();
			else
			if (chat.order === 'desc')
				items.reverse();
		}

		let prevName = null;

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
								chat.areNewMessages ? 'show': 'hide',
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
						( {chat.countUnread} ) New Messages
					</Button>

					{items.length === 0
						? (<div>
							{intl.formatMessage({
								id             : 'label.chatNoMessages',
								defaultMessage : 'No messages'
							})}

						</div>)
						:
						items.map((item) =>
						{
							if (item.type === 'message')
							{
								const picture = (item.sender === 'response' ?
									item.picture : myPicture) || EmptyAvatar;

								const message = (
									<Message
										refMessage={this.refMessage}
										key={item.time}
										self={item.sender === 'client'}
										avatar={picture}
										text={item.text}
										time={item.time}
										name={item.name}
										isseen={item.isRead}
										sender={settings.displayName === item.name ?
											'client' : item.sender
										}
										sameName={prevName === item.name ? true : false}
										width={this.state.width}
									/>);

								prevName = item.name;

								return message;
							}

							else if (item.type === 'file')
							{

								let displayName;

								let filePicture;

								if (me.id === item.peerId)
								{
									displayName = intl.formatMessage({
										id             : 'room.me',
										defaultMessage : 'Me'
									});
									filePicture = me.picture;
								}
								else if (peers[item.peerId])
								{
									displayName = peers[item.peerId].displayName;
									filePicture = peers[item.peerId].picture;
								}
								else
								{
									displayName = intl.formatMessage({
										id             : 'label.unknown',
										defaultMessage : 'Unknown'
									});
								}

								return (
									<File
										key={item.time}
										time={item.time}
										magnetUri={item.magnetUri}
										displayName={displayName}
										picture={filePicture || EmptyAvatar}
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

	files             : PropTypes.object.isRequired,
	settings          : PropTypes.object.isRequired,
	me                : appPropTypes.Me.isRequired,
	peers             : PropTypes.object.isRequired,
	intl              : PropTypes.object.isRequired,
	setIsScrollEnd    : PropTypes.func.isRequired,
	setAreNewMessages : PropTypes.func.isRequired,
	setIsMessageRead  : PropTypes.func.isRequired

};

const mapStateToProps = (state) =>
	({
		chat      : state.chat,
		myPicture : state.me.picture,
		me        : state.me,
		peers     : state.peers,
		files     : state.files,
		settings  : state.settings

	});

const mapDispatchToProps = (dispatch) =>
	({
		setIsScrollEnd : (flag) =>
		{
			dispatch(chatActions.setIsScrollEnd(flag));
		},
		setAreNewMessages : (flag) =>
		{
			dispatch(chatActions.setAreNewMessages(flag));
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
				prev.peers === next.peers &&
				prev.settings === next.settings
			);
		}
	}
)(withStyles(styles)(injectIntl(MessageList)));

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { FormattedTime, injectIntl } from 'react-intl';
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
		'buttonGoToNewest' :
		{
			position     : 'fixed',
			borderRadius : '50px'
		},
		'asc' : {
			bottom : '100px'
		},
		'desc' :
		{
			top : '130px'
		}

	});

class MessageList extends React.Component
{
	constructor(props)
	{
		super(props);

		this.ref = React.createRef();
	}

	componentDidMount()
	{
		this.ref.current.addEventListener('scroll', () => this.handleSetIsScrollEnd());
	}

	componentDidUpdate(prevProps)
	{
		if (this.props.chat.isScrollEnd)
			this.handleGoToNewest();

		if (prevProps.chat.order !== this.props.chat.order)
		{
			this.handleSetIsScrollEnd();
			this.handleGoToNewest();
		}

		this.handleSetAreNewMessages(prevProps);
	}

	handleSetAreNewMessages(prevProps)
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

	handleSetIsScrollEnd()
	{
		let isScrollEnd = undefined;

		if (this.props.chat.order === 'asc')
			isScrollEnd = (
				Math.abs(
					Math.floor(this.ref.current.scrollTop) +
					this.ref.current.offsetHeight -
					this.ref.current.scrollHeight

				) < 2
			);
		else
		if (this.props.chat.order === 'desc')
			isScrollEnd = (this.ref.current.scrollTop === 0 ? true : false);

		this.props.goToNewestMessages(isScrollEnd);

		if (this.props.chat.isScrollEnd)
			this.props.setAreNewMessages(false);

	}

	handleGoToNewest()
	{
		if (this.props.chat.order === 'asc')
			this.ref.current.scrollTop = this.ref.current.scrollHeight;
		else
		if (this.props.chat.order === 'desc')
			this.ref.current.scrollTop = 0;
	}

	getTimeString(time)
	{
		return (<FormattedTime value={new Date(time)} />);
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

		return (
			<React.Fragment>
				<div id='chatList' className={classes.root} ref={this.ref}>
					{this.props.chat.areNewMessages ?
						<Button
							variant='contained'
							color='primary'
							size='small'
							onClick={() => this.handleGoToNewest()}
							className={
								classnames(
									classes.buttonGoToNewest,
									(chat.order === 'asc' ? classes.asc : classes.desc)
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
							New Messages
						</Button>
						: null
					}

					{items.length === 0
						? (<div>
							{intl.formatMessage({
								id             : 'label.chatNoMessages',
								defaultMessage : 'No messages'
							})}

						</div>)
						: ''
					}
					{

						items.map((item) =>
						{
							if (item.type === 'message')
							{
								const picture = (item.sender === 'response' ?
									item.picture : myPicture) || EmptyAvatar;

								return (
									<Message
										key={item.time}
										self={item.sender === 'client'}
										picture={picture}
										text={item.text}
										time={this.getTimeString(item.time)}
										name={item.name}
									/>
								);
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

	files              : PropTypes.object.isRequired,
	me                 : appPropTypes.Me.isRequired,
	peers              : PropTypes.object.isRequired,
	intl               : PropTypes.object.isRequired,
	goToNewestMessages : PropTypes.func.isRequired,
	setAreNewMessages  : PropTypes.func.isRequired

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
		goToNewestMessages : (flag) =>
		{
			dispatch(chatActions.goToNewestMessages(flag));
		},
		setAreNewMessages : (flag) =>
		{
			dispatch(chatActions.setAreNewMessages(flag));
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

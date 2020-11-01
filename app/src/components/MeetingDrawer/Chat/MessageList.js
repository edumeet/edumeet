import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { FormattedTime, injectIntl } from 'react-intl';
import Message from './Message';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';

import * as appPropTypes from '../../appPropTypes';

import File from '../FileSharing/File';

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
		}
	});

class MessageList extends React.Component
{
	componentDidMount()
	{
		this.node.scrollTop = this.node.scrollHeight;
	}

	getSnapshotBeforeUpdate()
	{
		return this.node.scrollTop
			+ this.node.offsetHeight === this.node.scrollHeight;
	}

	shouldComponentUpdate(nextProps)
	{
		if (nextProps.chat.length !== this.props.chat.length)
			return true;

		return false;
	}

	componentDidUpdate(prevProps, prevState, shouldScroll)
	{
		if (shouldScroll)
		{
			this.node.scrollTop = this.node.scrollHeight;
		}
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

		// console.log('Chat1:', chat);
		// console.log('Files1:', files);

		const chatNew = [];

		const filesNew = [];

		chat.map((message, index) => { chatNew[message.time] = message; });

		// { Object.entries(files).map(([ magnetUri, file ]) => { filesNew[file[magnetUri][time]] = file })}
		// { Object.entries(files).map(([ magnetUri, file ]) => { filesNew[file.time] = file })}
		{ Object.entries(files)
			.map(([ magnetUri, file ]) => { filesNew[file.time] = file; }); }

		// allNew = chatNew.concat(filesNew)

		// console.log("chatNew", chatNew)

		// console.log("filesNew", filesNew)

		// var allNew = [...chatNew, ...filesNew];

		const allNew = { ...chatNew, ...filesNew };

		const ordered = {};

		Object.keys(allNew).sort()
			.forEach(function(key)
			{
				ordered[key] = allNew[key];
			});

		// console.log('ordered1', ordered);

		// console.log("isArr", Array.isArray(chatNew) )
		// console.log("Files1", files)

		return (
			<React.Fragment>
				<div className={classes.root} ref={(node) => { this.node = node; }}>
					{
						Object.entries(ordered).map(([ index, item ]) =>
						{
						// console.log("Item1", item)

							if (item.type === 'message')
							{

								const picture = (item.sender === 'response' ?
									item.picture : myPicture) || EmptyAvatar;

								return (
									<Message
										key={index}
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
										key={item.magnetUri}
										magnetUri={item.magnetUri}
										displayName={displayName}
										picture={filePicture || EmptyAvatar}
									/>
								);

							}

						})
					}

					{/* {
					chat.map((message, index) =>
					{
						const picture = (message.sender === 'response' ?
							message.picture : myPicture) || EmptyAvatar;

						return (
							<Message
								key={index}
								self={message.sender === 'client'}
								picture={picture}
								text={message.text}
								time={this.getTimeString(message.time)}
								name={message.name}
							/>
						);
					})
				} */}

					{/* { Object.entries(files).map(([ magnetUri, file ]) =>
				{
					let displayName;

					let filePicture;

					if (me.id === file.peerId)
					{
						displayName = intl.formatMessage({
							id             : 'room.me',
							defaultMessage : 'Me'
						});
						filePicture = me.picture;
					}
					else if (peers[file.peerId])
					{
						displayName = peers[file.peerId].displayName;
						filePicture = peers[file.peerId].picture;
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
							key={magnetUri}
							magnetUri={magnetUri}
							displayName={displayName}
							picture={filePicture || EmptyAvatar}
						/>
					);
				})} */}
				</div>
			</React.Fragment>
		);
	}
}

MessageList.propTypes =
{
	chat      : PropTypes.array,
	myPicture : PropTypes.string,
	classes   : PropTypes.object.isRequired,

	files : PropTypes.object.isRequired,
	me    : appPropTypes.Me.isRequired,
	peers : PropTypes.object.isRequired,
	intl  : PropTypes.object.isRequired

};

const mapStateToProps = (state) =>
	({
		chat      : state.chat,
		myPicture : state.me.picture,

		files : state.files,
		me    : state.me,
		peers : state.peers

	});

export default connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.chat === next.chat &&
				prev.me.picture === next.me.picture &&

				prev.files === next.files &&
				prev.me === next.me &&
				prev.peers === next.peers
			);
		}
	}
// )(withStyles(styles)(MessageList));
)(withStyles(styles)(injectIntl(MessageList)));
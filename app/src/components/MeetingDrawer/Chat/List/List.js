import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { FormattedTime, injectIntl } from 'react-intl';
import * as appPropTypes from '../../../appPropTypes';

import Message from './Item/Message';
import File from './Item/File';
import EmptyAvatar from '../../../../images/avatar-empty.jpeg';

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
		if (
			nextProps.chat.length !== this.props.chat.length ||
			nextProps.files !== this.props.files
		)
		{
			return true;
		}

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

		const items = [ ...chat, ...files ];

		items.sort((a, b) => (a.time < b.time ? -1: 1));

		return (
			<React.Fragment>
				<div id='chatList' className={classes.root} ref={(node) => { this.node = node; }}>
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

						})
					}

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
		me        : state.me,
		peers     : state.peers,
		files     : state.files

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
				prev.files === next.files &&
				prev.me.picture === next.me.picture &&
				prev.me === next.me &&
				prev.peers === next.peers
			);
		}
	}
// )(withStyles(styles)(MessageList));
)(withStyles(styles)(injectIntl(MessageList)));
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import ChatModerator from './ChatModerator';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const styles = () =>
	({
		root :
		{
			display       : 'flex',
			flexDirection : 'column',
			width         : '100%',
			height        : '100%',
			overflowY     : 'auto'
		}
	});

const Chat = (props) =>
{
	const {
		classes
	} = props;

	return (
		<Paper className={classes.root}>
			<ChatModerator />
			<MessageList />
			<ChatInput />
		</Paper>
	);
};

Chat.propTypes =
{
	classes : PropTypes.object.isRequired
};

export default withStyles(styles)(Chat);
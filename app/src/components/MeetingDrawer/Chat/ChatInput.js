import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
import { useIntl } from 'react-intl';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import SendIcon from '@material-ui/icons/Send';

const styles = (theme) =>
	({
		root :
		{
			padding      : theme.spacing(1),
			display      : 'flex',
			alignItems   : 'center',
			borderRadius : 0
		},
		input :
		{
			marginLeft : 8,
			flex       : 1
		},
		iconButton :
		{
			padding : 10
		}
	});

const ChatInput = (props) =>
{
	const [ message, setMessage ] = useState('');

	const intl = useIntl();

	const createNewMessage = (text, sender, name, picture) =>
		({
			type : 'message',
			text,
			time : Date.now(),
			name,
			sender,
			picture
		});

	const handleChange = (e) =>
	{
		setMessage(e.target.value);
	};

	const {
		roomClient,
		displayName,
		picture,
		classes
	} = props;

	return (
		<Paper className={classes.root}>
			<InputBase
				className={classes.input}
				placeholder={intl.formatMessage({
					id             : 'label.chatInput',
					defaultMessage : 'Enter chat message...'
				})}
				value={message || ''}
				onChange={handleChange}
				onKeyPress={(ev) =>
				{
					if (ev.key === 'Enter')
					{
						ev.preventDefault();

						if (message && message !== '')
						{
							const sendMessage = createNewMessage(message, 'response', displayName, picture);

							roomClient.sendChatMessage(sendMessage);

							setMessage('');
						}
					}
				}}
				autoFocus
			/>
			<IconButton
				color='primary'
				className={classes.iconButton}
				aria-label='Send'
				onClick={() =>
				{
					if (message && message !== '')
					{
						const sendMessage = createNewMessage(message, 'response', displayName, picture);

						roomClient.sendChatMessage(sendMessage);

						setMessage('');
					}
				}}
			>
				<SendIcon />
			</IconButton>
		</Paper>
	);
};

ChatInput.propTypes =
{
	roomClient  : PropTypes.object.isRequired,
	displayName : PropTypes.string,
	picture     : PropTypes.string,
	classes     : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		displayName : state.settings.displayName,
		picture     : state.me.picture
	});

export default withRoomContext(
	connect(
		mapStateToProps,
		null,
		null,
		{
			areStatesEqual : (next, prev) =>
			{
				return (
					prev.settings.displayName === next.settings.displayName &&
					prev.me.picture === next.me.picture
				);
			}
		}
	)(withStyles(styles)(ChatInput))
);
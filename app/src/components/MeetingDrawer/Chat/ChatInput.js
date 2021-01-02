import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
import { useIntl } from 'react-intl';
import { permissions } from '../../../permissions';
import { makePermissionSelector } from '../../Selectors';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import SendIcon from '@material-ui/icons/Send';
import AttachFileIcon from '@material-ui/icons/AttachFile';

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
			marginLeft     : 8,
			flex           : 1,
			'&[type=file]' : {
				display : 'none'
			}
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

	const handleFileChange = async (event) =>
	{
		if (event.target.files.length > 0)
		{
			await props.roomClient.shareFiles(event.target.files);
		}
	};

	const {
		roomClient,
		displayName,
		picture,
		canChat,
		canShare,
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
				disabled={!canChat}
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
				className={classes.iconButton}
				color='primary'
				aria-label='Share file'
				onChange={handleFileChange}
				disabled={!canShare}
				// onClick={(e) => (e.target.value = null)}
			>
				<input
					id='contained-button-file'
					className={classes.input}
					type='file'
					multiple
				/>
				<label htmlFor='contained-button-file'>
					<AttachFileIcon />
				</label>

				{/*
				<input
					className={classes.input}
					type='file'
					disabled={!canShare}
					onChange={handleFileChange}
					// Need to reset to be able to share same file twice
					onClick={(e) => (e.target.value = null)}
					id='share-files-button'
				/>
				*/}
			</IconButton>

			<IconButton
				color='primary'
				className={classes.iconButton}
				aria-label='Send'
				disabled={!canChat}
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
	canChat     : PropTypes.bool.isRequired,
	canShare    : PropTypes.bool.isRequired,
	classes     : PropTypes.object.isRequired
};

const makeMapStateToProps = () =>
{
	const hasPermission = makePermissionSelector(permissions.SEND_CHAT);

	const mapStateToProps = (state) =>
		({
			displayName : state.settings.displayName,
			picture     : state.me.picture,
			canChat     : hasPermission(state),
			canShare    : hasPermission(state)
		});

	return mapStateToProps;
};

export default withRoomContext(
	connect(
		makeMapStateToProps,
		null,
		null,
		{
			areStatesEqual : (next, prev) =>
			{
				return (
					prev.room === next.room &&
					prev.me.roles === next.me.roles &&
					prev.peers === next.peers &&
					prev.settings.displayName === next.settings.displayName &&
					prev.me.picture === next.me.picture
				);
			}
		}
	)(withStyles(styles)(ChatInput))
);
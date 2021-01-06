import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../../RoomContext';
import { useIntl } from 'react-intl';
import { permissions } from '../../../../permissions';
import { makePermissionSelector } from '../../../Selectors';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import SendIcon from '@material-ui/icons/Send';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import PhotoCamera from '@material-ui/icons/PhotoCamera';
import SaveIcon from '@material-ui/icons/Save';

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

	const handleMessage = (e) =>
	{
		setMessage(e.target.value);
	};

	const handleFile = async (event) =>
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
		classes,
		browser,
		canShareFiles

	} = props;

	return (
		<Paper className={classes.root}>
			{/* Input message field */}
			<InputBase
				className={classes.input}
				placeholder={intl.formatMessage({
					id             : 'label.chatInput',
					defaultMessage : 'Enter chat message...'
				})}
				value={message || ''}
				disabled={!canChat}
				onChange={handleMessage}
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

			{/* Button save chat */}
			<React.Fragment>
				<input
					className={classes.input}
					type='file'
					disabled={!canShare}
					onChange={handleFile}
					accept='image/*'
					id='save-chat-button'
				/>

				<label htmlFor='save-chat-button'>

					<IconButton
						className={classes.IconButton}
						disabled={!canShareFiles || !canShare}
						aria-label='Share gallery file'
						component='span'
					>
						<SaveIcon />
					</IconButton>
				</label>
			</React.Fragment>

			{/* Button for file sharing */}
			<React.Fragment>
				<input
					id='contained-button-file'
					className={classes.input}
					disabled={!canShare}
					type='file'
					multiple
					onChange={handleFile}
				/>
				<label htmlFor='contained-button-file'>
					<IconButton
						className={classes.iconButton}
						color='primary'
						aria-label='Share file'
						disabled={!canShareFiles || !canShare}
						component='span'
					// onClick={(e) => (e.target.value = null)}
					>
						<AttachFileIcon />
					</IconButton>
				</label>
			</React.Fragment>

			{/* Button for gallery file sharing (mobile) */}
			{(browser.platform === 'mobile') && canShareFiles && canShare &&
			<React.Fragment>
				<input
					className={classes.input}
					type='file'
					disabled={!canShare}
					onChange={handleFile}
					accept='image/*'
					id='share-files-gallery-button'
				/>

				<label htmlFor='share-files-gallery-button'>

					<IconButton
						className={classes.IconButton}
						disabled={!canShareFiles || !canShare}
						aria-label='Share gallery file'
						component='span'
					>
						<PhotoCamera />
					</IconButton>
				</label>
			</React.Fragment>
			}

			{/* Button send message */}
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
	roomClient    : PropTypes.object.isRequired,
	displayName   : PropTypes.string,
	picture       : PropTypes.string,
	canChat       : PropTypes.bool.isRequired,
	canShare      : PropTypes.bool.isRequired,
	classes       : PropTypes.object.isRequired,
	browser       : PropTypes.object.isRequired,
	canShareFiles : PropTypes.bool.isRequired
};

const makeMapStateToProps = () =>
{
	const hasPermission = makePermissionSelector(permissions.SEND_CHAT);

	const mapStateToProps = (state) =>
		({
			displayName   : state.settings.displayName,
			picture       : state.me.picture,
			canChat       : hasPermission(state),
			canShare      : hasPermission(state),
			browser       : state.me.browser,
			canShareFiles : state.me.canShareFiles
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
					prev.me.browser === next.me.browser &&
					prev.me.roles === next.me.roles &&
					prev.me.canShareFiles === next.me.canShareFiles &&
					prev.peers === next.peers &&
					prev.settings.displayName === next.settings.displayName &&
					prev.me.picture === next.me.picture
				);
			}
		}
	)(withStyles(styles)(ChatInput))
);
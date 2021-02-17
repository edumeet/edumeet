import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../../RoomContext';
import { useIntl } from 'react-intl';
import { permissions } from '../../../../permissions';
import { makePermissionSelector } from '../../../Selectors';
import Paper from '@material-ui/core/Paper';
import { Grid } from '@material-ui/core';
import { Editor, EditorState, RichUtils, ContentState } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import 'draft-js/dist/Draft.css';
import InputBase from '@material-ui/core/InputBase';
import Divider from '@material-ui/core/Divider';

import IconButton from '@material-ui/core/IconButton';
import SendIcon from '@material-ui/icons/Send';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import PhotoCamera from '@material-ui/icons/PhotoCamera';
import SaveIcon from '@material-ui/icons/Save';
import FormatBoldIcon from '@material-ui/icons/FormatBold';
import FormatItalicIcon from '@material-ui/icons/FormatItalic';
import FormatUnderlinedIcon from '@material-ui/icons/FormatUnderlined';

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
			// marginLeft     : 8,
			flex           : 1,
			'&[type=file]' : {
				display : 'none'
			},
			padding         : '8px 4px',
			'line-height'   : '20px',
			'font-size'     : '16px',
			'width'         : '50px',
			'overflow-wrap' : 'break-word'
		},
		icon : {
			padding : theme.spacing(1)
		}
	});

const ChatInput = (props) =>
{
	const intl = useIntl();

	const [ message, setMessage ] = useState('');

	const [ editorState, setEditorState ] = React.useState(
		() => EditorState.createEmpty()
	);

	const createNewMessage = (text, sender, name, picture) =>
		({
			type : 'message',
			text,
			time : Date.now(),
			name,
			sender,
			picture
		});

	/* 
	const handleMessage = (e) =>
		setMessage(e);
	 */

	const handleKeyCommand = (command) =>
	{
		const newState = RichUtils.handleKeyCommand(editorState, command);

		if (newState)
		{
			setEditorState(newState);

			return 'handled';
		}

		return 'not-handled';
	};

	const handleUnderlineClick = () =>
		setEditorState(RichUtils.toggleInlineStyle(editorState, 'UNDERLINE'));

	const handleBoldClick = () =>
		setEditorState(RichUtils.toggleInlineStyle(editorState, 'BOLD'));

	const handleItalicClick = () =>
		setEditorState(RichUtils.toggleInlineStyle(editorState, 'ITALIC'));

	const handleClearInput = () =>
		setEditorState(EditorState.push(editorState, ContentState.createFromText('')));

	const {
		roomClient,
		displayName,
		picture,
		canChat,
		canShare,
		classes,
		browser,
		canShareFiles,
		list,
		chat,
		files

	} = props;

	const handleSendMessage = () =>
	{
		if (message && message !== '')
		{
			const sendMessage = createNewMessage(message, 'response', displayName, picture);

			roomClient.sendChatMessage(sendMessage);

			setMessage('');

			handleClearInput();
		}
	};

	useEffect(() =>
	{
		const res = stateToHTML(editorState.getCurrentContent(), {
			defaultBlockTag : null
		});

		setMessage(res);

	}, [ editorState ]);

	const handleFile = async (event) =>
	{
		if (event.target.files.length > 0)
			await props.roomClient.shareFiles(event.target.files);
	};

	const chatItemsLength = files.length + chat.length;

	return (
		<Paper className={classes.root}>
			{/* Input message field */}
			{/*
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
			*/}

			<Grid container direction='column'>

				<Grid item container direction='row' alignItems='center'>
					{/* Input field */}
					<div className={classes.input}>
						<Editor
							placeholder={intl.formatMessage({
								id             : 'label.chatInput',
								defaultMessage : 'Enter chat message...'
							})}
							editorState={editorState}
							// eslint-disable-next-line
							handleKeyCommand={handleKeyCommand}
							onChange={setEditorState}
							// autoFocus
						/>
					</div>

					{/* Button send message */}
					<IconButton
						size='small'
						classes={{ sizeSmall: classes.icon }}
						color='primary'
						aria-label='Send'
						// disabled={!canChat || !message}
						onClick={handleSendMessage}
					>
						<SendIcon />
					</IconButton>
					{/* /Button send message */}

				</Grid>

				<Grid item>
					<Divider orientation='horizontal'/>
				</Grid>

				{/* Format buttons */}
				<Grid item container justify='space-between'>
					<Grid item>
						<IconButton
							size='small'
							classes={{ sizeSmall: classes.icon }}
							// disabled={disabled}
							// aria-label='Share gallery file'
							component='span'
							onClick={handleBoldClick}
						>
							<FormatBoldIcon />
						</IconButton>
						<IconButton
							size='small'
							classes={{ sizeSmall: classes.icon }}
							// disabled={disabled}
							// aria-label='Share gallery file'
							component='span'
							onClick={handleItalicClick}
						>
							<FormatItalicIcon />
						</IconButton>
						<IconButton
							size='small'
							classes={{ sizeSmall: classes.icon }}
							// disabled={disabled}
							// aria-label='Share gallery file'
							component='span'
							onClick={handleUnderlineClick}
						>
							<FormatUnderlinedIcon />
						</IconButton>
						{/* /Format buttons */}
					</Grid>
					<Grid item>

						{/* Button save chat */}
						<React.Fragment>
							<IconButton
								size='small'
								classes={{ sizeSmall: classes.icon }}
								disabled={!canShareFiles || !canShare || chatItemsLength === 0}
								aria-label='Share gallery file'
								component='span'
								onClick={() => roomClient.saveChat()
								}
							>
								<SaveIcon />

							</IconButton>
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
									size='small'
									classes={{ sizeSmall: classes.icon }}
									color='primary'
									aria-label='Share file'
									disabled={!canShareFiles || !canShare}
									component='span'
								// onClick={(e) => (e.target.value = null)}
								>
									<AttachFileIcon
										size='small'
									/>
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
									size='small'
									classes={{ sizeSmall: classes.icon }}
									disabled={!canShareFiles || !canShare}
									aria-label='Share gallery file'
									component='span'
								>
									<PhotoCamera />
								</IconButton>
							</label>
						</React.Fragment>

						}
					</Grid>

				</Grid>

			</Grid>

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
	canShareFiles : PropTypes.bool.isRequired,
	list          : PropTypes.isRequired,
	chat          : PropTypes.isRequired,
	files         : PropTypes.isRequired
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
			canShareFiles : state.me.canShareFiles,
			chat          : state.chat,
			files         : state.files
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
					prev.me.picture === next.me.picture &&
					prev.chat === next.chat &&
					prev.files === next.files
				);
			}
		}
	)(withStyles(styles)(ChatInput))
);
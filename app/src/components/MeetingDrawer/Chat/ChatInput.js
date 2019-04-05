import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import SendIcon from '@material-ui/icons/Send';

const styles = (theme) =>
	({
		root :
		{
			padding      : theme.spacing.unit,
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

class ChatInput extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			message : ''
		};
	}

	createNewMessage = (text, sender, name, picture) =>
		({
			type : 'message',
			text,
			time : Date.now(),
			name,
			sender,
			picture
		});

	handleChange = (e) =>
	{
		this.setState({ message: e.target.value });
	}

	render()
	{
		const {
			roomClient,
			displayName,
			picture,
			classes
		} = this.props;
	
		return (
			<Paper className={classes.root}>
				<InputBase
					className={classes.input}
					placeholder='Enter chat message...'
					value={this.state.message || ''}
					onChange={this.handleChange}
					onKeyPress={(ev) =>
					{
						if (ev.key === 'Enter')
						{
							ev.preventDefault();

							if (this.state.message && this.state.message !== '')
							{
								const message = this.createNewMessage(this.state.message, 'response', displayName, picture);

								roomClient.sendChatMessage(message);

								this.setState({ message: '' });
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
						if (this.state.message && this.state.message !== '')
						{
							const message = this.createNewMessage(this.state.message, 'response', displayName, picture);

							roomClient.sendChatMessage(message);

							this.setState({ message: '' });
						}
					}}
				>
					<SendIcon />
				</IconButton>
			</Paper>
		);
	}
}

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
		picture     : state.settings.picture
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
					prev.settings.picture === next.settings.picture
				);
			}
		}
	)(withStyles(styles)(ChatInput))
);
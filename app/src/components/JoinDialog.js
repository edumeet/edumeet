import React, { useState } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../RoomContext';
import * as stateActions from '../actions/stateActions';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import Typography from '@material-ui/core/Typography';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

const styles = (theme) =>
	({
		root :
		{
			display              : 'flex',
			width                : '100%',
			height               : '100%',
			backgroundColor      : 'var(--background-color)',
			backgroundImage      : `url(${window.config.background})`,
			backgroundAttachment : 'fixed',
			backgroundPosition   : 'center',
			backgroundSize       : 'cover',
			backgroundRepeat     : 'no-repeat'
		},
		dialogPaper :
		{
			width                          : '20vw',
			padding                        : theme.spacing(2),
			[theme.breakpoints.down('lg')] :
			{
				width : '30vw'
			},
			[theme.breakpoints.down('md')] :
			{
				width : '40vw'
			},
			[theme.breakpoints.down('sm')] :
			{
				width : '60vw'
			},
			[theme.breakpoints.down('xs')] :
			{
				width : '80vw'
			}
		},
		logo :
		{
			display : 'block'
		}
	});

const JoinDialog = ({
	roomClient,
	displayName,
	loginEnabled,
	changeDisplayName,
	classes
}) =>
{
	const [ localDisplayName, setLocalDisplayName ] = useState(displayName);

	const handleKeyDown = (event) =>
	{
		const { key } = event;

		switch (key)
		{
			case 'Enter':
			case 'Escape':
			{
				if (localDisplayName !== '') // Don't allow empty displayName
					changeDisplayName(localDisplayName);
				else
					setLocalDisplayName(displayName);
				break;
			}
			default:
				break;
		}
	};

	return (
		<div className={classes.root}>
			<Dialog
				open
				classes={{
					paper : classes.dialogPaper
				}}
			>
				{ window.config.logo &&
					<img alt='Logo' className={classes.logo} src={window.config.logo} />
				}
				<Typography variant='h2' align='center'>
					Welcome
				</Typography>
				<Typography variant='h6'>
					You are about to join a meeting.
					Set the name that others will see,
					and choose how you want to join?
				</Typography>
				<TextField
					id='displayname'
					label='Your name'
					className={classes.textField}
					value={localDisplayName}
					onChange={(event) =>
					{
						const { value } = event.target;

						setLocalDisplayName(value);
					}}
					onKeyDown={handleKeyDown}
					onBlur={() =>
					{
						if (localDisplayName !== displayName)
							changeDisplayName(localDisplayName);
					}}
					margin='normal'
				/>
				<DialogActions>
					{ loginEnabled &&
						<Button
							onClick={() =>
							{
								roomClient.login();
							}}
							variant='contained'
							color='secondary'
						>
							Sign in
						</Button>
					}
					<Button
						onClick={() =>
						{
							roomClient.join({ joinVideo: false });
						}}
						variant='contained'
						color='secondary'
					>
						Audio only
					</Button>
					<Button
						onClick={() =>
						{
							roomClient.join({ joinVideo: true });
						}}
						variant='contained'
						color='secondary'
					>
						Audio and Video
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
};

JoinDialog.propTypes =
{
	roomClient        : PropTypes.any.isRequired,
	displayName       : PropTypes.string.isRequired,
	loginEnabled      : PropTypes.string.isRequired,
	changeDisplayName : PropTypes.func.isRequired,
	classes           : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		displayName  : state.settings.displayName,
		loginEnabled : state.me.loginEnabled
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		changeDisplayName : (displayName) =>
		{
			dispatch(stateActions.setDisplayName(displayName));
		}
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.settings.displayName === next.settings.displayName
			);
		}
	}
)(withStyles(styles)(JoinDialog)));
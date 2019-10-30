import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../RoomContext';
import * as stateActions from '../actions/stateActions';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Avatar from '@material-ui/core/Avatar';
import Typography from '@material-ui/core/Typography';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import CookieConsent from 'react-cookie-consent';

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
		title :
		{
			position   : 'relative',
			alignItems : 'center',
			display    : 'flex',
			marginLeft : 0
		},
		actionButtons :
		{
			right    : 0,
			position : 'absolute'
		},
		logo :
		{
			display : 'block'
		},
		green :
		{
			color : 'rgba(0,255,0,1)'
		}
	});

const JoinDialog = ({
	roomClient,
	room,
	displayName,
	loginEnabled,
	loggedIn,
	myPicture,
	changeDisplayName,
	classes
}) =>
{
	const handleKeyDown = (event) =>
	{
		const { key } = event;

		switch (key)
		{
			case 'Enter':
			case 'Escape':
			{
				if (displayName === '')
					changeDisplayName('Guest');
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
				<DialogTitle disableTypography className={classes.title}> 
					{ window.config.logo && <img alt='Logo' className={classes.logo} src={window.config.logo} /> }
					<div className={classes.title}>
						<Typography variant='h4'>
							{ window.config.title } 
						</Typography>
					</div>
					<div className={classes.grow} />
					<div className={classes.actionButtons}>
						{ loginEnabled &&
							<IconButton
								aria-label='Account'
								className={classes.actionButton}
								color='inherit'
								onClick={() => 
								{
									loggedIn ? roomClient.logout() : roomClient.login();
								}}
							>
								{ myPicture ?
									<Avatar src={myPicture} />
									:
									<AccountCircle />
								}
							</IconButton>
						}
					</div>
				</DialogTitle>
				{ window.config.logo &&
					<img alt='Logo' className={classes.logo} src={window.config.logo} />
				}
				<Typography variant='h6'>
					You are about to join a meeting.
				</Typography>
				<Typography variant='h5'>
					<center> Room ID: { room.name } </center>
				</Typography>
				<Typography variant='h6'>
					Set your name for participation,
					and choose how you want to join:
				</Typography>

				<TextField
					id='displayname'
					label='Your name'
					className={classes.textField}
					value={displayName}
					onChange={(event) =>
					{
						const { value } = event.target;

						changeDisplayName(value);
					}}
					onKeyDown={handleKeyDown}
					onBlur={() =>
					{
						if (displayName === '')
							changeDisplayName('Guest');
						if (room.inLobby) roomClient.changeDisplayName(displayName);
					}}
					margin='normal'
				/>

				{ !room.inLobby ?
					<DialogActions>
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
					: 
					<Typography variant='h6'>
						<div className={classes.green}> Ok, you are ready</div> 
						The room is looked - hang on until somebody lets you in ...
					</Typography>
				}

				<CookieConsent>
					This website uses cookies to enhance the user experience.
				</CookieConsent>
			</Dialog>
		</div>
	);
};

JoinDialog.propTypes =
{
	roomClient        : PropTypes.any.isRequired,
	room              : PropTypes.object.isRequired,
	displayName       : PropTypes.string.isRequired,
	loginEnabled      : PropTypes.bool.isRequired,
	loggedIn          : PropTypes.bool.isRequired,
	myPicture         : PropTypes.string,
	changeDisplayName : PropTypes.func.isRequired,
	classes           : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		room         : state.room,
		displayName  : state.settings.displayName,
		loginEnabled : state.me.loginEnabled,
		loggedIn     : state.me.loggedIn,
		myPicture    : state.me.picture
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
				prev.room.inLobby === next.room.inLobby &&
				prev.settings.displayName === next.settings.displayName &&
				prev.me.loginEnabled === next.me.loginEnabled &&
				prev.me.loggedIn === next.me.loggedIn &&
				prev.me.picture === next.me.picture
			);
		}
	}
)(withStyles(styles)(JoinDialog)));
import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../RoomContext';
import classnames from 'classnames';
import isElectron from 'is-electron';
import * as settingsActions from '../actions/settingsActions';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import Dialog from '@material-ui/core/Dialog';
import DialogContentText from '@material-ui/core/DialogContentText';
import IconButton from '@material-ui/core/IconButton';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Avatar from '@material-ui/core/Avatar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import CookieConsent from 'react-cookie-consent';
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import MuiDialogActions from '@material-ui/core/DialogActions';

const styles = (theme) =>
	({
		root :
		{
			display              : 'flex',
			width                : '100%',
			height               : '100%',
			backgroundColor      : 'var(--background-color)',
			backgroundImage      : `url(${window.config ? window.config.background : null})`,
			backgroundAttachment : 'fixed',
			backgroundPosition   : 'center',
			backgroundSize       : 'cover',
			backgroundRepeat     : 'no-repeat'
		},
		dialogTitle :
		{
		},
		dialogPaper :
		{
			width                          : '30vw',
			padding                        : theme.spacing(2),
			[theme.breakpoints.down('lg')] :
			{
				width : '40vw'
			},
			[theme.breakpoints.down('md')] :
			{
				width : '50vw'
			},
			[theme.breakpoints.down('sm')] :
			{
				width : '70vw'
			},
			[theme.breakpoints.down('xs')] :
			{
				width : '90vw'
			}
		},
		logo :
		{
			display       : 'block',
			paddingBottom : '1vh'
		},
		loginButton :
		{
			position : 'absolute',
			right    : theme.spacing(2),
			top      : theme.spacing(2),
			padding  : 0
		},
		largeIcon :
		{
			fontSize : '2em'
		},
		largeAvatar :
		{
			width  : 50,
			height : 50
		},
		green :
		{
			color : 'rgba(0, 153, 0, 1)'
		},
		red :
		{
			color : 'rgba(153, 0, 0, 1)'
		}
	});

const DialogTitle = withStyles(styles)((props) =>
{
	const [ open, setOpen ] = useState(false);

	const intl = useIntl();

	useEffect(() =>
	{
		const openTimer = setTimeout(() => setOpen(true), 1000);
		const closeTimer = setTimeout(() => setOpen(false), 4000);

		return () =>
		{
			clearTimeout(openTimer);
			clearTimeout(closeTimer);
		};
	}, []);

	const { children, classes, myPicture, onLogin, loggedIn, ...other } = props;

	const handleTooltipClose = () =>
	{
		setOpen(false);
	};

	const handleTooltipOpen = () =>
	{
		setOpen(true);
	};

	const loginTooltip = loggedIn ?
		intl.formatMessage({
			id             : 'tooltip.logout',
			defaultMessage : 'Log out'
		})
		:
		intl.formatMessage({
			id             : 'tooltip.login',
			defaultMessage : 'Log in'
		});

	return (
		<MuiDialogTitle disableTypography className={classes.dialogTitle} {...other}>
			{ window.config.logo && <img alt='Logo' className={classes.logo} src={window.config.logo} /> }
			<Typography variant='h5'>{children}</Typography>
			{ window.config.loginEnabled &&
				<Tooltip
					onClose={handleTooltipClose}
					onOpen={handleTooltipOpen}
					open={open}
					title={loginTooltip}
					placement='left'
				>
					<IconButton
						aria-label='Account'
						className={classes.loginButton}
						color='inherit'
						onClick={onLogin}
					>
						{ myPicture ?
							<Avatar src={myPicture} className={classes.largeAvatar} />
							:
							<AccountCircle
								className={classnames(classes.largeIcon, loggedIn ? classes.green : null)}
							/>
						}
					</IconButton>
				</Tooltip>
			}
		</MuiDialogTitle>
	);
});

const DialogContent = withStyles((theme) => ({
	root :
	{
		padding : theme.spacing(2)
	}
}))(MuiDialogContent);

const DialogActions = withStyles((theme) => ({
	root :
	{
		margin  : 0,
		padding : theme.spacing(1)
	}
}))(MuiDialogActions);

const JoinDialog = ({
	roomClient,
	room,
	roomId,
	displayName,
	displayNameInProgress,
	loggedIn,
	myPicture,
	changeDisplayName,
	classes
}) =>
{
	const intl = useIntl();

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
				if (room.inLobby)
					roomClient.changeDisplayName(displayName);
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
				<DialogTitle
					myPicture={myPicture}
					onLogin={() =>
					{
						loggedIn ? roomClient.logout(roomId) : roomClient.login(roomId);
					}}
					loggedIn={loggedIn}
				>
					{ window.config.title ? window.config.title : 'Multiparty meeting' }
					<hr />
				</DialogTitle>
				<DialogContent>
					<DialogContentText gutterBottom>
						<FormattedMessage
							id='room.aboutToJoin'
							defaultMessage='You are about to join a meeting'
						/>
					</DialogContentText>

					<DialogContentText variant='h6' gutterBottom align='center'>
						<FormattedMessage
							id='room.roomId'
							defaultMessage='Room ID: {roomName}'
							values={{
								roomName : roomId
							}}
						/>
					</DialogContentText>

					<DialogContentText gutterBottom>
						<FormattedMessage
							id='room.setYourName'
							defaultMessage={
								`Set your name for participation, 
								and choose how you want to join:`
							}
						/>
					</DialogContentText>

					<TextField
						id='displayname'
						label={intl.formatMessage({
							id             : 'label.yourName',
							defaultMessage : 'Your name'
						})}
						value={displayName}
						variant='outlined'
						margin='normal'
						disabled={displayNameInProgress}
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
							if (room.inLobby)
								roomClient.changeDisplayName(displayName);
						}}
						fullWidth
					/>
					{!room.inLobby && room.overRoomLimit &&
						<DialogContentText className={classes.red} variant='h6' gutterBottom>
							<FormattedMessage
								id='room.overRoomLimit'
								defaultMessage={
									'The room is full, retry after some time.'
								}
							/>
						</DialogContentText>
					}

				</DialogContent>

				{ !room.inLobby ?
					<DialogActions>
						<Button
							onClick={() =>
							{
								roomClient.join({ roomId, joinVideo: false });
							}}
							variant='contained'
							color='secondary'
						>
							<FormattedMessage
								id='room.audioOnly'
								defaultMessage='Audio only'
							/>
						</Button>
						<Button
							onClick={() =>
							{
								roomClient.join({ roomId, joinVideo: true });
							}}
							variant='contained'
							color='secondary'
						>
							<FormattedMessage
								id='room.audioVideo'
								defaultMessage='Audio and Video'
							/>
						</Button>
					</DialogActions>
					:
					<DialogContent>
						<DialogContentText
							className={classes.green}
							gutterBottom
							variant='h6'
							style={{ fontWeight: '600' }}
							align='center'
						>
							<FormattedMessage
								id='room.youAreReady'
								defaultMessage='Ok, you are ready'
							/>
						</DialogContentText>
						{ room.signInRequired ?
							<DialogContentText
								gutterBottom
								variant='h5'
								style={{ fontWeight: '600' }}
							>
								<FormattedMessage
									id='room.emptyRequireLogin'
									defaultMessage={
										`The room is empty! You can Log In to start 
										the meeting or wait until the host joins`
									}
								/>
							</DialogContentText>
							:
							<DialogContentText
								gutterBottom
								variant='h5'
								style={{ fontWeight: '600' }}
							>
								<FormattedMessage
									id='room.locketWait'
									defaultMessage='The room is locked - hang on until somebody lets you in ...'
								/>
							</DialogContentText>
						}
					</DialogContent>
				}

				{ !isElectron() &&
					<CookieConsent buttonText={intl.formatMessage({
						id             : 'room.consentUnderstand',
						defaultMessage : 'I understand'
					})}
					>
						<FormattedMessage
							id='room.cookieConsent'
							defaultMessage='This website uses cookies to enhance the user experience'
						/>
					</CookieConsent>
				}
			</Dialog>
		</div>
	);
};

JoinDialog.propTypes =
{
	roomClient            : PropTypes.any.isRequired,
	room                  : PropTypes.object.isRequired,
	roomId                : PropTypes.string.isRequired,
	displayName           : PropTypes.string.isRequired,
	displayNameInProgress : PropTypes.bool.isRequired,
	loginEnabled          : PropTypes.bool.isRequired,
	loggedIn              : PropTypes.bool.isRequired,
	myPicture             : PropTypes.string,
	changeDisplayName     : PropTypes.func.isRequired,
	classes               : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		room                  : state.room,
		displayName           : state.settings.displayName,
		displayNameInProgress : state.me.displayNameInProgress,
		loginEnabled          : state.me.loginEnabled,
		loggedIn              : state.me.loggedIn,
		myPicture             : state.me.picture
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		changeDisplayName : (displayName) =>
		{
			dispatch(settingsActions.setDisplayName(displayName));
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
				prev.room.signInRequired === next.room.signInRequired &&
				prev.room.overRoomLimit === next.room.overRoomLimit &&
				prev.settings.displayName === next.settings.displayName &&
				prev.me.displayNameInProgress === next.me.displayNameInProgress &&
				prev.me.loginEnabled === next.me.loginEnabled &&
				prev.me.loggedIn === next.me.loggedIn &&
				prev.me.picture === next.me.picture
			);
		}
	}
)(withStyles(styles)(JoinDialog)));
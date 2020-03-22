import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../RoomContext';
import isElectron from 'is-electron';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import randomString from 'random-string';
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

	const { children, classes, myPicture, onLogin, ...other } = props;

	const handleTooltipClose = () =>
	{
		setOpen(false);
	};

	const handleTooltipOpen = () =>
	{
		setOpen(true);
	};

	return (
		<MuiDialogTitle disableTypography className={classes.dialogTitle} {...other}>
			{ window.config && window.config.logo && <img alt='Logo' className={classes.logo} src={window.config.logo} /> }
			<Typography variant='h5'>{children}</Typography>
			{ window.config && window.config.loginEnabled &&
				<Tooltip
					onClose={handleTooltipClose}
					onOpen={handleTooltipOpen}
					open={open}
					title={intl.formatMessage({
						id             : 'tooltip.login',
						defaultMessage : 'Click to log in'
					})}
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
							<AccountCircle className={classes.largeIcon} />
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

const ChooseRoom = ({
	roomClient,
	loggedIn,
	myPicture,
	classes
}) =>
{
	const [ roomId, setRoomId ] =
		useState(randomString({ length: 8 }).toLowerCase());

	const intl = useIntl();

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
						loggedIn ? roomClient.logout() : roomClient.login();
					}}
				>
					{ window.config && window.config.title ? window.config.title : 'Multiparty meeting' }
					<hr />
				</DialogTitle>
				<DialogContent>
					<DialogContentText gutterBottom>
						<FormattedMessage
							id='room.chooseRoom'
							defaultMessage='Choose the name of the room you would like to join'
						/>
					</DialogContentText>

					<TextField
						id='roomId'
						label={intl.formatMessage({
							id             : 'label.roomName',
							defaultMessage : 'Room name'
						})}
						value={roomId}
						variant='outlined'
						margin='normal'
						onChange={(event) =>
						{
							const { value } = event.target;

							setRoomId(value.toLowerCase());
						}}
						onBlur={() =>
						{
							if (roomId === '')
								setRoomId(randomString({ length: 8 }).toLowerCase());
						}}
						fullWidth
					/>
				</DialogContent>

				<DialogActions>
					<Button
						component={Link}
						to={roomId}
						variant='contained'
						color='secondary'
					>
						<FormattedMessage
							id='label.chooseRoomButton'
							defaultMessage='Continue'
						/>
					</Button>
				</DialogActions>

				{ !isElectron() &&
					<CookieConsent buttonText={intl.formatMessage({
						id             : 'room.consentUnderstand',
						defaultMessage : 'I understand'
					})}>
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

ChooseRoom.propTypes =
{
	roomClient   : PropTypes.any.isRequired,
	loginEnabled : PropTypes.bool.isRequired,
	loggedIn     : PropTypes.bool.isRequired,
	myPicture    : PropTypes.string,
	classes      : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		loginEnabled : state.me.loginEnabled,
		loggedIn     : state.me.loggedIn,
		myPicture    : state.me.picture
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me.loginEnabled === next.me.loginEnabled &&
				prev.me.loggedIn === next.me.loggedIn &&
				prev.me.picture === next.me.picture
			);
		}
	}
)(withStyles(styles)(ChooseRoom)));
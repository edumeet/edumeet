import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	lobbyPeersKeySelector
} from '../Selectors';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import * as roomActions from '../../actions/roomActions';
import * as toolareaActions from '../../actions/toolareaActions';
import { useIntl, FormattedMessage } from 'react-intl';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Avatar from '@material-ui/core/Avatar';
import Badge from '@material-ui/core/Badge';
import AccountCircle from '@material-ui/icons/AccountCircle';
import FullScreenIcon from '@material-ui/icons/Fullscreen';
import FullScreenExitIcon from '@material-ui/icons/FullscreenExit';
import SettingsIcon from '@material-ui/icons/Settings';
import SecurityIcon from '@material-ui/icons/Security';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';

const styles = (theme) =>
	({
		menuButton :
		{
			margin  : 0,
			padding : 0
		},
		logo :
		{
			display                      : 'none',
			marginLeft                   : 20,
			[theme.breakpoints.up('sm')] :
			{
				display : 'block'
			}
		},
		show :
		{
			opacity    : 1,
			transition : 'opacity .5s'
		},
		hide :
		{
			opacity    : 0,
			transition : 'opacity .5s'
		},
		grow :
		{
			flexGrow : 1
		},
		title :
		{
			display                      : 'none',
			marginLeft                   : 20,
			[theme.breakpoints.up('sm')] :
			{
				display : 'block'
			}
		},
		actionButtons :
		{
			display : 'flex'
		},
		actionButton :
		{
			margin  : theme.spacing(1),
			padding : 0
		}
	});

const PulsingBadge = withStyles((theme) =>
	({
		badge :
		{
			backgroundColor : theme.palette.secondary.main,
			'&::after'      :
			{
				position     : 'absolute',
				width        : '100%',
				height       : '100%',
				borderRadius : '50%',
				animation    : '$ripple 1.2s infinite ease-in-out',
				border       : `3px solid ${theme.palette.secondary.main}`,
				content      : '""'
			}
		},
		'@keyframes ripple' :
		{
			'0%' :
			{
				transform : 'scale(.8)',
				opacity   : 1
			},
			'100%' :
			{
				transform : 'scale(2.4)',
				opacity   : 0
			}
		}
	}))(Badge);

const TopBar = (props) =>
{
	const intl = useIntl();

	const {
		roomClient,
		room,
		lobbyPeers,
		myPicture,
		loggedIn,
		loginEnabled,
		fullscreenEnabled,
		fullscreen,
		onFullscreen,
		setSettingsOpen,
		setLockDialogOpen,
		toggleToolArea,
		unread,
		classes
	} = props;

	const lockTooltip = room.locked ?
		intl.formatMessage({
			id             : 'tooltip.unLockRoom',
			defaultMessage : 'Unlock room'
		})
		:
		intl.formatMessage({
			id             : 'tooltip.lockRoom',
			defaultMessage : 'Lock room'
		});

	const fullscreenTooltip = fullscreen ?
		intl.formatMessage({
			id             : 'tooltip.leaveFullscreen',
			defaultMessage : 'Leave fullscreen'
		})
		:
		intl.formatMessage({
			id             : 'tooltip.enterFullscreen',
			defaultMessage : 'Enter fullscreen'
		});

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
		<AppBar
			position='fixed'
			className={room.toolbarsVisible ? classes.show : classes.hide}
		>
			<Toolbar>
				<PulsingBadge
					color='secondary'
					badgeContent={unread}
				>
					<IconButton
						color='inherit'
						aria-label={intl.formatMessage({
							id             : 'label.openDrawer',
							defaultMessage : 'Open drawer'
						})}
						onClick={() => toggleToolArea()}
						className={classes.menuButton}
					>
						<MenuIcon />
					</IconButton>
				</PulsingBadge>
				{ window.config.logo && <img alt='Logo' className={classes.logo} src={window.config.logo} /> }
				<Typography
					className={classes.title}
					variant='h6'
					color='inherit'
					noWrap
				>
					{ window.config.title }
				</Typography>
				<div className={classes.grow} />
				<div className={classes.actionButtons}>
					<Tooltip title={lockTooltip}>
						<IconButton
							aria-label={intl.formatMessage({
								id             : 'tooltip.lockRoom',
								defaultMessage : 'Lock room'
							})}
							className={classes.actionButton}
							color='inherit'
							onClick={() =>
							{
								if (room.locked)
								{
									roomClient.unlockRoom();
								}
								else
								{
									roomClient.lockRoom();
								}
							}}
						>
							{ room.locked ?
								<LockIcon />
								:
								<LockOpenIcon />
							}
						</IconButton>
					</Tooltip>
					{ lobbyPeers.length > 0 &&
						<Tooltip 
							title={intl.formatMessage({
								id             : 'tooltip.lobby',
								defaultMessage : 'Show lobby'
							})}
						>
							<IconButton
								aria-label={intl.formatMessage({
									id             : 'tooltip.lobby',
									defaultMessage : 'Show lobby'
								})}
								color='inherit'
								onClick={() => setLockDialogOpen(!room.lockDialogOpen)}
							>
								<PulsingBadge
									color='secondary'
									badgeContent={lobbyPeers.length}
								>
									<SecurityIcon />
								</PulsingBadge>
							</IconButton>
						</Tooltip>
					}
					{ fullscreenEnabled &&
						<Tooltip title={fullscreenTooltip}>
							<IconButton
								aria-label={intl.formatMessage({
									id             : 'tooltip.enterFullscreen',
									defaultMessage : 'Enter fullscreen'
								})}
								className={classes.actionButton}
								color='inherit'
								onClick={onFullscreen}
							>
								{ fullscreen ?
									<FullScreenExitIcon />
									:
									<FullScreenIcon />
								}
							</IconButton>
						</Tooltip>
					}
					<Tooltip
						title={intl.formatMessage({
							id             : 'tooltip.settings',
							defaultMessage : 'Show settings'
						})}
					>
						<IconButton
							aria-label={intl.formatMessage({
								id             : 'tooltip.settings',
								defaultMessage : 'Show settings'
							})}
							className={classes.actionButton}
							color='inherit'
							onClick={() => setSettingsOpen(!room.settingsOpen)}
						>
							<SettingsIcon />
						</IconButton>
					</Tooltip>
					{ loginEnabled &&
						<Tooltip title={loginTooltip}>
							<IconButton
								aria-label={intl.formatMessage({
									id             : 'tooltip.login',
									defaultMessage : 'Log in'
								})}
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
						</Tooltip>
					}
					<Button
						aria-label={intl.formatMessage({
							id             : 'label.leave',
							defaultMessage : 'Leave'
						})}
						className={classes.actionButton}
						variant='contained'
						color='secondary'
						onClick={() => roomClient.close()}
					>
						<FormattedMessage
							id='label.leave'
							defaultMessage='Leave'
						/>
					</Button>
				</div>
			</Toolbar>
		</AppBar>
	);
};

TopBar.propTypes =
{
	roomClient         : PropTypes.object.isRequired,
	room               : appPropTypes.Room.isRequired,
	lobbyPeers         : PropTypes.array,
	myPicture          : PropTypes.string,
	loggedIn           : PropTypes.bool.isRequired,
	loginEnabled       : PropTypes.bool.isRequired,
	fullscreenEnabled  : PropTypes.bool,
	fullscreen         : PropTypes.bool,
	onFullscreen       : PropTypes.func.isRequired,
	setToolbarsVisible : PropTypes.func.isRequired,
	setSettingsOpen    : PropTypes.func.isRequired,
	setLockDialogOpen  : PropTypes.func.isRequired,
	toggleToolArea     : PropTypes.func.isRequired,
	unread             : PropTypes.number.isRequired,
	classes            : PropTypes.object.isRequired,
	theme              : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		room         : state.room,
		lobbyPeers   : lobbyPeersKeySelector(state),
		advancedMode : state.settings.advancedMode,
		loggedIn     : state.me.loggedIn,
		loginEnabled : state.me.loginEnabled,
		myPicture    : state.me.picture,
		unread       : state.toolarea.unreadMessages +
			state.toolarea.unreadFiles
	});

const mapDispatchToProps = (dispatch) =>
	({
		setToolbarsVisible : (visible) =>
		{
			dispatch(roomActions.setToolbarsVisible(visible));
		},
		setSettingsOpen : (settingsOpen) =>
		{
			dispatch(roomActions.setSettingsOpen({ settingsOpen }));
		},
		setLockDialogOpen : (lockDialogOpen) =>
		{
			dispatch(roomActions.setLockDialogOpen({ lockDialogOpen }));
		},
		toggleToolArea : () =>
		{
			dispatch(toolareaActions.toggleToolArea());
		}
	});

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room === next.room &&
				prev.lobbyPeers === next.lobbyPeers &&
				prev.me.loggedIn === next.me.loggedIn &&
				prev.me.loginEnabled === next.me.loginEnabled &&
				prev.me.picture === next.me.picture &&
				prev.toolarea.unreadMessages === next.toolarea.unreadMessages &&
				prev.toolarea.unreadFiles === next.toolarea.unreadFiles
			);
		}
	}
)(withStyles(styles, { withTheme: true })(TopBar)));
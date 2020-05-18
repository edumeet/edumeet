import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	lobbyPeersKeySelector,
	peersLengthSelector,
	raisedHandsSelector
} from '../Selectors';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import * as roomActions from '../../actions/roomActions';
import * as toolareaActions from '../../actions/toolareaActions';
import { useIntl, FormattedMessage } from 'react-intl';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Avatar from '@material-ui/core/Avatar';
import Badge from '@material-ui/core/Badge';
import ExtensionIcon from '@material-ui/icons/Extension';
import AccountCircle from '@material-ui/icons/AccountCircle';
import FullScreenIcon from '@material-ui/icons/Fullscreen';
import FullScreenExitIcon from '@material-ui/icons/FullscreenExit';
import SettingsIcon from '@material-ui/icons/Settings';
import SecurityIcon from '@material-ui/icons/Security';
import PeopleIcon from '@material-ui/icons/People';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import VideoCallIcon from '@material-ui/icons/VideoCall';
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
		divider :
		{
			marginLeft : theme.spacing(3)
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
			margin  : theme.spacing(1, 0),
			padding : theme.spacing(0, 1)
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

	const [ moreActionsElement, setMoreActionsElement ] = useState(null);

	const handleMoreActionsOpen = (event) =>
	{
		setMoreActionsElement(event.currentTarget);
	};

	const handleMoreActionsClose = () =>
	{
		setMoreActionsElement(null);
	};

	const {
		roomClient,
		room,
		peersLength,
		lobbyPeers,
		permanentTopBar,
		myPicture,
		loggedIn,
		loginEnabled,
		fullscreenEnabled,
		fullscreen,
		onFullscreen,
		setSettingsOpen,
		setExtraVideoOpen,
		setLockDialogOpen,
		toggleToolArea,
		openUsersTab,
		unread,
		canProduceExtraVideo,
		canLock,
		canPromote,
		classes
	} = props;

	const isMoreActionsMenuOpen = Boolean(moreActionsElement);

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
		<React.Fragment>
			<AppBar
				position='fixed'
				className={room.toolbarsVisible || permanentTopBar ? classes.show : classes.hide}
			>
				<Toolbar>
					<PulsingBadge
						color='secondary'
						badgeContent={unread}
						onClick={() => toggleToolArea()}
					>
						<IconButton
							color='inherit'
							aria-label={intl.formatMessage({
								id             : 'label.openDrawer',
								defaultMessage : 'Open drawer'
							})}
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
						{ window.config.title ? window.config.title : 'Multiparty meeting' }
					</Typography>
					<div className={classes.grow} />
					<div className={classes.actionButtons}>
						<IconButton
							aria-haspopup='true'
							onClick={handleMoreActionsOpen}
							color='inherit'
						>
							<ExtensionIcon />
						</IconButton>
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
								id             : 'tooltip.participants',
								defaultMessage : 'Show participants'
							})}
						>
							<IconButton
								aria-label={intl.formatMessage({
									id             : 'tooltip.participants',
									defaultMessage : 'Show participants'
								})}
								color='inherit'
								onClick={() => openUsersTab()}
							>
								<Badge
									color='primary'
									badgeContent={peersLength + 1}
								>
									<PeopleIcon />
								</Badge>
							</IconButton>
						</Tooltip>
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
						<Tooltip title={lockTooltip}>
							<span className={classes.disabledButton}>
								<IconButton
									aria-label={intl.formatMessage({
										id             : 'tooltip.lockRoom',
										defaultMessage : 'Lock room'
									})}
									className={classes.actionButton}
									color='inherit'
									disabled={!canLock}
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
							</span>
						</Tooltip>
						{ lobbyPeers.length > 0 &&
							<Tooltip 
								title={intl.formatMessage({
									id             : 'tooltip.lobby',
									defaultMessage : 'Show lobby'
								})}
							>
								<span className={classes.disabledButton}>
									<IconButton
										aria-label={intl.formatMessage({
											id             : 'tooltip.lobby',
											defaultMessage : 'Show lobby'
										})}
										className={classes.actionButton}
										color='inherit'
										disabled={!canPromote}
										onClick={() => setLockDialogOpen(!room.lockDialogOpen)}
									>
										<PulsingBadge
											color='secondary'
											badgeContent={lobbyPeers.length}
										>
											<SecurityIcon />
										</PulsingBadge>
									</IconButton>
								</span>
							</Tooltip>
						}
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
										<AccountCircle className={loggedIn ? classes.green : null} />
									}
								</IconButton>
							</Tooltip>
						}
						<div className={classes.divider} />
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
			<Menu
				anchorEl={moreActionsElement}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
				transformOrigin={{ vertical: 'top', horizontal: 'left' }}
				open={isMoreActionsMenuOpen}
				onClose={handleMoreActionsClose}
				getContentAnchorEl={null}
			>
				<MenuItem
					dense
					disabled={!canProduceExtraVideo}
					onClick={() =>
					{
						handleMoreActionsClose();
						setExtraVideoOpen(!room.extraVideoOpen);
					}}
				>
					<VideoCallIcon
						aria-label={intl.formatMessage({
							id             : 'label.addVideo',
							defaultMessage : 'Add video'
						})}
					/>
					<p className={classes.moreAction}>
						<FormattedMessage
							id='label.addVideo'
							defaultMessage='Add video'
						/>
					</p>
				</MenuItem>
			</Menu>
		</React.Fragment>
	);
};

TopBar.propTypes =
{
	roomClient           : PropTypes.object.isRequired,
	room                 : appPropTypes.Room.isRequired,
	peersLength          : PropTypes.number,
	lobbyPeers           : PropTypes.array,
	permanentTopBar      : PropTypes.bool,
	myPicture            : PropTypes.string,
	loggedIn             : PropTypes.bool.isRequired,
	loginEnabled         : PropTypes.bool.isRequired,
	fullscreenEnabled    : PropTypes.bool,
	fullscreen           : PropTypes.bool,
	onFullscreen         : PropTypes.func.isRequired,
	setToolbarsVisible   : PropTypes.func.isRequired,
	setSettingsOpen      : PropTypes.func.isRequired,
	setExtraVideoOpen    : PropTypes.func.isRequired,
	setLockDialogOpen    : PropTypes.func.isRequired,
	toggleToolArea       : PropTypes.func.isRequired,
	openUsersTab         : PropTypes.func.isRequired,
	unread               : PropTypes.number.isRequired,
	canProduceExtraVideo : PropTypes.bool.isRequired,
	canLock              : PropTypes.bool.isRequired,
	canPromote           : PropTypes.bool.isRequired,
	classes              : PropTypes.object.isRequired,
	theme                : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		room            : state.room,
		peersLength     : peersLengthSelector(state),
		lobbyPeers      : lobbyPeersKeySelector(state),
		permanentTopBar : state.settings.permanentTopBar,
		loggedIn        : state.me.loggedIn,
		loginEnabled    : state.me.loginEnabled,
		myPicture       : state.me.picture,
		unread          : state.toolarea.unreadMessages +
			state.toolarea.unreadFiles + raisedHandsSelector(state),
		canProduceExtraVideo :
			state.me.roles.some((role) =>
				state.room.permissionsFromRoles.EXTRA_VIDEO.includes(role)),
		canLock :
			state.me.roles.some((role) =>
				state.room.permissionsFromRoles.CHANGE_ROOM_LOCK.includes(role)),
		canPromote :
			state.me.roles.some((role) =>
				state.room.permissionsFromRoles.PROMOTE_PEER.includes(role))
	});

const mapDispatchToProps = (dispatch) =>
	({
		setToolbarsVisible : (visible) =>
		{
			dispatch(roomActions.setToolbarsVisible(visible));
		},
		setSettingsOpen : (settingsOpen) =>
		{
			dispatch(roomActions.setSettingsOpen(settingsOpen));
		},
		setExtraVideoOpen : (extraVideoOpen) =>
		{
			dispatch(roomActions.setExtraVideoOpen(extraVideoOpen));
		},
		setLockDialogOpen : (lockDialogOpen) =>
		{
			dispatch(roomActions.setLockDialogOpen(lockDialogOpen));
		},
		toggleToolArea : () =>
		{
			dispatch(toolareaActions.toggleToolArea());
		},
		openUsersTab : () =>
		{
			dispatch(toolareaActions.openToolArea());
			dispatch(toolareaActions.setToolTab('users'));
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
				prev.peers === next.peers &&
				prev.lobbyPeers === next.lobbyPeers &&
				prev.settings.permanentTopBar === next.settings.permanentTopBar &&
				prev.me.loggedIn === next.me.loggedIn &&
				prev.me.loginEnabled === next.me.loginEnabled &&
				prev.me.picture === next.me.picture &&
				prev.me.roles === next.me.roles &&
				prev.toolarea.unreadMessages === next.toolarea.unreadMessages &&
				prev.toolarea.unreadFiles === next.toolarea.unreadFiles
			);
		}
	}
)(withStyles(styles, { withTheme: true })(TopBar)));

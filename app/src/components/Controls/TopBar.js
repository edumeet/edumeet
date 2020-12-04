import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	lobbyPeersKeySelector,
	peersLengthSelector,
	raisedHandsSelector,
	makePermissionSelector
} from '../Selectors';
import { permissions } from '../../permissions';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import * as roomActions from '../../actions/roomActions';
import * as toolareaActions from '../../actions/toolareaActions';
import { useIntl, FormattedMessage } from 'react-intl';
import classnames from 'classnames';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import Popover from '@material-ui/core/Popover';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Avatar from '@material-ui/core/Avatar';
import Badge from '@material-ui/core/Badge';
import Paper from '@material-ui/core/Paper';
import AccountCircle from '@material-ui/icons/AccountCircle';
import FullScreenIcon from '@material-ui/icons/Fullscreen';
import FullScreenExitIcon from '@material-ui/icons/FullscreenExit';
import SettingsIcon from '@material-ui/icons/Settings';
import SecurityIcon from '@material-ui/icons/Security';
import PeopleIcon from '@material-ui/icons/People';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import VideoCallIcon from '@material-ui/icons/VideoCall';
import SelfViewOnIcon from '@material-ui/icons/Videocam';
import SelfViewOffIcon from '@material-ui/icons/VideocamOff';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import MoreIcon from '@material-ui/icons/MoreVert';
import HelpIcon from '@material-ui/icons/Help';
import InfoIcon from '@material-ui/icons/Info';
import ChatIcon from '@material-ui/icons/Chat';
import FileSharingIcon from '@material-ui/icons/FolderShared';
import HandIcon from '@material-ui/icons/PanTool';
import LanguageIcon from '@material-ui/icons/Language';
import CallEndIcon from '@material-ui/icons/CallEnd';

const styles = (theme) =>
	({
		persistentDrawerOpen :
		{
			width                          : 'calc(100% - 30vw)',
			marginRight                    : '30vw',
			[theme.breakpoints.down('lg')] :
			{
				width       : 'calc(100% - 40vw)',
				marginRight : '40vw'
			},
			[theme.breakpoints.down('md')] :
			{
				width       : 'calc(100% - 50vw)',
				marginRight : '50vw'
			},
			[theme.breakpoints.down('sm')] :
			{
				width       : 'calc(100% - 70vw)',
				marginRight : '70vw'
			},
			[theme.breakpoints.down('xs')] :
			{
				width       : 'calc(100% - 90vw)',
				marginRight : '90vw'
			}
		},
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
		sectionDesktop : {
			display                      : 'none',
			[theme.breakpoints.up('md')] : {
				display : 'flex'
			}
		},
		sectionMobile : {
			display                      : 'flex',
			[theme.breakpoints.up('md')] : {
				display : 'none'
			}
		},
		actionButton :
		{
			margin  : theme.spacing(1, 0),
			padding : theme.spacing(0, 1)
		},
		disabledButton :
		{
			margin : theme.spacing(1, 0)
		},
		green :
		{
			color : 'rgba(0, 153, 0, 1)'
		},
		warning :
		{
			color : 'var(--warning-color)'
		},
		moreAction :
		{
			margin : theme.spacing(0.5, 0, 0.5, 1.5)
		}
	});

const PulsingBadge = withStyles(() =>
	({
		badge :
		{
			backgroundColor : 'var(--warning-color)',
			'&::after'      :
			{
				position     : 'absolute',
				width        : '100%',
				height       : '100%',
				borderRadius : '50%',
				animation    : '$ripple 1.2s infinite ease-in-out',
				border       : '3px solid var(--warning-color)',
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
	const [ mobileMoreAnchorEl, setMobileMoreAnchorEl ] = useState(null);
	const [ anchorEl, setAnchorEl ] = useState(null);
	const [ currentMenu, setCurrentMenu ] = useState(null);

	const handleExited = () =>
	{
		setCurrentMenu(null);
	};

	const handleMobileMenuOpen = (event) =>
	{
		setMobileMoreAnchorEl(event.currentTarget);
	};

	const handleMobileMenuClose = () =>
	{
		setMobileMoreAnchorEl(null);
	};

	const handleMenuOpen = (event, menu) =>
	{
		setAnchorEl(event.currentTarget);
		setCurrentMenu(menu);
	};

	const handleMenuClose = () =>
	{
		setAnchorEl(null);

		handleMobileMenuClose();
	};

	const {
		roomClient,
		room,
		peersLength,
		lobbyPeers,
		permanentTopBar,
		drawerOverlayed,
		toolAreaOpen,
		isMobile,
		myPicture,
		loggedIn,
		loginEnabled,
		fullscreenEnabled,
		fullscreen,
		onFullscreen,
		setSettingsOpen,
		setExtraVideoOpen,
		setHelpOpen,
		setAboutOpen,
		setLockDialogOpen,
		setHideSelfView,
		openUsersTab,
		openFilesTab,
		openChatTab,
		unread,
		newFiles,
		raisedHands,
		canProduceExtraVideo,
		canLock,
		canPromote,
		classes,
		locale,
		localesList
	} = props;

	const isMenuOpen = Boolean(anchorEl);
	const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

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
				className={classnames(
					room.toolbarsVisible || permanentTopBar ?
						classes.show : classes.hide,
					!(isMobile || drawerOverlayed) && toolAreaOpen ?
						classes.persistentDrawerOpen : null
				)}
			>
				<Toolbar>
					{ window.config.logo !== undefined ?
						<img alt='Logo'
							src={window.config.logo}
							className={classes.logo}
						/> :
						<Typography
							variant='h6'
							noWrap color='secondary'
						>
							{window.config.title}
						</Typography>
					}
					<div className={classes.grow} />
					<div className={classes.sectionDesktop}>
						{ raisedHands ?
							<Tooltip
								title={intl.formatMessage({
									id             : 'tooltip.raisedHand',
									defaultMessage : 'Raised Hand'
								})}
							>
								<IconButton
									aria-label={intl.formatMessage({
										id             : 'tooltip.raisedHand',
										defaultMessage : 'Raised Hand'
									})}
									color='secondary'
								>
									<PulsingBadge
										color='primary'
										badgeContent=''
									>
										<HandIcon />
									</PulsingBadge>
								</IconButton>
							</Tooltip>
							: null
						}
						<Tooltip
							title={intl.formatMessage({
								id             : 'label.chat',
								defaultMessage : 'Show Chat'
							})}
						>
							<IconButton
								aria-label={intl.formatMessage({
									id             : 'label.chat',
									defaultMessage : 'Show Chat'
								})}
								color='secondary'
								onClick={() => openChatTab()}
							>
								<Badge
									color='primary'
									badgeContent={unread}
								>
									<ChatIcon />
								</Badge>
							</IconButton>
						</Tooltip>
						<Tooltip
							title={intl.formatMessage({
								id             : 'label.filesharing',
								defaultMessage : 'Show Files'
							})}
						>
							<IconButton
								aria-label={intl.formatMessage({
									id             : 'label.filesharing',
									defaultMessage : 'Show Files'
								})}
								color='secondary'
								onClick={() => openFilesTab()}
							>
								<Badge
									color='primary'
									badgeContent={newFiles}
								>
									<FileSharingIcon />
								</Badge>
							</IconButton>
						</Tooltip>
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
								color='secondary'
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
										color='secondary'
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
									color='secondary'
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
						<Tooltip
							title={intl.formatMessage({
								id             : 'label.moreActions',
								defaultMessage : 'More actions'
							})}
						>
							<IconButton
								aria-owns={
									isMenuOpen &&
									currentMenu === 'moreActions' ?
										'material-appbar' : undefined
								}
								aria-haspopup
								onClick={(event) => handleMenuOpen(event, 'moreActions')}
								color='secondary'
							>
								<MoreIcon />
							</IconButton>
						</Tooltip>
					</div>
					<div className={classes.sectionMobile}>
						{ raisedHands ?
							<Tooltip
								title={intl.formatMessage({
									id             : 'tooltip.raisedHand',
									defaultMessage : 'Raised Hand'
								})}
							>
								<IconButton
									aria-label={intl.formatMessage({
										id             : 'tooltip.raisedHand',
										defaultMessage : 'Raised Hand'
									})}
									color='secondary'
								>
									<PulsingBadge
										color='primary'
										badgeContent=''
									>
										<HandIcon />
									</PulsingBadge>
								</IconButton>
							</Tooltip>
							: null
						}
						<Tooltip
							title={intl.formatMessage({
								id             : 'label.chat',
								defaultMessage : 'Show Chat'
							})}
						>
							<IconButton
								aria-label={intl.formatMessage({
									id             : 'label.chat',
									defaultMessage : 'Show Chat'
								})}
								color='secondary'
								onClick={() => openChatTab()}
							>
								<Badge
									color='primary'
									badgeContent={unread}
								>
									<ChatIcon />
								</Badge>
							</IconButton>
						</Tooltip>
						<Tooltip
							title={intl.formatMessage({
								id             : 'label.filesharing',
								defaultMessage : 'Show Files'
							})}
						>
							<IconButton
								aria-label={intl.formatMessage({
									id             : 'label.filesharing',
									defaultMessage : 'Show Files'
								})}
								color='secondary'
								onClick={() => openFilesTab()}
							>
								<Badge
									color='primary'
									badgeContent={newFiles}
								>
									<FileSharingIcon />
								</Badge>
							</IconButton>
						</Tooltip>
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
								color='secondary'
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
									color='secondary'
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
						<IconButton
							aria-haspopup
							onClick={handleMobileMenuOpen}
							color='secondary'
						>
							<MoreIcon />
						</IconButton>
					</div>
					<Button
						variant='contained'
						color='secondary'
						size='small'
						startIcon={<CallEndIcon />}
						className={classes.button}
						style={{ borderRadius: 100 }}

						onClick={() => roomClient.close()}
					>
						<FormattedMessage
							id='label.leave'
							defaultMessage='Leave'
						/>
					</Button>
				</Toolbar>
			</AppBar>
			<Popover
				anchorEl={anchorEl}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
				transformOrigin={{ vertical: 'top', horizontal: 'left' }}
				open={isMenuOpen}
				onClose={handleMenuClose}
				onExited={handleExited}
				getContentAnchorEl={null}
			>
				{ currentMenu === 'moreActions' &&
					<Paper>
						<MenuItem
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

							{ room.locked ?
								<p className={classes.moreAction}>
									<FormattedMessage
										id='tooltip.unlockRoom'
										defaultMessage='Unlock room'
									/>
								</p>
								:
								<p className={classes.moreAction}>
									<FormattedMessage
										id='tooltip.lockRoom'
										defaultMessage='Lock room'
									/>
								</p>
							}

						</MenuItem>
						{ fullscreenEnabled &&
							<MenuItem
								onClick={onFullscreen}
							>
								{ fullscreen ? <FullScreenExitIcon /> : <FullScreenIcon /> }

								<p className={classes.moreAction}>
									{ fullscreen ?
										<FormattedMessage
											id='tooltip.exitFullscreen'
											defaultMessage='Exit fullscreen'
										/>
										:
										<FormattedMessage
											id='tooltip.enterFullscreen'
											defaultMessage='Enter fullscreen'
										/>
									}
								</p>
							</MenuItem>
						}
						<MenuItem
							disabled={!canProduceExtraVideo}
							onClick={() =>
							{
								handleMenuClose();
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
						<MenuItem
							onClick={() =>
							{
								handleMenuClose();
								setHideSelfView(!room.hideSelfView);
							}}
						>
							{ room.hideSelfView ?
								<SelfViewOnIcon
									aria-label={intl.formatMessage({
										id             : 'room.showSelfView',
										defaultMessage : 'Show self view video'
									})}
								/>
								:
								<SelfViewOffIcon
									aria-label={intl.formatMessage({
										id             : 'room.hideSelfView',
										defaultMessage : 'Hide self view video'
									})}
								/>
							}
							{ room.hideSelfView ?
								<p className={classes.moreAction}>
									<FormattedMessage
										id='room.showSelfView'
										defaultMessage='Show self view video'
									/>
								</p>
								:
								<p className={classes.moreAction}>
									<FormattedMessage
										id='room.hideSelfView'
										defaultMessage='Hide self view video'
									/>
								</p>
							}
						</MenuItem>
						<MenuItem
							onClick={(event) => handleMenuOpen(event, 'localeMenu')}
						>
							<LanguageIcon />
							<p className={classes.moreAction}>
								<FormattedMessage
									id='tooltip.language'
									defaultMessage='Language'
								/>
							</p>
						</MenuItem>
						<MenuItem
							onClick={() => setSettingsOpen(!room.settingsOpen)}
						>
							<SettingsIcon />
							<p className={classes.moreAction}>
								<FormattedMessage
									id='tooltip.settings'
									defaultMessage='Show settings'
								/>
							</p>
						</MenuItem>
						<MenuItem
							onClick={() =>
							{
								handleMenuClose();
								setHelpOpen(!room.helpOpen);
							}}
						>
							<HelpIcon
								aria-label={intl.formatMessage({
									id             : 'room.help',
									defaultMessage : 'Help'
								})}
							/>
							<p className={classes.moreAction}>
								<FormattedMessage
									id='room.help'
									defaultMessage='Help'
								/>
							</p>
						</MenuItem>
						<MenuItem
							onClick={() =>
							{
								handleMenuClose();
								setAboutOpen(!room.aboutOpen);
							}}
						>
							<InfoIcon
								aria-label={intl.formatMessage({
									id             : 'room.about',
									defaultMessage : 'About'
								})}
							/>
							<p className={classes.moreAction}>
								<FormattedMessage
									id='room.about'
									defaultMessage='About'
								/>
							</p>
						</MenuItem>
					</Paper>
				}

				{ currentMenu === 'localeMenu' &&
					<Paper>
						{localesList.map((item, index) => (
							<MenuItem
								selected={item.locale.includes(locale)}
								key={index}
								onClick={() =>
								{
									roomClient.setLocale(item.locale[0]);
									handleMenuClose();
								}}
							>
								{item.name}
							</MenuItem>)
						)}
					</Paper>
				}

			</Popover>
			<Menu
				anchorEl={mobileMoreAnchorEl}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
				transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				open={isMobileMenuOpen}
				onClose={handleMenuClose}
				getContentAnchorEl={null}
			>
				{ loginEnabled &&
					<MenuItem
						aria-label={loginTooltip}
						onClick={() =>
						{
							handleMenuClose();
							loggedIn ? roomClient.logout() : roomClient.login();
						}}
					>
						{ myPicture ?
							<Avatar src={myPicture} />
							:
							<AccountCircle className={loggedIn ? classes.green : null} />
						}
						{ loggedIn ?
							<p className={classes.moreAction}>
								<FormattedMessage
									id='tooltip.logout'
									defaultMessage='Log out'
								/>
							</p>
							:
							<p className={classes.moreAction}>
								<FormattedMessage
									id='tooltip.login'
									defaultMessage='Log in'
								/>
							</p>
						}
					</MenuItem>
				}
				<MenuItem
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

					{ room.locked ?
						<p className={classes.moreAction}>
							<FormattedMessage
								id='tooltip.unlockRoom'
								defaultMessage='Unlock room'
							/>
						</p>
						:
						<p className={classes.moreAction}>
							<FormattedMessage
								id='tooltip.lockRoom'
								defaultMessage='Lock room'
							/>
						</p>
					}

				</MenuItem>
				{ fullscreenEnabled &&
					<MenuItem
						onClick={onFullscreen}
					>
						{ fullscreen ? <FullScreenExitIcon /> : <FullScreenIcon /> }

						<p className={classes.moreAction}>
							{ fullscreen ?
								<FormattedMessage
									id='tooltip.exitFullscreen'
									defaultMessage='Exit fullscreen'
								/>
								:
								<FormattedMessage
									id='tooltip.enterFullscreen'
									defaultMessage='Enter fullscreen'
								/>
							}
						</p>
					</MenuItem>
				}
				<MenuItem
					disabled={!canProduceExtraVideo}
					onClick={() =>
					{
						handleMenuClose();
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
				<MenuItem
					onClick={() =>
					{
						handleMenuClose();
						setHideSelfView(!room.hideSelfView);
					}}
				>
					{ room.hideSelfView ?
						<SelfViewOnIcon
							aria-label={intl.formatMessage({
								id             : 'room.showSelfView',
								defaultMessage : 'Show self view video'
							})}
						/>
						:
						<SelfViewOffIcon
							aria-label={intl.formatMessage({
								id             : 'room.hideSelfView',
								defaultMessage : 'Hide self view video'
							})}
						/>
					}
					{ room.hideSelfView ?
						<p className={classes.moreAction}>
							<FormattedMessage
								id='room.showSelfView'
								defaultMessage='Show self view video'
							/>
						</p>
						:
						<p className={classes.moreAction}>
							<FormattedMessage
								id='room.hideSelfView'
								defaultMessage='Hide self view video'
							/>
						</p>
					}
				</MenuItem>
				<MenuItem
					onClick={(event) => handleMenuOpen(event, 'localeMenu')}
				>
					<LanguageIcon />
					<p className={classes.moreAction}>
						<FormattedMessage
							id='tooltip.language'
							defaultMessage='Language'
						/>
					</p>
				</MenuItem>
				<MenuItem
					onClick={() => setSettingsOpen(!room.settingsOpen)}
				>
					<SettingsIcon />
					<p className={classes.moreAction}>
						<FormattedMessage
							id='tooltip.settings'
							defaultMessage='Show settings'
						/>
					</p>
				</MenuItem>
				<MenuItem
					onClick={() =>
					{
						handleMenuClose();
						setHelpOpen(!room.helpOpen);
					}}
				>
					<HelpIcon
						aria-label={intl.formatMessage({
							id             : 'room.help',
							defaultMessage : 'Help'
						})}
					/>
					<p className={classes.moreAction}>
						<FormattedMessage
							id='room.help'
							defaultMessage='Help'
						/>
					</p>
				</MenuItem>
				<MenuItem
					onClick={() =>
					{
						handleMenuClose();
						setAboutOpen(!room.aboutOpen);
					}}
				>
					<InfoIcon
						aria-label={intl.formatMessage({
							id             : 'room.about',
							defaultMessage : 'About'
						})}
					/>
					<p className={classes.moreAction}>
						<FormattedMessage
							id='room.about'
							defaultMessage='About'
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
	isMobile             : PropTypes.bool.isRequired,
	peersLength          : PropTypes.number,
	lobbyPeers           : PropTypes.array,
	permanentTopBar      : PropTypes.bool.isRequired,
	drawerOverlayed      : PropTypes.bool.isRequired,
	toolAreaOpen         : PropTypes.bool.isRequired,
	myPicture            : PropTypes.string,
	loggedIn             : PropTypes.bool.isRequired,
	loginEnabled         : PropTypes.bool.isRequired,
	fullscreenEnabled    : PropTypes.bool,
	fullscreen           : PropTypes.bool,
	onFullscreen         : PropTypes.func.isRequired,
	setToolbarsVisible   : PropTypes.func.isRequired,
	setSettingsOpen      : PropTypes.func.isRequired,
	setExtraVideoOpen    : PropTypes.func.isRequired,
	setHelpOpen          : PropTypes.func.isRequired,
	setAboutOpen         : PropTypes.func.isRequired,
	setLockDialogOpen    : PropTypes.func.isRequired,
	setHideSelfView      : PropTypes.func.isRequired,
	toggleToolArea       : PropTypes.func.isRequired,
	openUsersTab         : PropTypes.func.isRequired,
	openFilesTab         : PropTypes.func.isRequired,
	openChatTab          : PropTypes.func.isRequired,
	unread               : PropTypes.number.isRequired,
	newFiles             : PropTypes.number.isRequired,
	raisedHands          : PropTypes.bool.isRequired,
	canProduceExtraVideo : PropTypes.bool.isRequired,
	canLock              : PropTypes.bool.isRequired,
	canPromote           : PropTypes.bool.isRequired,
	classes              : PropTypes.object.isRequired,
	theme                : PropTypes.object.isRequired,
	intl                 : PropTypes.object.isRequired,
	locale               : PropTypes.object.isRequired,
	localesList          : PropTypes.object.isRequired
};

const makeMapStateToProps = () =>
{
	const hasExtraVideoPermission =
		makePermissionSelector(permissions.EXTRA_VIDEO);

	const hasLockPermission =
		makePermissionSelector(permissions.CHANGE_ROOM_LOCK);

	const hasPromotionPermission =
		makePermissionSelector(permissions.PROMOTE_PEER);

	const mapStateToProps = (state) =>
		({
			room                 : state.room,
			isMobile             : state.me.browser.platform === 'mobile',
			peersLength          : peersLengthSelector(state),
			lobbyPeers           : lobbyPeersKeySelector(state),
			permanentTopBar      : state.settings.permanentTopBar,
			drawerOverlayed      : state.settings.drawerOverlayed,
			toolAreaOpen         : state.toolarea.toolAreaOpen,
			loggedIn             : state.me.loggedIn,
			loginEnabled         : state.me.loginEnabled,
			myPicture            : state.me.picture,
			unread               : state.toolarea.unreadMessages,
			newFiles             : state.toolarea.unreadFiles,
			raisedHands          : raisedHandsSelector(state),
			canProduceExtraVideo : hasExtraVideoPermission(state),
			canLock              : hasLockPermission(state),
			canPromote           : hasPromotionPermission(state),
			locale               : state.intl.locale,
			localesList          : state.intl.list
		});

	return mapStateToProps;
};

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
		setHelpOpen : (helpOpen) =>
		{
			dispatch(roomActions.setHelpOpen(helpOpen));
		},
		setAboutOpen : (aboutOpen) =>
		{
			dispatch(roomActions.setAboutOpen(aboutOpen));
		},
		setLockDialogOpen : (lockDialogOpen) =>
		{
			dispatch(roomActions.setLockDialogOpen(lockDialogOpen));
		},
		setHideSelfView : (hideSelfView) =>
		{
			dispatch(roomActions.setHideSelfView(hideSelfView));
		},
		toggleToolArea : () =>
		{
			dispatch(toolareaActions.toggleToolArea());
		},
		openUsersTab : () =>
		{
			dispatch(toolareaActions.openToolArea());
			dispatch(toolareaActions.setToolTab('users'));
		},
		openFilesTab : () =>
		{
			dispatch(toolareaActions.openToolArea());
			dispatch(toolareaActions.setToolTab('files'));
		},
		openChatTab : () =>
		{
			dispatch(toolareaActions.openToolArea());
			dispatch(toolareaActions.setToolTab('chat'));
		}
	});

export default withRoomContext(connect(
	makeMapStateToProps,
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
				prev.settings.drawerOverlayed === next.settings.drawerOverlayed &&
				prev.me.loggedIn === next.me.loggedIn &&
				prev.me.browser === next.me.browser &&
				prev.me.loginEnabled === next.me.loginEnabled &&
				prev.me.picture === next.me.picture &&
				prev.me.roles === next.me.roles &&
				prev.toolarea.unreadMessages === next.toolarea.unreadMessages &&
				prev.toolarea.unreadFiles === next.toolarea.unreadFiles &&
				prev.toolarea.toolAreaOpen === next.toolarea.toolAreaOpen &&
				prev.intl.locale === next.intl.locale &&
				prev.intl.localesList === next.intl.localesList
			);
		}
	}
)(withStyles(styles, { withTheme: true })(TopBar)));

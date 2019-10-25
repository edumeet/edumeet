import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	lobbyPeersKeySelector
} from './Selectors';
import * as appPropTypes from './appPropTypes';
import { withRoomContext } from '../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import * as stateActions from '../actions/stateActions';
import { idle } from '../utils';
import FullScreen from './FullScreen';
import CookieConsent from 'react-cookie-consent';
import CssBaseline from '@material-ui/core/CssBaseline';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';
import Hidden from '@material-ui/core/Hidden';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Avatar from '@material-ui/core/Avatar';
import Badge from '@material-ui/core/Badge';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Notifications from './Notifications/Notifications';
import MeetingDrawer from './MeetingDrawer/MeetingDrawer';
import Democratic from './MeetingViews/Democratic';
import Filmstrip from './MeetingViews/Filmstrip';
import AudioPeers from './PeerAudio/AudioPeers';
import FullScreenView from './VideoContainers/FullScreenView';
import VideoWindow from './VideoWindow/VideoWindow';
import FullScreenIcon from '@material-ui/icons/Fullscreen';
import FullScreenExitIcon from '@material-ui/icons/FullscreenExit';
import SettingsIcon from '@material-ui/icons/Settings';
import SecurityIcon from '@material-ui/icons/Security';
import LockDialog from './AccessControl/LockDialog/LockDialog';
import Button from '@material-ui/core/Button';
import Settings from './Settings/Settings';

const TIMEOUT = 10 * 1000;

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
		message :
		{
			position       : 'absolute',
			display        : 'flex',
			top            : '50%',
			left           : '50%',
			transform      : 'translateX(-50%) translateY(-50%)',
			width          : '30vw',
			padding        : theme.spacing(2),
			flexDirection  : 'column',
			justifyContent : 'center',
			alignItems     : 'center'
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
		toolbar     : theme.mixins.toolbar,
		drawerPaper :
		{
			width                          : '30vw',
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
		},
		meContainer :
		{
			position           : 'fixed',
			zIndex             : 110,
			overflow           : 'hidden',
			boxShadow          : 'var(--me-shadow)',
			transitionProperty : 'border-color',
			transitionDuration : '0.15s',
			top                : '5em',
			left               : '1em',
			border             : 'var(--me-border)',
			'&.active-speaker' :
			{
				borderColor : 'var(--active-speaker-border-color)'
			}
		}
	});

const PulsingBadge = withStyles((theme) =>
	({
		badge :
		{
			backgroundColor : theme.palette.secondary.main,
			// boxShadow       : `0 0 0 2px ${theme.palette.secondary.main}`,
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

class Room extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this.fullscreen = new FullScreen(document);

		this.state =
		{
			fullscreen : false
		};
	}

	waitForHide = idle(() =>
	{
		this.props.setToolbarsVisible(false);
	}, TIMEOUT);

	handleMovement = () =>
	{
		// If the toolbars were hidden, show them again when
		// the user moves their cursor.
		if (!this.props.room.toolbarsVisible)
		{
			this.props.setToolbarsVisible(true);
		}

		this.waitForHide();
	}

	componentDidMount()
	{
		if (this.fullscreen.fullscreenEnabled)
		{
			this.fullscreen.addEventListener('fullscreenchange', this.handleFullscreenChange);
		}

		window.addEventListener('mousemove', this.handleMovement);
		window.addEventListener('touchstart', this.handleMovement);
	}

	componentWillUnmount()
	{
		if (this.fullscreen.fullscreenEnabled)
		{
			this.fullscreen.removeEventListener('fullscreenchange', this.handleFullscreenChange);
		}

		window.removeEventListener('mousemove', this.handleMovement);
		window.removeEventListener('touchstart', this.handleMovement);
	}

	handleToggleFullscreen = () =>
	{
		if (this.fullscreen.fullscreenElement)
		{
			this.fullscreen.exitFullscreen();
		}
		else
		{
			this.fullscreen.requestFullscreen(document.documentElement);
		}
	};

	handleFullscreenChange = () =>
	{
		this.setState({
			fullscreen : this.fullscreen.fullscreenElement !== null
		});
	};

	render()
	{
		const {
			roomClient,
			room,
			lobbyPeers,
			advancedMode,
			myPicture,
			loggedIn,
			loginEnabled,
			setSettingsOpen,
			setLockDialogOpen,
			toolAreaOpen,
			toggleToolArea,
			unread,
			classes,
			theme
		} = this.props;

		const View =
		{
			filmstrip  : Filmstrip,
			democratic : Democratic
		}[room.mode];

		return (
			<div className={classes.root}>
				<CookieConsent>
					This website uses cookies to enhance the user experience.
				</CookieConsent>

				<FullScreenView advancedMode={advancedMode} />

				<VideoWindow advancedMode={advancedMode} />

				<AudioPeers />

				<Notifications />

				<CssBaseline />

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
								aria-label='Open drawer'
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
							<IconButton
								aria-label='Lock'
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
							{ this.fullscreen.fullscreenEnabled &&
								<IconButton
									aria-label='Fullscreen'
									className={classes.actionButton}
									color='inherit'
									onClick={this.handleToggleFullscreen}
								>
									{ this.state.fullscreen ?
										<FullScreenExitIcon />
										:
										<FullScreenIcon />
									}
								</IconButton>
							}
							<IconButton
								aria-label='Settings'
								className={classes.actionButton}
								color='inherit'
								onClick={() => setSettingsOpen(!room.settingsOpen)}
							>
								<SettingsIcon />
							</IconButton>
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
							<Button
								aria-label='Leave meeting'
								className={classes.actionButton}
								variant='contained'
								color='secondary'
								onClick={() => roomClient.close()}
							>
								Leave
							</Button>
						</div>
					</Toolbar>
				</AppBar>
				<nav>
					<Hidden implementation='css'>
						<SwipeableDrawer
							variant='temporary'
							anchor={theme.direction === 'rtl' ? 'right' : 'left'}
							open={toolAreaOpen}
							onClose={() => toggleToolArea()}
							onOpen={() => toggleToolArea()}
							classes={{
								paper : classes.drawerPaper
							}}
						>
							<MeetingDrawer closeDrawer={toggleToolArea} />
						</SwipeableDrawer>
					</Hidden>
				</nav>

				<View advancedMode={advancedMode} />

				<LockDialog />

				<Settings />
			</div>
		);
	}
}

Room.propTypes =
{
	roomClient         : PropTypes.object.isRequired,
	room               : appPropTypes.Room.isRequired,
	lobbyPeers         : PropTypes.array,
	advancedMode       : PropTypes.bool.isRequired,
	myPicture          : PropTypes.string,
	loggedIn           : PropTypes.bool.isRequired,
	loginEnabled       : PropTypes.bool.isRequired,
	toolAreaOpen       : PropTypes.bool.isRequired,
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
		toolAreaOpen : state.toolarea.toolAreaOpen,
		unread       : state.toolarea.unreadMessages +
			state.toolarea.unreadFiles
	});

const mapDispatchToProps = (dispatch) =>
	({
		setToolbarsVisible : (visible) =>
		{
			dispatch(stateActions.setToolbarsVisible(visible));
		},
		setSettingsOpen : (settingsOpen) =>
		{
			dispatch(stateActions.setSettingsOpen({ settingsOpen }));
		},
		setLockDialogOpen : (lockDialogOpen) =>
		{
			dispatch(stateActions.setLockDialogOpen({ lockDialogOpen }));
		},
		toggleToolArea : () =>
		{
			dispatch(stateActions.toggleToolArea());
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
				prev.toolarea.toolAreaOpen === next.toolarea.toolAreaOpen &&
				prev.toolarea.unreadMessages === next.toolarea.unreadMessages &&
				prev.toolarea.unreadFiles === next.toolarea.unreadFiles &&
				prev.settings.advancedMode === next.settings.advancedMode
			);
		}
	}
)(withStyles(styles, { withTheme: true })(Room)));
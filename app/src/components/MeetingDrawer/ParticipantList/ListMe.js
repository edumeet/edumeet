import React, { useState } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import * as appPropTypes from '../../appPropTypes';
import { useIntl, FormattedMessage } from 'react-intl';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import PanIcon from '@material-ui/icons/PanTool';
import Button from '@material-ui/core/Button';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import TextField from '@material-ui/core/TextField';
import { showIframeSelect, makePermissionSelector } from '../../../store/selectors';
import { permissions } from '../../../permissions';
import { config } from '../../../config';

const urlPattern = new RegExp(
	'^(https?:\\/\\/)?' +
	'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
	'((\\d{1,3}\\.){3}\\d{1,3}))' +
	'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
	'(\\?[;&a-z\\d%_.~+=-]*)?' +
	'(\\#[-a-z\\d_]*)?$',
	'i'
);

const styles = (theme) =>
	({
		root :
		{
			display       : 'flex',
			flexDirection : 'column',
			width         : '100%',
			overflowY     : 'auto'
		},
		me :
		{
			width    : '100%',
			overflow : 'hidden',
			cursor   : 'auto',
			display  : 'flex'
		},
		avatar :
		{
			borderRadius : '50%',
			height       : '2rem',
			width        : '2rem',
			objectFit    : 'cover',
			marginTop    : theme.spacing(0.5)
		},
		peerInfo :
		{
			fontSize    : '1rem',
			display     : 'flex',
			paddingLeft : theme.spacing(1),
			flexGrow    : 1,
			alignItems  : 'center'
		},
		buttons :
		{
			padding : theme.spacing(1)
		},
		green :
		{
			color : 'rgba(0, 153, 0, 1)'
		}
	});

const ListMe = (props) =>
{
	const {
		roomClient,
		me,
		iframeUrl,
		toggleIframeInProgress,
		hasScreenPermission,
		settings,
		classes
	} = props;

	const intl = useIntl();

	const [ currentUrl, setCurrentUrl ] = useState('');

	const validateUrl = () =>
	{
		if (currentUrl === '')
			return false;

		if (!urlPattern.test(currentUrl))
			return false;

		if (!currentUrl.toLowerCase().startsWith('https://'))
			return false;

		return true;
	};

	const isValidUrl = validateUrl();

	const picture = me.picture || EmptyAvatar;

	return (
		<div className={classes.root}>
			<div className={classes.me}>
				<img alt='My avatar' className={classes.avatar} src={picture} />
				<div className={classes.peerInfo}>
					{settings.displayName}
				</div>
				<Tooltip
					title={intl.formatMessage({
						id             : 'tooltip.raisedHand',
						defaultMessage : 'Raise hand'
					})}
					placement='bottom'
				>
					<IconButton
						aria-label={intl.formatMessage({
							id             : 'tooltip.raisedHand',
							defaultMessage : 'Raise hand'
						})}
						className={
							classnames(me.raisedHand ? classes.green : null, classes.buttons)
						}
						disabled={me.raisedHandInProgress}
						color='primary'
						onClick={(e) =>
						{
							e.stopPropagation();
							roomClient.setRaisedHand(!me.raisedHand);
						}}
					>
						<PanIcon />
					</IconButton>
				</Tooltip>
			</div>

			{hasScreenPermission &&
			<React.Fragment>
				<TextField
					id='displayname'
					label={intl.formatMessage({
						id             : 'label.iframeAppUrl',
						defaultMessage : 'External app URL to open for all (https only)'
					})}
					value={iframeUrl ?? currentUrl}
					variant='outlined'
					margin='normal'
					disabled={iframeUrl}
					onChange={(event) => setCurrentUrl(event.target.value.trim())}
					fullWidth
				/>
				{iframeUrl &&
				<Button
					aria-label={intl.formatMessage({
						id             : 'room.hideIframe',
						defaultMessage : 'Hide external app'
					})}
					className={classes.button}
					variant='contained'
					color='secondary'
					disabled={toggleIframeInProgress}
					onClick={() => roomClient.toggleIframe(null)}
				>
					<FormattedMessage
						id='room.hideIframe'
						defaultMessage='Hide external app'
					/>
				</Button>
				}
				{!iframeUrl &&
				<Button
					aria-label={intl.formatMessage({
						id             : 'room.showIframe',
						defaultMessage : 'Show external app'
					})}
					className={classes.button}
					variant='contained'
					color='secondary'
					disabled={toggleIframeInProgress || !isValidUrl}
					onClick={() =>
					{
						roomClient.toggleIframe(currentUrl);
						setCurrentUrl('');
					}}
				>
					<FormattedMessage
						id='room.showIframe'
						defaultMessage='Show external app'
					/>
				</Button>
				}
			</React.Fragment>
			}
		</div>
	);
};

ListMe.propTypes =
{
	roomClient             : PropTypes.object.isRequired,
	me                     : appPropTypes.Me.isRequired,
	iframeUrl              : PropTypes.string,
	toggleIframeInProgress : PropTypes.bool,
	hasScreenPermission    : PropTypes.bool.isRequired,
	settings               : PropTypes.object.isRequired,
	classes                : PropTypes.object.isRequired
};

const makeMapStateToProps = () =>
{
	const canShareScreen =
		makePermissionSelector(permissions.SHARE_SCREEN);

	const mapStateToProps = (state) => ({
		me                     : state.me,
		iframeUrl              : showIframeSelect(state),
		toggleIframeInProgress : state.room.toggleIframeInProgress,
		hasScreenPermission    : canShareScreen(state),
		settings               : state.settings
	});

	return mapStateToProps;
};

export default withRoomContext(connect(
	makeMapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me === next.me &&
				prev.room.iframeUrl === next.room.iframeUrl &&
				prev.room.toggleIframeInProgress === next.room.toggleIframeInProgress &&
				prev.settings === next.settings
			);
		}
	}
)(withStyles(styles)(ListMe)));

import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from '../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import * as roomActions from '../../actions/roomActions';
import * as settingsActions from '../../actions/settingsActions';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';

const styles = (theme) =>
	({
		setting :
		{
			padding : theme.spacing(2)
		},
		formControl :
		{
			display : 'flex'
		},
		switchLabel : {
			justifyContent : 'space-between',
			flex           : 'auto',
			display        : 'flex',
			padding        : theme.spacing(1),
			marginRight    : 0
		}
	});

const AppearenceSettings = ({
	isMobile,
	room,
	settings,
	onTogglePermanentTopBar,
	onToggleHiddenControls,
	onToggleButtonControlBar,
	onToggleShowNotifications,
	onToggleDrawerOverlayed,
	handleChangeMode,
	classes
}) =>
{
	const intl = useIntl();

	const modes = [ {
		value : 'democratic',
		label : intl.formatMessage({
			id             : 'label.democratic',
			defaultMessage : 'Democratic view'
		})
	}, {
		value : 'filmstrip',
		label : intl.formatMessage({
			id             : 'label.filmstrip',
			defaultMessage : 'Filmstrip view'
		})
	} ];

	return (
		<React.Fragment>
			<form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={room.mode || ''}
						onChange={(event) =>
						{
							if (event.target.value)
								handleChangeMode(event.target.value);
						}}
						name={intl.formatMessage({
							id             : 'settings.layout',
							defaultMessage : 'Room layout'
						})}
						autoWidth
						className={classes.selectEmpty}
					>
						{ modes.map((mode, index) =>
						{
							return (
								<MenuItem key={index} value={mode.value}>
									{mode.label}
								</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						<FormattedMessage
							id='settings.selectRoomLayout'
							defaultMessage='Select room layout'
						/>
					</FormHelperText>
				</FormControl>
			</form>
			<FormControlLabel
				className={classnames(classes.setting, classes.switchLabel)}
				control={
					<Switch checked={settings.permanentTopBar} onChange={onTogglePermanentTopBar} value='permanentTopBar' />}
				labelPlacement='start'
				label={intl.formatMessage({
					id             : 'settings.permanentTopBar',
					defaultMessage : 'Permanent top bar'
				})}
			/>
			<FormControlLabel
				className={classnames(classes.setting, classes.switchLabel)}
				control={<Switch checked={settings.hiddenControls} onChange={onToggleHiddenControls} value='hiddenControls' />}
				labelPlacement='start'
				label={intl.formatMessage({
					id             : 'settings.hiddenControls',
					defaultMessage : 'Hidden media controls'
				})}
			/>
			<FormControlLabel
				className={classnames(classes.setting, classes.switchLabel)}
				control={<Switch checked={settings.buttonControlBar} onChange={onToggleButtonControlBar} value='buttonControlBar' />}
				labelPlacement='start'
				label={intl.formatMessage({
					id             : 'settings.buttonControlBar',
					defaultMessage : 'Separate media controls'
				})}
			/>
			{ !isMobile &&
				<FormControlLabel
					className={classnames(classes.setting, classes.switchLabel)}
					control={<Switch checked={settings.drawerOverlayed} onChange={onToggleDrawerOverlayed} value='drawerOverlayed' />}
					labelPlacement='start'
					label={intl.formatMessage({
						id             : 'settings.drawerOverlayed',
						defaultMessage : 'Side drawer over content'
					})}
				/>
			}
			<FormControlLabel
				className={classnames(classes.setting, classes.switchLabel)}
				control={<Switch checked={settings.showNotifications} onChange={onToggleShowNotifications} value='showNotifications' />}
				labelPlacement='start'
				label={intl.formatMessage({
					id             : 'settings.showNotifications',
					defaultMessage : 'Show notifications'
				})}
			/>
		</React.Fragment>
	);
};

AppearenceSettings.propTypes =
{
	isMobile                  : PropTypes.bool.isRequired,
	room                      : appPropTypes.Room.isRequired,
	settings                  : PropTypes.object.isRequired,
	onTogglePermanentTopBar   : PropTypes.func.isRequired,
	onToggleHiddenControls    : PropTypes.func.isRequired,
	onToggleButtonControlBar  : PropTypes.func.isRequired,
	onToggleShowNotifications : PropTypes.func.isRequired,
	onToggleDrawerOverlayed   : PropTypes.func.isRequired,
	handleChangeMode          : PropTypes.func.isRequired,
	classes                   : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		isMobile : state.me.browser.platform === 'mobile',
		room     : state.room,
		settings : state.settings
	});

const mapDispatchToProps = {
	onTogglePermanentTopBar   : settingsActions.togglePermanentTopBar,
	onToggleHiddenControls    : settingsActions.toggleHiddenControls,
	onToggleShowNotifications : settingsActions.toggleShowNotifications,
	onToggleButtonControlBar  : settingsActions.toggleButtonControlBar,
	onToggleDrawerOverlayed   : settingsActions.toggleDrawerOverlayed,
	handleChangeMode          : roomActions.setDisplayMode
};

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me.browser === next.me.browser &&
				prev.room === next.room &&
				prev.settings === next.settings
			);
		}
	}
)(withStyles(styles)(AppearenceSettings));
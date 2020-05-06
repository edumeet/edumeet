import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from '../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import * as roomActions from '../../actions/roomActions';
import * as settingsActions from '../../actions/settingsActions';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';

const styles = (theme) =>
	({
		setting :
		{
			padding : theme.spacing(2)
		},
		formControl :
		{
			display : 'flex'
		}
	});

const AppearenceSettings = ({
	room,
	settings,
	onTogglePermanentTopBar,
	onToggleHiddenControls,
	onToggleShowNotifications,
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
				className={classes.setting}
				control={<Checkbox checked={settings.permanentTopBar} onChange={onTogglePermanentTopBar} value='permanentTopBar' />}
				label={intl.formatMessage({
					id             : 'settings.permanentTopBar',
					defaultMessage : 'Permanent top bar'
				})}
			/>
			<FormControlLabel
				className={classes.setting}
				control={<Checkbox checked={settings.hiddenControls} onChange={onToggleHiddenControls} value='hiddenControls' />}
				label={intl.formatMessage({
					id             : 'settings.hiddenControls',
					defaultMessage : 'Hidden media controls'
				})}
			/>
			<FormControlLabel
				className={classes.setting}
				control={<Checkbox checked={settings.showNotifications} onChange={onToggleShowNotifications} value='showNotifications' />}
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
	room                      : appPropTypes.Room.isRequired,
	settings                  : PropTypes.object.isRequired,
	onTogglePermanentTopBar   : PropTypes.func.isRequired,
	onToggleHiddenControls    : PropTypes.func.isRequired,
	onToggleShowNotifications : PropTypes.func.isRequired,
	handleChangeMode          : PropTypes.func.isRequired,
	classes                   : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		room     : state.room,
		settings : state.settings
	});

const mapDispatchToProps = {
	onTogglePermanentTopBar   : settingsActions.togglePermanentTopBar,
	onToggleHiddenControls    : settingsActions.toggleHiddenControls,
	onToggleShowNotifications : settingsActions.toggleShowNotifications,
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
				prev.room === next.room &&
				prev.settings === next.settings
			);
		}
	}
)(withStyles(styles)(AppearenceSettings));
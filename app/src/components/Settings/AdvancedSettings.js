import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
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

const AdvancedSettings = ({
	roomClient,
	settings,
	onToggleAdvancedMode,
	classes
}) =>
{
	const intl = useIntl();

	return (
		<React.Fragment>
			<FormControlLabel
				className={classes.setting}
				control={<Checkbox checked={settings.advancedMode} onChange={onToggleAdvancedMode} value='advancedMode' />}
				label={intl.formatMessage({
					id             : 'settings.advancedMode',
					defaultMessage : 'Advanced mode'
				})}
			/>
			{ !window.config.lockLastN &&
				<form className={classes.setting} autoComplete='off'>
					<FormControl className={classes.formControl}>
						<Select
							value={settings.lastN || ''}
							onChange={(event) =>
							{
								if (event.target.value)
									roomClient.changeMaxSpotlights(event.target.value);
							}}
							name='Last N'
							autoWidth
							className={classes.selectEmpty}
						>
							{ Array.from(
								{ length: window.config.maxLastN || 10 },
								(_, i) => i + 1
							).map((lastN) =>
							{
								return (
									<MenuItem key={lastN} value={lastN}>
										{lastN}
									</MenuItem>
								);
							})}
						</Select>
						<FormHelperText>
							<FormattedMessage
								id='settings.lastn'
								defaultMessage='Number of visible videos'
							/>
						</FormHelperText>
					</FormControl>
				</form>
			}
		</React.Fragment>
	);
};

AdvancedSettings.propTypes =
{
	roomClient           : PropTypes.any.isRequired,
	settings             : PropTypes.object.isRequired,
	onToggleAdvancedMode : PropTypes.func.isRequired,
	classes              : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		settings : state.settings
	});

const mapDispatchToProps = {
	onToggleAdvancedMode : settingsActions.toggleAdvancedMode
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.settings === next.settings
			);
		}
	}
)(withStyles(styles)(AdvancedSettings)));
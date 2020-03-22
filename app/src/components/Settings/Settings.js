import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from '../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import * as roomActions from '../../actions/roomActions';
import * as settingsActions from '../../actions/settingsActions';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';

const styles = (theme) =>
	({
		root :
		{
		},
		dialogPaper :
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
		setting :
		{
			padding : theme.spacing(2)
		},
		formControl :
		{
			display : 'flex'
		}
	});

const Settings = ({
	roomClient,
	room,
	me,
	settings,
	onToggleAdvancedMode,
	onTogglePermanentTopBar,
	handleCloseSettings,
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
	
	const resolutions = [ {
		value : 'low',
		label : intl.formatMessage({
			id             : 'label.low',
			defaultMessage : 'Low'
		})
	},
	{
		value : 'medium',
		label : intl.formatMessage({
			id             : 'label.medium',
			defaultMessage : 'Medium'
		})
	},
	{
		value : 'high',
		label : intl.formatMessage({
			id             : 'label.high',
			defaultMessage : 'High (HD)'
		})
	},
	{
		value : 'veryhigh',
		label : intl.formatMessage({
			id             : 'label.veryHigh',
			defaultMessage : 'Very high (FHD)'
		})
	},
	{
		value : 'ultra',
		label : intl.formatMessage({
			id             : 'label.ultra',
			defaultMessage : 'Ultra (UHD)'
		})
	} ];

	let webcams;

	if (me.webcamDevices)
		webcams = Object.values(me.webcamDevices);
	else
		webcams = [];

	let audioDevices;

	if (me.audioDevices)
		audioDevices = Object.values(me.audioDevices);
	else
		audioDevices = [];

	return (
		<Dialog
			className={classes.root}
			open={room.settingsOpen}
			onClose={() => handleCloseSettings({ settingsOpen: false })}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>
				<FormattedMessage
					id='settings.settings'
					defaultMessage='Settings'
				/>
			</DialogTitle>
			<form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={settings.selectedWebcam || ''}
						onChange={(event) =>
						{
							if (event.target.value)
								roomClient.changeWebcam(event.target.value);
						}}
						displayEmpty
						name={intl.formatMessage({
							id             : 'settings.camera',
							defaultMessage : 'Camera'
						})}
						autoWidth
						className={classes.selectEmpty}
						disabled={webcams.length === 0 || me.webcamInProgress}
					>
						{ webcams.map((webcam, index) =>
						{
							return (
								<MenuItem key={index} value={webcam.deviceId}>{webcam.label}</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						{ webcams.length > 0 ?
							intl.formatMessage({
								id             : 'settings.selectCamera',
								defaultMessage : 'Select video device'
							})
							:
							intl.formatMessage({
								id             : 'settings.cantSelectCamera',
								defaultMessage : 'Unable to select video device'
							})
						}
					</FormHelperText>
				</FormControl>
			</form>
			<form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={settings.selectedAudioDevice || ''}
						onChange={(event) =>
						{
							if (event.target.value)
								roomClient.changeAudioDevice(event.target.value);
						}}
						displayEmpty
						name={intl.formatMessage({
							id             : 'settings.audio',
							defaultMessage : 'Audio device'
						})}
						autoWidth
						className={classes.selectEmpty}
						disabled={audioDevices.length === 0 || me.audioInProgress}
					>
						{ audioDevices.map((audio, index) =>
						{
							return (
								<MenuItem key={index} value={audio.deviceId}>{audio.label}</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						{ audioDevices.length > 0 ?
							intl.formatMessage({
								id             : 'settings.selectAudio',
								defaultMessage : 'Select audio device'
							})
							:
							intl.formatMessage({
								id             : 'settings.cantSelectAudio',
								defaultMessage : 'Unable to select audio device'
							})
						}
					</FormHelperText>
				</FormControl>
			</form>
			<form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={settings.resolution || ''}
						onChange={(event) =>
						{
							if (event.target.value)
								roomClient.changeVideoResolution(event.target.value);
						}}
						name='Video resolution'
						autoWidth
						className={classes.selectEmpty}
					>
						{ resolutions.map((resolution, index) =>
						{
							return (
								<MenuItem key={index} value={resolution.value}>
									{resolution.label}
								</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						<FormattedMessage
							id='settings.resolution'
							defaultMessage='Select your video resolution'
						/>
					</FormHelperText>
				</FormControl>
			</form>
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
				control={<Checkbox checked={settings.advancedMode} onChange={onToggleAdvancedMode} value='advancedMode' />}
				label={intl.formatMessage({
					id             : 'settings.advancedMode',
					defaultMessage : 'Advanced mode'
				})}
			/>
			{ settings.advancedMode &&
				<React.Fragment>
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
								{ [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ].map((lastN) =>
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
					<FormControlLabel
						className={classes.setting}
						control={<Checkbox checked={settings.permanentTopBar} onChange={onTogglePermanentTopBar} value='permanentTopBar' />}
						label={intl.formatMessage({
							id             : 'settings.permanentTopBar',
							defaultMessage : 'Permanent top bar'
						})}
					/>
				</React.Fragment>
			}
			<DialogActions>
				<Button onClick={() => handleCloseSettings({ settingsOpen: false })} color='primary'>
					<FormattedMessage
						id='label.close'
						defaultMessage='Close'
					/>
				</Button>
			</DialogActions>
		</Dialog>
	);
};

Settings.propTypes =
{
	roomClient           : PropTypes.any.isRequired,
	me                   : appPropTypes.Me.isRequired,
	room                 : appPropTypes.Room.isRequired,
	settings             : PropTypes.object.isRequired,
	onToggleAdvancedMode : PropTypes.func.isRequired,
	onTogglePermanentTopBar : PropTypes.func.isRequired,
	handleChangeMode     : PropTypes.func.isRequired,
	handleCloseSettings  : PropTypes.func.isRequired,
	classes              : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		me       : state.me,
		room     : state.room,
		settings : state.settings
	};
};

const mapDispatchToProps = {
	onToggleAdvancedMode : settingsActions.toggleAdvancedMode,
	onTogglePermanentTopBar : settingsActions.togglePermanentTopBar,
	handleChangeMode     : roomActions.setDisplayMode,
	handleCloseSettings  : roomActions.setSettingsOpen
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me === next.me &&
				prev.room === next.room &&
				prev.settings === next.settings
			);
		}
	}
)(withStyles(styles)(Settings)));
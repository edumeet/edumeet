import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from '../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import * as stateActions from '../../actions/stateActions';
import PropTypes from 'prop-types';
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
			padding : theme.spacing.unit * 2
		},
		formControl :
		{
			display : 'flex'
		}
	});

/* const modes = [ {
	value : 'democratic',
	label : 'Democratic view'
}, {
	value : 'filmstrip',
	label : 'Filmstrip view'
} ]; */

const Settings = ({
	roomClient,
	room,
	me,
	settings,
	onToggleAdvancedMode,
	// handleChangeMode,
	handleCloseSettings,
	classes
}) =>
{
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
			<DialogTitle id='form-dialog-title'>Settings</DialogTitle>
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
						name='Camera'
						autoWidth
						className={classes.selectEmpty}
						disabled={webcams.length === 0}
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
							'Select video device'
							:
							'Unable to select video device'
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
						name='Audio device'
						autoWidth
						className={classes.selectEmpty}
						disabled={audioDevices.length === 0}
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
							'Select audio device'
							:
							'Unable to select audio device'
						}
					</FormHelperText>
				</FormControl>
			</form>
			<FormControlLabel
				className={classes.setting}
				control={<Checkbox checked={settings.advancedMode} onChange={onToggleAdvancedMode} value='advancedMode' />}
				label='Advanced mode'
			/>
			{ /* <form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={room.mode || ''}
						onChange={(event) => handleChangeMode(event.target.value)}
						name='Room mode'
						autoWidth
						className={classes.selectEmpty}
					>
						{ modes.map((mode, index) =>
						{
							return (
								<MenuItem key={index} value={mode.value}>{mode.label}</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						Select room layout
					</FormHelperText>
				</FormControl>
			</form> */ }
			<DialogActions>
				<Button onClick={() => handleCloseSettings({ settingsOpen: false })} color='primary'>
					Close
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
	onToggleAdvancedMode : stateActions.toggleAdvancedMode,
	handleChangeMode     : stateActions.setDisplayMode,
	handleCloseSettings  : stateActions.setSettingsOpen
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
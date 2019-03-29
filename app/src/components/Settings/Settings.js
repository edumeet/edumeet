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
import Select from '@material-ui/core/Select';

const styles = (theme) =>
	({
		root :
		{
		},
		device :
		{
			width   : '20vw',
			padding : theme.spacing.unit * 2
		},
		formControl :
		{
			display : 'flex',
		}
	});

const Settings = ({
	roomClient,
	room,
	me,
	onToggleAdvancedMode,
	handleChangeMode,
	handleCloseSettings,
	classes
}) =>
{
	let webcams;

	if (me.webcamDevices)
		webcams = Array.from(me.webcamDevices.values());
	else
		webcams = [];

	let audioDevices;

	if (me.audioDevices)
		audioDevices = Array.from(me.audioDevices.values());
	else
		audioDevices = [];

	return (
		<Dialog
			className={classes.root}
			open={room.settingsOpen}
			onClose={() => handleCloseSettings({ settingsOpen: false })}
		>
			<DialogTitle id="form-dialog-title">Settings</DialogTitle>
			<form className={classes.device} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={me.selectedWebcam || ''}
						onChange={(event) => event.target.value ? roomClient.changeWebcam(event.target.value) : null }
						displayEmpty
						name='Camera'
						autoWidth
						className={classes.selectEmpty}
						// disabled={!me.canChangeWebcam}
					>
						<MenuItem value='' />
						{ webcams.map((webcam, index) =>
						{
							return (
								<MenuItem key={index} value={webcam.deviceId}>{webcam.label}</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						Select camera device
					</FormHelperText>
				</FormControl>
			</form>
			<form className={classes.device} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={me.selectedAudioDevice || ''}
						onChange={(event) => event.target.value ? roomClient.changeAudioDevice(event.target.value) : null }
						displayEmpty
						name='Audio device'
						autoWidth
						className={classes.selectEmpty}
						disabled={!me.canChangeAudioDevice}
					>
						<MenuItem value='' />
						{ audioDevices.map((audio, index) =>
						{
							return (
								<MenuItem key={index} value={audio.deviceId}>{audio.label}</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						{ me.canChangeAudioDevice ?
							'Select audio device'
							:
							'Unable to select audio device'
						}
					</FormHelperText>
				</FormControl>
			</form>
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
	onToggleAdvancedMode : PropTypes.func.isRequired,
	handleChangeMode     : PropTypes.func.isRequired,
	classes              : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		me   : state.me,
		room : state.room
	};
};

const mapDispatchToProps = {
	onToggleAdvancedMode : stateActions.toggleAdvancedMode,
	handleChangeMode     : stateActions.setDisplayMode,
	handleCloseSettings  : stateActions.setSettingsOpen
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(Settings)));
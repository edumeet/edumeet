import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
import * as stateActions from '../redux/stateActions';
import PropTypes from 'prop-types';
import Dropdown from 'react-dropdown';

const modes = [ {
	value : 'democratic',
	label : 'Democratic view'
}, {
	value : 'filmstrip',
	label : 'Filmstrip view'
} ];

const findOption = (options, value) => options.find((option) => option.value === value);

const Settings = ({
	room, me, onToggleAdvancedMode, handleChangeWebcam,
	handleChangeAudioDevice, handleChangeMode
}) =>
{
	let webcams;

	if (me.webcamDevices)
		webcams = Array.from(me.webcamDevices.values());
	else
		webcams = [];

	let audioDevices;
	let audioDevicesText;

	if (me.canChangeAudioDevice)
		audioDevicesText = 'Select audio input device';
	else
		audioDevicesText = 'Unable to select audio input device';

	if (me.audioDevices)
		audioDevices = Array.from(me.audioDevices.values());
	else
		audioDevices = [];

	return (
		<div data-component='Settings'>
			<div className='settings'>
				<Dropdown
					options={webcams}
					value={findOption(webcams, me.selectedWebcam)}
					onChange={(webcam) => handleChangeWebcam(webcam.value)}
					placeholder={'Select camera'}
				/>

				<Dropdown
					disabled={!me.canChangeAudioDevice}
					options={audioDevices}
					value={findOption(audioDevices, me.selectedAudioDevice)}
					onChange={(device) => handleChangeAudioDevice(device.value)}
					placeholder={audioDevicesText}
				/>

				<input
					id='room-mode'
					type='checkbox'
					checked={room.advancedMode}
					onChange={onToggleAdvancedMode}
				/>
				<label htmlFor='room-mode'>Advanced mode</label>

				<Dropdown
					options={modes}
					value={findOption(modes, room.mode)}
					onChange={(mode) => handleChangeMode(mode.value)}
				/>
			</div>
		</div>
	);
};

Settings.propTypes =
{
	me                      : appPropTypes.Me.isRequired,
	room                    : appPropTypes.Room.isRequired,
	handleChangeWebcam      : PropTypes.func.isRequired,
	handleChangeAudioDevice : PropTypes.func.isRequired,
	onToggleAdvancedMode    : PropTypes.func.isRequired,
	handleChangeMode        : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		me   : state.me,
		room : state.room
	};
};

const mapDispatchToProps = {
	handleChangeWebcam      : requestActions.changeWebcam,
	handleChangeAudioDevice : requestActions.changeAudioDevice,
	onToggleAdvancedMode    : stateActions.toggleAdvancedMode,
	handleChangeMode        : stateActions.setDisplayMode
};

const SettingsContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Settings);

export default SettingsContainer;

import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from './appPropTypes';
import { withRoomContext } from '../RoomContext';
import * as stateActions from '../redux/stateActions';
import PropTypes from 'prop-types';
import Dropdown from 'react-dropdown';
import ReactTooltip from 'react-tooltip';

const modes = [ {
	value : 'democratic',
	label : 'Democratic view'
}, {
	value : 'filmstrip',
	label : 'Filmstrip view'
} ];

const findOption = (options, value) => options.find((option) => option.value === value);

const Settings = ({
	roomClient,
	room,
	me,
	onToggleAdvancedMode,
	handleChangeMode
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
					onChange={(webcam) => roomClient.changeWebcam(webcam.value)}
					placeholder={'Select camera'}
				/>

				<Dropdown
					disabled={!me.canChangeAudioDevice}
					options={audioDevices}
					value={findOption(audioDevices, me.selectedAudioDevice)}
					onChange={(device) => roomClient.changeAudioDevice(device.value)}
					placeholder={audioDevicesText}
				/>
				<ReactTooltip
					effect='solid'
				/>
				<div
					data-tip='keyboard shortcut: &lsquo;a&lsquo;'
					data-type='dark'
					data-place='left'
				>
					<input
						id='room-mode'
						type='checkbox'
						checked={room.advancedMode}
						onChange={onToggleAdvancedMode}
					/>
					<label htmlFor='room-mode'>Advanced mode</label>
				</div>

				<div
					data-tip='keyboard shortcut: type a digit'
					data-type='dark'
					data-place='left'
				>
					<Dropdown
						options={modes}
						value={findOption(modes, room.mode)}
						onChange={(mode) => handleChangeMode(mode.value)}
					/>
				</div>
			</div>
		</div>
	);
};

Settings.propTypes =
{
	roomClient           : PropTypes.any.isRequired,
	me                   : appPropTypes.Me.isRequired,
	room                 : appPropTypes.Room.isRequired,
	onToggleAdvancedMode : PropTypes.func.isRequired,
	handleChangeMode     : PropTypes.func.isRequired
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
	handleChangeMode     : stateActions.setDisplayMode
};

const SettingsContainer = withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps
)(Settings));

export default SettingsContainer;

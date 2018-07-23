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

class Settings extends React.Component
{
	state = {
		selectedCamera      : null,
		selectedAudioDevice : null,
		selectedMode        : modes[0]
	};

	handleChangeWebcam = (webcam) =>
	{
		this.props.handleChangeWebcam(webcam.value);

		this.setState({
			selectedCamera : webcam
		});
	}

	handleChangeAudioDevice = (device) =>
	{
		this.props.handleChangeAudioDevice(device.value);

		this.setState({
			selectedAudioDevice : device
		});
	}
	
	handleChangeMode = (mode) =>
	{
		this.setState({
			selectedMode : mode
		});

		this.props.handleChangeMode(mode.value);
	};

	render()
	{	
		const {
			room,
			me,
			onToggleAdvancedMode
		} = this.props;

		let webcams;
		let webcamText;

		if (me.canChangeWebcam)
			webcamText = 'Select camera';
		else
			webcamText = 'Unable to select camera';

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
						disabled={!me.canChangeWebcam}
						options={webcams}
						value={this.state.selectedCamera}
						onChange={this.handleChangeWebcam}
						placeholder={webcamText}
					/>
				
					<Dropdown
						disabled={!me.canChangeAudioDevice}
						options={audioDevices}
						value={this.state.selectedAudioDevice}
						onChange={this.handleChangeAudioDevice}
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
						value={this.state.selectedMode}
						onChange={this.handleChangeMode}
					/>
				</div>
			</div>
		);
	}
}

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

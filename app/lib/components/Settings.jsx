import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
import * as stateActions from '../redux/stateActions';
import PropTypes from 'prop-types';
import Dropdown from 'react-dropdown';

class Settings extends React.Component
{
	state = {
		selectedCamera: null,
		selectedAudioDevice: null
	};

	handleChangeWebcam = (webcam) =>
	{
		this.props.handleChangeWebcam(webcam);

		this.setState({
			selectedCamera: webcam
		});
	}

	handleChangeAudioDevice = (device) =>
	{
		this.props.handleChangeAudioDevice(device);

		this.setState({
			selectedAudioDevice: device
		});
	}
	
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
	onToggleAdvancedMode    : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		me   : state.me,
		room : state.room
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		handleChangeWebcam : (device) =>
		{
			dispatch(requestActions.changeWebcam(device.value));
		},
		handleChangeAudioDevice : (device) =>
		{
			dispatch(requestActions.changeAudioDevice(device.value));
		},
		onToggleAdvancedMode : () =>
		{
			dispatch(stateActions.toggleAdvancedMode());
		}
	};
};

const SettingsContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Settings);

export default SettingsContainer;

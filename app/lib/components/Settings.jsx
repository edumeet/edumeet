import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
import * as stateActions from '../redux/stateActions';
import PropTypes from 'prop-types';
import Dropdown from 'react-dropdown';

class Settings extends React.Component
{
	constructor(props)
	{
		super(props);
	}

	render()
	{
		const {
			room,
			me,
			handleChangeWebcam,
			handleChangeAudioDevice,
			onToggleAdvancedMode
		} = this.props;

		let webcams;
		let webcamText;

		if (me.canChangeWebcam)
			webcamText = 'Select camera';
		else
			webcamText = 'Unable to select camera';

		if (me.webcamDevices)
			webcams = Object.values(me.webcamDevices);
		else
			webcams = [];

		let audioDevices;
		let audioDevicesText;

		if (me.canChangeAudioDevice)
			audioDevicesText = 'Select audio input device';
		else
			audioDevicesText = 'Unable to select audio input device';

		if (me.audioDevices)
			audioDevices = Object.values(me.audioDevices);
		else
			audioDevices = [];

		return (
			<div data-component='Settings'>
				<div className='settings'>
					<Dropdown
						disabled={!me.canChangeWebcam}
						options={webcams}
						onChange={handleChangeWebcam}
						placeholder={webcamText}
					/>
					<Dropdown
						disabled={!me.canChangeAudioDevice}
						options={audioDevices}
						onChange={handleChangeAudioDevice}
						placeholder={audioDevicesText}
					/>
					<input
						type='checkbox'
						defaultChecked={room.advancedMode}
						onChange={onToggleAdvancedMode}
					/>
					<span>Advanced mode</span>
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

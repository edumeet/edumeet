import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
import PropTypes from 'prop-types';
import { Appear } from './transitions';
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
			onToggleSettings
		} = this.props;

		if (!room.showSettings)
			return null;

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
			<Appear duration={500}>
				<div data-component='Settings'>
					<div className='dialog'>
						<div className='header'>
							<span>Settings</span>
						</div>
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
						</div>
						<div className='footer'>
							<span
								className='button'
								onClick={() => onToggleSettings()}
							>
								Close
							</span>
						</div>
					</div>
				</div>
			</Appear>
		);
	}
}

Settings.propTypes =
{
	me                      : appPropTypes.Me.isRequired,
	room                    : appPropTypes.Room.isRequired,
	onToggleSettings        : PropTypes.func.isRequired,
	handleChangeWebcam      : PropTypes.func.isRequired,
	handleChangeAudioDevice : PropTypes.func.isRequired
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
		}
	};
};

const SettingsContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Settings);

export default SettingsContainer;

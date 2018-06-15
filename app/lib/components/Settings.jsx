import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
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
			onToggleSettings
		} = this.props;

		if (!room.showSettings)
			return null;

		const webcams = Object.values(me.webcamDevices);

		return (
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
							value={webcams[0]}
							placeholder='No other cameras detected'
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
		);
	}
}

Settings.propTypes =
{
	me                 : appPropTypes.Me.isRequired,
	room               : appPropTypes.Room.isRequired,
	onToggleSettings   : PropTypes.func.isRequired,
	handleChangeWebcam : PropTypes.func.isRequired
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
		}
	};
};

const SettingsContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Settings);

export default SettingsContainer;

import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from '../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

const styles = (theme) =>
	({
		setting :
		{
			padding : theme.spacing(2)
		},
		formControl :
		{
			display : 'flex'
		}
	});

const MediaSettings = ({
	roomClient,
	me,
	settings,
	classes
}) =>
{
	const intl = useIntl();
	
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
		
	let audioOutputDevices;

	if (me.audioOutputDevices)
		audioOutputDevices = Object.values(me.audioOutputDevices);
	else
		audioOutputDevices = [];

	return (
		<React.Fragment>
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
			{ 'audioOutputSupportedBrowsers' in window.config &&
				window.config.audioOutputSupportedBrowsers.includes(me.browser.name) &&
				<form className={classes.setting} autoComplete='off'>
					<FormControl className={classes.formControl}>
						<Select
							value={settings.selectedAudioOutputDevice || ''}
							onChange={(event) =>
							{
								if (event.target.value)
									roomClient.changeAudioOutputDevice(event.target.value);
							}}
							displayEmpty
							name={intl.formatMessage({
								id             : 'settings.audioOutput',
								defaultMessage : 'Audio output device'
							})}
							autoWidth
							className={classes.selectEmpty}
							disabled={audioOutputDevices.length === 0 || me.audioOutputInProgress}
						>
							{ audioOutputDevices.map((audioOutput, index) =>
							{
								return (
									<MenuItem
										key={index}
										value={audioOutput.deviceId}
									>
										{audioOutput.label}
									</MenuItem>
								);
							})}
						</Select>
						<FormHelperText>
							{ audioOutputDevices.length > 0 ?
								intl.formatMessage({
									id             : 'settings.selectAudioOutput',
									defaultMessage : 'Select audio output device'
								})
								:
								intl.formatMessage({
									id             : 'settings.cantSelectAudioOutput',
									defaultMessage : 'Unable to select audio output device'
								})
							}
						</FormHelperText>
					</FormControl>
				</form>
			}
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
		</React.Fragment>
	);
};

MediaSettings.propTypes =
{
	roomClient : PropTypes.any.isRequired,
	me         : appPropTypes.Me.isRequired,
	settings   : PropTypes.object.isRequired,
	classes    : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		me       : state.me,
		settings : state.settings
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me === next.me &&
				prev.settings === next.settings
			);
		}
	}
)(withStyles(styles)(MediaSettings)));
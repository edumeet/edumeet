import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import * as roomActions from '../../actions/roomActions';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
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
			padding : theme.spacing(2)
		},
		formControl :
		{
			display : 'flex'
		}
	});

const ExtraVideo = ({
	roomClient,
	extraVideoOpen,
	webcamDevices,
	handleCloseExtraVideo,
	classes
}) =>
{
	const intl = useIntl();

	const [ videoDevice, setVideoDevice ] = React.useState('');

	const handleChange = (event) =>
	{
		setVideoDevice(event.target.value);
	};

	let videoDevices;

	if (webcamDevices)
		videoDevices = Object.values(webcamDevices);
	else
		videoDevices = [];

	return (
		<Dialog
			open={extraVideoOpen}
			onClose={() => handleCloseExtraVideo(false)}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>
				<FormattedMessage
					id='room.extraVideo'
					defaultMessage='Extra video'
				/>
			</DialogTitle>
			<form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={videoDevice}
						displayEmpty
						name={intl.formatMessage({
							id             : 'settings.camera',
							defaultMessage : 'Camera'
						})}
						autoWidth
						className={classes.selectEmpty}
						disabled={videoDevices.length === 0}
						onChange={handleChange}
					>
						{ videoDevices.map((webcam, index) =>
						{
							return (
								<MenuItem key={index} value={webcam.deviceId}>{webcam.label}</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						{ videoDevices.length > 0 ?
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
			<DialogActions>
				<Button onClick={() => roomClient.addExtraVideo(videoDevice)} color='primary'>
					<FormattedMessage
						id='label.addVideo'
						defaultMessage='Add video'
					/>
				</Button>
			</DialogActions>
		</Dialog>
	);
};

ExtraVideo.propTypes =
{
	roomClient            : PropTypes.object.isRequired,
	extraVideoOpen        : PropTypes.bool.isRequired,
	webcamDevices         : PropTypes.object,
	handleCloseExtraVideo : PropTypes.func.isRequired,
	classes               : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		webcamDevices  : state.me.webcamDevices,
		extraVideoOpen : state.room.extraVideoOpen
	});

const mapDispatchToProps = {
	handleCloseExtraVideo : roomActions.setExtraVideoOpen
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me.webcamDevices === next.me.webcamDevices &&
				prev.room.extraVideoOpen === next.room.extraVideoOpen
			);
		}
	}
)(withStyles(styles)(ExtraVideo)));
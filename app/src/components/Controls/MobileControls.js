import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { meProducersSelector } from '../Selectors';
import { withStyles } from '@material-ui/core/styles';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import Fab from '@material-ui/core/Fab';
import Tooltip from '@material-ui/core/Tooltip';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import VideoIcon from '@material-ui/icons/Videocam';
import VideoOffIcon from '@material-ui/icons/VideocamOff';

const styles = (theme) =>
	({
		root :
		{
			position      : 'fixed',
			zIndex        : 500,
			display       : 'flex',
			flexDirection : 'row',
			bottom        : '0.5em',
			left          : '50%',
			transform     : 'translate(-50%, -0%)'
		},
		fab :
		{
			margin : theme.spacing(1)
		}
	});

const MobileControls = (props) =>
{
	const {
		roomClient,
		me,
		micProducer,
		webcamProducer,
		classes
	} = props;

	let micState;

	let micTip;

	if (!me.canSendMic)
	{
		micState = 'unsupported';
		micTip = 'Audio unsupported';
	}
	else if (!micProducer)
	{
		micState = 'off';
		micTip = 'Activate audio';
	}
	else if (!micProducer.locallyPaused && !micProducer.remotelyPaused)
	{
		micState = 'on';
		micTip = 'Mute audio';
	}
	else
	{
		micState = 'muted';
		micTip = 'Unmute audio';
	}

	let webcamState;

	let webcamTip;

	if (!me.canSendWebcam)
	{
		webcamState = 'unsupported';
		webcamTip = 'Video unsupported';
	}
	else if (webcamProducer)
	{
		webcamState = 'on';
		webcamTip = 'Stop video';
	}
	else
	{
		webcamState = 'off';
		webcamTip = 'Start video';
	}

	return (
		<div className={classes.root}>
			<Tooltip title={micTip} placement='top'>
				<div>
					<Fab
						aria-label='Mute mic'
						className={classes.fab}
						disabled={!me.canSendMic || me.audioInProgress}
						color={micState === 'on' ? 'default' : 'secondary'}
						size='large'
						onClick={() =>
						{
							if (micState === 'off')
								roomClient.enableMic();
							else if (micState === 'on')
								roomClient.muteMic();
							else
								roomClient.unmuteMic();
						}}
					>
						{ micState === 'on' ?
							<MicIcon />
							:
							<MicOffIcon />
						}
					</Fab>
				</div>
			</Tooltip>
			<Tooltip title={webcamTip} placement='top'>
				<div>
					<Fab
						aria-label='Mute video'
						className={classes.fab}
						disabled={!me.canSendWebcam || me.webcamInProgress}
						color={webcamState === 'on' ? 'default' : 'secondary'}
						size='large'
						onClick={() =>
						{
							webcamState === 'on' ?
								roomClient.disableWebcam() :
								roomClient.enableWebcam();
						}}
					>
						{ webcamState === 'on' ?
							<VideoIcon />
							:
							<VideoOffIcon />
						}
					</Fab>
				</div>
			</Tooltip>
		</div>
	);
};

MobileControls.propTypes =
{
	roomClient     : PropTypes.any.isRequired,
	me             : appPropTypes.Me.isRequired,
	micProducer    : appPropTypes.Producer,
	webcamProducer : appPropTypes.Producer,
	classes        : PropTypes.object.isRequired,
	theme          : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		...meProducersSelector(state),
		me : state.me
	});

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.producers === next.producers &&
				prev.me === next.me
			);
		}
	}
)(withStyles(styles, { withTheme: true })(MobileControls)));
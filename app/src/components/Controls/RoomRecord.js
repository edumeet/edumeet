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

const RoomRecord = ({
	roomClient,
	roomRecordOpen,
	handleCloseRoomRecord,
	classes
}) =>
{
	const intl = useIntl();

	const [ mimeType, setMimeType ] = React.useState('');

	const handleChange = (event) =>
	{
		setMimeType(event.target.value);
	};

	const mimeTypes = [];

	const mimeTypeCapability = [
		[ 'video/webm', [ 'Chrome', 'Firefox', 'Safari' ] ],
		[ 'video/mp4', [] ],
		[ 'video/mpeg', [] ],
		[ 'audio/wav', [] ],
		[ 'audio/webm', [ 'Chrome', 'Firefox', 'Safari' ] ],
		[ 'audio/ogg', [ 'Firefox' ] ],
		[ 'video/webm;codecs=vp8', [ 'Chrome', 'Firefox', 'Safari' ] ],
		[ 'video/webm;codecs=vp9', [ 'Chrome' ] ],
		[ 'video/webm;codecs=h264', [ 'Chrome' ] ],
		[ 'video/x-matroska;codecs=avc1', [ 'Chrome' ] ]
	];

	if (typeof MediaRecorder === 'undefined')
	{
		window.MediaRecorder = {
			isTypeSupported : function()
			{
				return false;
			}
		};
	}
	mimeTypeCapability.forEach((item) =>
	{
		if (MediaRecorder.isTypeSupported(item[0]) && !mimeTypes.includes(item[0]))
		{
			mimeTypes.push(item[0]);
		}
	});

	return (
		<Dialog
			open={roomRecordOpen}
			onClose={() => handleCloseRoomRecord(false)}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>
				<FormattedMessage
					id='room.roomRecord'
					defaultMessage='Room Record'
				/>
			</DialogTitle>
			<form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={mimeType}
						displayEmpty
						name={intl.formatMessage({
							id             : 'settings.codecs',
							defaultMessage : 'Codecs'
						})}
						autoWidth
						className={classes.selectEmpty}
						disabled={mimeTypes.length === 0}
						onChange={handleChange}
					>
						{ mimeTypes.map((mime) =>
						{
							return (
								<MenuItem key={mime} value={mime}>{mime}</MenuItem>
							);
						})}
					</Select>

					<FormHelperText>
						{ mimeTypes.length > 0 ?
							intl.formatMessage({
								id             : 'room.roomRecordCodecs',
								defaultMessage : 'Select codecs for recording'
							})
							:
							intl.formatMessage({
								id             : 'room.cantRoomRecordCodecs',
								defaultMessage : 'Unable to select codecs'
							})
						}
					</FormHelperText>
				</FormControl>
			</form>
			<DialogActions>
				<Button onClick={() => roomClient.startRoomRecord(mimeType)} color='primary'>
					<FormattedMessage
						id='label.startRoomRecord'
						defaultMessage='Start Room Record'
					/>
				</Button>
			</DialogActions>
		</Dialog>
	);
};

RoomRecord.propTypes =
{
	roomClient            : PropTypes.object.isRequired,
	roomRecordOpen        : PropTypes.bool.isRequired,
	handleCloseRoomRecord : PropTypes.func.isRequired,
	classes               : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		roomRecordOpen : state.room.roomRecordOpen
	});

const mapDispatchToProps = {
	handleCloseRoomRecord : roomActions.setRoomRecordOpen
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room.roomRecordOpen === next.room.roomRecordOpen
			);
		}
	}
)(withStyles(styles)(RoomRecord)));
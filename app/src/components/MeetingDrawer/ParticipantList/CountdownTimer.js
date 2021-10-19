import React, { useRef } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { withRoomContext } from '../../../RoomContext';
import { useIntl, FormattedMessage } from 'react-intl';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import Switch from '@material-ui/core/Switch';

const styles = (theme) =>
	({
		root :
		{
			padding     : theme.spacing(1),
			display     : 'flex',
			flexWrap    : 'wrap',
			marginRight : -theme.spacing(1),
			marginTop   : -theme.spacing(1)
		},
		container :
		{
			marginTop      : theme.spacing(1),
			marginRight    : theme.spacing(2),
			flexGrow       : '1',
			justifyContent : 'space-between'
		},
		textfield :
		{
			marginTop   : theme.spacing(1),
			marginRight : theme.spacing(1),
			flexGrow    : '1'
		},
		button :
		{
			marginTop   : theme.spacing(1),
			marginRight : theme.spacing(1),
			flexGrow    : '1'
		}

	});

const CountdownTimer = (props) =>
{
	const intl = useIntl();

	const {
		roomClient,
		isEnabled,
		isRunning,
		left,
		classes
	} = props;

	const inputRef = useRef(null);

	const handleFocus = () =>
	{
		inputRef.current.focus();

		const timeout = setTimeout(() =>
		{
			inputRef.current.focus();
		}, 200);

		return () =>
		{
			clearTimeout(timeout);
		};
	};

	return (
		<div className={classes.root}>
			<Grid
				className={classes.container}
				container
				wrap='nowrap'
				alignItems='center'
			>
				<Grid item xs={8}>
					{/* TextField  set time */}
					<TextField fullWidth
						aria-label={intl.formatMessage({
							id             : 'set.countdown',
							defaultMessage : 'Set timer'
						})}
						inputRef={inputRef}
						className={classes.textfield}
						variant='outlined'
						label='timer (hh:mm:ss)'
						disabled={!isEnabled || (isRunning && left !== '00:00:00')}
						type='time'
						value={left}
						size='small'
						InputLabelProps={{
							shrink : true
						}}
						inputProps={{
							step : 1
						}}
						onChange={(e) => { roomClient.setCountdownTimer(e.target.value); }}
						onKeyPress={(e) =>
						{
							if (left !== '00:00:00')
							{
								if (e.key === 'Enter')
								{
									roomClient.startCountdownTimer();
									e.preventDefault();
								}
							}
						}}
					/>
					{/* /TextField  set time */}
				</Grid>

				<Grid item xs={1}>
					{/* Button reset time */}
					<IconButton
						aria-label={intl.formatMessage({
							id             : 'start.countdown',
							defaultMessage : 'Start'
						})}
						className={classes.button}
						variant='contained'
						color='secondary'
						size='small'
						disabled={
							!isEnabled ||
							(
								isRunning ||
								left === '00:00:00'
							)
						}
						onClick={() =>
						{
							roomClient.setCountdownTimer('00:00:00');
							handleFocus();
						}}
					>
						<HighlightOffIcon/>
					</IconButton>
					{/* /Button reset */}
				</Grid>

				{!isRunning ?
					<Grid item xs={1}>
						{/* Button start countdown */}
						<IconButton
							aria-label={intl.formatMessage({
								id             : 'start.countdown',
								defaultMessage : 'Start'
							})}
							className={classes.button}
							variant='contained'
							color='secondary'
							size='small'
							disabled={!isEnabled || left === '00:00:00'}
							onClick={() => roomClient.startCountdownTimer()}
						>
							<PlayArrowIcon/>
						</IconButton>
						{/* /Button start countdown */}
					</Grid>
					:
					<Grid item xs={1}>
						{/* Button stop countdown */}
						<IconButton fullWidth
							aria-label={intl.formatMessage({
								id             : 'stop.countdown',
								defaultMessage : 'Stop countdown'
							})}
							className={classes.button}
							variant='contained'
							color='secondary'
							size='small'
							disabled={!isEnabled || left === '00:00:00'}
							onClick={() =>
							{
								roomClient.stopCountdownTimer();
								handleFocus();
							}}
						>
							 <PauseIcon/>
						</IconButton>
						{/* /Button stop countdown */}
					</Grid>
				}
				<Grid item xs={1}>
					{/* Switch toggle show/hide */}
					<Switch
						className={classes.button}
						checked={isEnabled}
						disabled={isRunning}
						onChange={() =>
						{
							roomClient.toggleCountdownTimer(!isEnabled);
							handleFocus();
						}}
						name='checkedB'
						color='secondary'
						size='small'
					/>
					{/* /Switch toggle show/hide */}
				</Grid>
			</Grid>
		</div>
	);
};

CountdownTimer.propTypes =
{
	roomClient : PropTypes.any.isRequired,
	classes    : PropTypes.object.isRequired,
	isEnabled  : PropTypes.bool.isRequired,
	isRunning  : PropTypes.bool.isRequired,
	left       : PropTypes.string.isRequired
};

const mapStateToProps = (state) => ({
	isEnabled : state.room.countdownTimer.isEnabled,
	isRunning : state.room.countdownTimer.isRunning,
	left      : state.room.countdownTimer.left
});

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.isEnabled === next.room.countdownTimer.isEnabled,
				prev.isRunning === next.room.countdownTimer.isRunning,
				prev.left === next.room.countdownTimer.left
			);
		}
	}
)(withStyles(styles)(CountdownTimer)));
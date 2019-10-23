import React from 'react';
import { connect } from 'react-redux';
import {
	lobbyPeersKeySelector
} from '../../Selectors';
import * as appPropTypes from '../../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
import * as stateActions from '../../../actions/stateActions';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
// import Checkbox from '@material-ui/core/Checkbox';
// import InputLabel from '@material-ui/core/InputLabel';
// import OutlinedInput from '@material-ui/core/OutlinedInput';
import Switch from '@material-ui/core/Switch';
import List from '@material-ui/core/List';
import ListSubheader from '@material-ui/core/ListSubheader';
import ListLobbyPeer from './ListLobbyPeer';

const styles = (theme) =>
	({
		root :
		{
		},
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
		lock :
		{
			padding : theme.spacing(2)
		}
	});

const LockDialog = ({
	roomClient,
	room,
	handleCloseLockDialog,
	// handleAccessCode,
	lobbyPeers,
	classes
}) =>
{
	return (
		<Dialog
			className={classes.root}
			open={room.lockDialogOpen}
			onClose={() => handleCloseLockDialog({ lockDialogOpen: false })}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>Room access control</DialogTitle>
			<form className={classes.lock} autoComplete='off'>
				<FormControl component='fieldset' className={classes.formControl}>
					<FormLabel component='legend'>Room lock</FormLabel>
					<FormGroup>
						<FormControlLabel
							control={
								<Switch checked={room.locked} onChange={() => 
								{
									if (room.locked)
									{
										roomClient.unlockRoom();
									}
									else
									{
										roomClient.lockRoom();
									}
								}}
								/>}
							label='Lock'
						/>
						{/* TODO: access code
						<FormControlLabel disabled={ room.locked ? false : true } 
							control={
								<Checkbox checked={room.joinByAccessCode} 
									onChange={
										(event) => roomClient.setJoinByAccessCode(event.target.checked)
									}
								/>}
							label='Join by Access code'
						/>
						<InputLabel htmlFor='access-code-input' />
						<OutlinedInput 
							disabled={ room.locked ? false : true }
							id='acces-code-input'
							label='Access code'
							labelWidth={0}
							variant='outlined'
							value={room.accessCode}
							onChange={(event) => handleAccessCode(event.target.value)}
						>
						</OutlinedInput>
						<Button onClick={() => roomClient.setAccessCode(room.accessCode)} color='primary'>
								save
						</Button>
						*/}
					</FormGroup>
				</FormControl>

				{ (lobbyPeers.length > 0) &&
					<List 
						dense={true} 
						subheader={
							<ListSubheader component='div'>
								Participants in Lobby
							</ListSubheader>
					}
					>
						{
							lobbyPeers.map((peerId) =>
							{
								return (<ListLobbyPeer key={peerId} id={peerId} />);
							})
						}
					</List>
				} 
			</form>
			<DialogActions>
				<Button onClick={() => handleCloseLockDialog({ lockDialogOpen: false })} color='primary'>
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
};

LockDialog.propTypes =
{
	roomClient            : PropTypes.any.isRequired,
	room                  : appPropTypes.Room.isRequired,
	handleCloseLockDialog : PropTypes.func.isRequired,
	handleAccessCode      : PropTypes.func.isRequired,
	lobbyPeers            : PropTypes.array,
	classes               : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		room       : state.room,
		lobbyPeers : lobbyPeersKeySelector(state)

	};
};

const mapDispatchToProps = {
	handleCloseLockDialog : stateActions.setLockDialogOpen,
	handleAccessCode      : stateActions.setAccessCode
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room.locked === next.room.locked &&
				prev.room.joinByAccessCode === next.room.joinByAccessCode &&
				prev.room.accessCode === next.room.accessCode &&
				prev.room.code === next.room.code &&
				prev.room.lockDialogOpen === next.room.lockDialogOpen &&
				prev.room.codeHidden === next.room.codeHidden &&
				prev.lobbyPeers === next.lobbyPeers
			);
		}
	}
)(withStyles(styles)(LockDialog)));
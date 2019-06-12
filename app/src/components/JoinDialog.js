import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../RoomContext';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import Typography from '@material-ui/core/Typography';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';

const styles = (theme) =>
	({
		root :
		{
		},
		dialogPaper :
		{
			width                          : '20vw',
			padding                        : theme.spacing.unit * 2,
			[theme.breakpoints.down('lg')] :
			{
				width : '30vw'
			},
			[theme.breakpoints.down('md')] :
			{
				width : '40vw'
			},
			[theme.breakpoints.down('sm')] :
			{
				width : '60vw'
			},
			[theme.breakpoints.down('xs')] :
			{
				width : '80vw'
			}
		},
		logo :
		{
			display : 'block'
		}
	});

const JoinDialog = ({
	roomClient,
	classes
}) =>
{
	return (
		<Dialog
			className={classes.root}
			open
			classes={{
				paper : classes.dialogPaper
			}}
		>
			{ window.config.logo ?
				<img alt='Logo' className={classes.logo} src={window.config.logo} />
				:null
			}
			<Typography variant='subtitle1'>You are about to join a meeting, how would you like to join?</Typography>
			<DialogActions>
				<Button
					onClick={() =>
					{
						roomClient.join({ joinVideo: false });
					}}
					variant='contained'
				>
					Audio only
				</Button>
				<Button
					onClick={() =>
					{
						roomClient.join({ joinVideo: true });
					}}
					variant='contained'
				>
					Audio and Video
				</Button>
			</DialogActions>
		</Dialog>
	);
};

JoinDialog.propTypes =
{
	roomClient : PropTypes.any.isRequired,
	classes    : PropTypes.object.isRequired
};

export default withRoomContext(withStyles(styles)(JoinDialog));
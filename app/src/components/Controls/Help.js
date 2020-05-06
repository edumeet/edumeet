import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import * as roomActions from '../../actions/roomActions';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';

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
		}
	});

const Help = ({
	helpOpen,
	handleCloseHelp,
	classes
}) =>
{
	return (
		<Dialog
			open={helpOpen}
			onClose={() => { handleCloseHelp(false); }}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>
				<FormattedMessage
					id='room.help'
					defaultMessage='Help'
				/>
			</DialogTitle>
			<DialogActions>
				<Button onClick={() => { handleCloseHelp(false); }} color='primary'>
					<FormattedMessage
						id='label.close'
						defaultMessage='Close'
					/>
				</Button>
			</DialogActions>
		</Dialog>		
	);
};

Help.propTypes =
{
	roomClient      : PropTypes.object.isRequired,
	helpOpen        : PropTypes.bool.isRequired,
	handleCloseHelp : PropTypes.func.isRequired, 
	classes         : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		helpOpen : state.room.helpOpen
	});

const mapDispatchToProps = {
	handleCloseHelp : roomActions.setHelpOpen
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room.helpOpen === next.room.helpOpen
			);
		}
	}
)(withStyles(styles)(Help)));
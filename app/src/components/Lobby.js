import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../RoomContext';
import * as stateActions from '../actions/stateActions';
import PropTypes from 'prop-types';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';

const styles = (theme) =>
	({
		root :
		{
			display              : 'flex',
			width                : '100%',
			height               : '100%',
			backgroundColor      : 'var(--background-color)',
			backgroundImage      : `url(${window.config.background})`,
			backgroundAttachment : 'fixed',
			backgroundPosition   : 'center',
			backgroundSize       : 'cover',
			backgroundRepeat     : 'no-repeat'
		},
		dialogPaper :
		{
			width                          : '20vw',
			padding                        : theme.spacing(2),
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

const Lobby = ({
	classes
}) =>
{
	return (
		<div className={classes.root}>
			<Paper className={classes.message}>
				<Typography variant='h2'>This room is locked at the moment, try again later.</Typography>
			</Paper>
		</div>
	);
};

Lobby.propTypes =
{
	classes : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		displayName : state.settings.displayName
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		changeDisplayName : (displayName) =>
		{
			dispatch(stateActions.setDisplayName(displayName));
		}
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.settings.displayName === next.settings.displayName
			);
		}
	}
)(withStyles(styles)(Lobby)));
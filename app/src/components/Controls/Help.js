import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import * as roomActions from '../../store/actions/roomActions';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

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
			},
			display       : 'flex',
			flexDirection : 'column'
		},
		paper : {
			padding      : theme.spacing(1),
			textAlign    : 'center',
			color        : theme.palette.text.secondary,
			whiteSpace   : 'nowrap',
			marginRight  : theme.spacing(3),
			marginBottom : theme.spacing(1),
			minWidth     : theme.spacing(8)
		},
		shortcuts : {
			display       : 'flex',
			flexDirection : 'row',
			alignItems    : 'center',
			paddingLeft   : theme.spacing(2),
			paddingRight  : theme.spacing(2)
		},
		tabsHeader :
		{
			flexGrow     : 1,
			marginBottom : theme.spacing(1)
		}
	});

const Help = ({
	helpOpen,
	handleCloseHelp,
	classes
}) =>
{
	const intl = useIntl();

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
			<Tabs
				value={0}
				className={classes.tabsHeader}
				indicatorColor='primary'
				textColor='primary'
				variant='fullWidth'
			>
				<Tab
					label={
						intl.formatMessage({
							id             : 'room.shortcutKeys',
							defaultMessage : 'Shortcut keys'
						})
					}
				/>
			</Tabs>

			{/*
			{
				key: `${String.fromCharCode(8592)} ${String.fromCharCode(8594)}`,
				label: 'room.browsePeersSpotlight',
				defaultMessage: 'Browse participants into Spotlight'
			}
			*/}
			<div className={classes.shortcuts}>
				<Paper className={classes.paper}>h</Paper>
				<FormattedMessage
					id='room.help'
					defaultMessage='Help'
				/>
			</div>

			<div className={classes.shortcuts}>
				<Paper className={classes.paper}>m</Paper>
				<FormattedMessage
					id='device.muteAudio'
					defaultMessage='Mute audio'
				/>
			</div>

			<div className={classes.shortcuts}>
				<Paper className={classes.paper}>v</Paper>
				<FormattedMessage
					id='device.stopVideo'
					defaultMessage='Stop video'
				/>
			</div>

			<div className={classes.shortcuts}>
				<Paper className={classes.paper}>1</Paper>
				<FormattedMessage
					id='label.democratic'
					defaultMessage='Democratic view'
				/>
			</div>

			<div className={classes.shortcuts}>
				<Paper className={classes.paper}>2</Paper>
				<FormattedMessage
					id='label.filmstrip'
					defaultMessage='Filmstrip view'
				/>
			</div>

			<div className={classes.shortcuts}>
				<Paper className={classes.paper}>space</Paper>
				<FormattedMessage
					id='me.pushToTalk'
					defaultMessage='Push SPACE to talk'
				/>
			</div>

			<div className={classes.shortcuts}>
				<Paper className={classes.paper}>a</Paper>
				<FormattedMessage
					id='label.showAdvancedInformation'
					defaultMessage='Show advanced information'
				/>
			</div>

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

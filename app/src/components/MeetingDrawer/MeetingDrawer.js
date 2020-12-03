import React from 'react';
import { connect } from 'react-redux';
import { raisedHandsSelector } from '../Selectors';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import * as toolareaActions from '../../actions/toolareaActions';
import AppBar from '@material-ui/core/AppBar';
import Chat from './Chat/Chat';
import FileSharing from './FileSharing/FileSharing';
import ParticipantList from './ParticipantList/ParticipantList';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

const styles = (theme) =>
	({
		root :
		{
			display         : 'flex',
			flexDirection   : 'column',
			width           : '100%',
			height          : '100%',
			backgroundColor : theme.palette.background.paper
		},
		appBar :
		{
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-end'
		},
		tabsHeader :
		{
			flexGrow : 1
		}
	});

const MeetingDrawer = (props) =>
{
	const {
		currentToolTab,
		closeDrawer,
		classes
	} = props;

	return (
		<div className={classes.root}>
			<AppBar
				position='static'
				color='default'
				className={classes.appBar}
			>
				<IconButton
					onClick={closeDrawer}
				>
					<CloseIcon />
				</IconButton>
			</AppBar>
			{currentToolTab === 'chat' && <Chat />}
			{currentToolTab === 'files' && <FileSharing />}
			{currentToolTab === 'users' && <ParticipantList />}
		</div>
	);
};

MeetingDrawer.propTypes =
{
	currentToolTab : PropTypes.string.isRequired,
	setToolTab     : PropTypes.func.isRequired,
	unreadMessages : PropTypes.number.isRequired,
	unreadFiles    : PropTypes.number.isRequired,
	raisedHands    : PropTypes.number.isRequired,
	closeDrawer    : PropTypes.func.isRequired,
	classes        : PropTypes.object.isRequired,
	theme          : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		currentToolTab : state.toolarea.currentToolTab,
		unreadMessages : state.toolarea.unreadMessages,
		unreadFiles    : state.toolarea.unreadFiles,
		raisedHands    : raisedHandsSelector(state)
	};
};

const mapDispatchToProps = {
	setToolTab : toolareaActions.setToolTab
};

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.toolarea.currentToolTab === next.toolarea.currentToolTab &&
				prev.toolarea.unreadMessages === next.toolarea.unreadMessages &&
				prev.toolarea.unreadFiles === next.toolarea.unreadFiles &&
				prev.peers === next.peers
			);
		}
	}
)(withStyles(styles, { withTheme: true })(MeetingDrawer));

import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import * as roomActions from '../../actions/roomActions';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import MediaSettings from './MediaSettings';
import AppearanceSettings from './AppearanceSettings';
import AdvancedSettings from './AdvancedSettings';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';

const tabs =
[
	'media',
	'appearance',
	'advanced'
];

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
		tabsHeader :
		{
			flexGrow : 1
		}
	});

const Settings = ({
	currentSettingsTab,
	settingsOpen,
	handleCloseSettings,
	setSettingsTab,
	classes
}) =>
{
	const intl = useIntl();

	return (
		<Dialog
			className={classes.root}
			open={settingsOpen}
			onClose={() => handleCloseSettings(false)}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>
				<FormattedMessage
					id='settings.settings'
					defaultMessage='Settings'
				/>
			</DialogTitle>
			<Tabs
				className={classes.tabsHeader}
				value={tabs.indexOf(currentSettingsTab)}
				onChange={(event, value) => setSettingsTab(tabs[value])}
				indicatorColor='primary'
				textColor='primary'
				variant='fullWidth'
			>
				<Tab
					label={
						intl.formatMessage({
							id             : 'label.media',
							defaultMessage : 'Media'
						})
					}
				/>
				<Tab
					label={intl.formatMessage({
						id             : 'label.appearance',
						defaultMessage : 'Appearance'
					})}
				/>
				<Tab
					label={intl.formatMessage({
						id             : 'label.advanced',
						defaultMessage : 'Advanced'
					})}
				/>
			</Tabs>
			{currentSettingsTab === 'media' && <MediaSettings />}
			{currentSettingsTab === 'appearance' && <AppearanceSettings />}
			{currentSettingsTab === 'advanced' && <AdvancedSettings />}
			<DialogActions>
				<Button onClick={() => handleCloseSettings(false)} color='primary'>
					<FormattedMessage
						id='label.close'
						defaultMessage='Close'
					/>
				</Button>
			</DialogActions>
		</Dialog>
	);
};

Settings.propTypes =
{
	currentSettingsTab  : PropTypes.string.isRequired,
	settingsOpen        : PropTypes.bool.isRequired,
	handleCloseSettings : PropTypes.func.isRequired,
	setSettingsTab      : PropTypes.func.isRequired,
	classes             : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		currentSettingsTab : state.room.currentSettingsTab,
		settingsOpen       : state.room.settingsOpen
	});

const mapDispatchToProps = {
	handleCloseSettings : roomActions.setSettingsOpen,
	setSettingsTab      : roomActions.setSettingsTab
};

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room.currentSettingsTab === next.room.currentSettingsTab &&
				prev.room.settingsOpen === next.room.settingsOpen
			);
		}
	}
)(withStyles(styles)(Settings));
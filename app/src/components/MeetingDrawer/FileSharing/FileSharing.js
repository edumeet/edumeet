import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
import { useIntl } from 'react-intl';
import FileList from './FileList';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';

const styles = (theme) =>
	({
		root :
		{
			display       : 'flex',
			flexDirection : 'column',
			width         : '100%',
			height        : '100%'
		},
		input :
		{
			display : 'none'
		},
		button :
		{
			margin : theme.spacing(1)
		}
	});

const FileSharing = (props) =>
{
	const intl = useIntl();

	const handleFileChange = async (event) =>
	{
		if (event.target.files.length > 0)
		{
			props.roomClient.shareFiles(event.target.files);
		}
	};

	const {
		canShareFiles,
		classes
	} = props;

	const buttonDescription = canShareFiles ?
		intl.formatMessage({
			id             : 'label.shareFile',
			defaultMessage : 'Share file'
		})
		:
		intl.formatMessage({
			id             : 'label.fileSharingUnsupported',
			defaultMessage : 'File sharing not supported'
		});

	return (
		<Paper className={classes.root}>
			<input
				className={classes.input}
				type='file'
				onChange={handleFileChange}
				id='share-files-button'
			/>
			<label htmlFor='share-files-button'>
				<Button
					variant='contained'
					component='span'
					className={classes.button}
					disabled={!canShareFiles}
				>
					{buttonDescription}
				</Button>
			</label>

			<FileList />
		</Paper>
	);
};

FileSharing.propTypes = {
	roomClient    : PropTypes.any.isRequired,
	canShareFiles : PropTypes.bool.isRequired,
	tabOpen       : PropTypes.bool.isRequired,
	classes       : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		canShareFiles : state.me.canShareFiles,
		tabOpen       : state.toolarea.currentToolTab === 'files'
	};
};

export default withRoomContext(connect(
	mapStateToProps
)(withStyles(styles)(FileSharing)));

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../../RoomContext';
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
			margin : theme.spacing.unit
		}
	});

class FileSharing extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this._fileInput = React.createRef();
	}

	handleFileChange = async (event) =>
	{
		if (event.target.files.length > 0)
		{
			this.props.roomClient.shareFiles(event.target.files);
		}
	};

	render()
	{
		const {
			torrentSupport,
			classes
		} = this.props;

		const buttonDescription = torrentSupport ?
			'Share file' : 'File sharing not supported';

		return (
			<Paper className={classes.root}>
				<input
					ref={this._fileInput}
					className={classes.input}
					type='file'
					onChange={this.handleFileChange}
					id='share-files-button'
				/>
				<label htmlFor='share-files-button'>
					<Button
						variant='contained'
						component='span'
						className={classes.button}
						disabled={!torrentSupport}
					>
						{buttonDescription}
					</Button>
				</label>

				<FileList />
			</Paper>
		);
	}
}

FileSharing.propTypes = {
	roomClient     : PropTypes.any.isRequired,
	torrentSupport : PropTypes.bool.isRequired,
	tabOpen        : PropTypes.bool.isRequired,
	classes        : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		torrentSupport : state.room.torrentSupport,
		tabOpen        : state.toolarea.currentToolTab === 'files'
	};
};

export default withRoomContext(connect(
	mapStateToProps
)(withStyles(styles)(FileSharing)));

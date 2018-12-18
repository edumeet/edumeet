import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { withRoomContext } from '../../../RoomContext';
import FileList from './FileList';

class FileSharing extends Component
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

	handleClick = () =>
	{
		if (this.props.torrentSupport)
		{
			// We want to open the file dialog when we click a button
			// instead of actually rendering the input element itself.
			this._fileInput.current.click();
		}
	};

	render()
	{
		const {
			torrentSupport
		} = this.props;

		const buttonDescription = torrentSupport ?
			'Share file' : 'File sharing not supported';

		return (
			<div data-component='FileSharing'>
				<div className='sharing-toolbar'>
					<input
						style={{ display: 'none' }}
						ref={this._fileInput}
						type='file'
						onChange={this.handleFileChange}
						multiple
					/>

					<div
						type='button'
						onClick={this.handleClick}
						className={classNames('share-file', {
							disabled : !torrentSupport
						})}
					>
						<span>{buttonDescription}</span>
					</div>
				</div>

				<FileList />
			</div>
		);
	}
}

FileSharing.propTypes = {
	roomClient     : PropTypes.any.isRequired,
	torrentSupport : PropTypes.bool.isRequired,
	tabOpen        : PropTypes.bool.isRequired
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
)(FileSharing));

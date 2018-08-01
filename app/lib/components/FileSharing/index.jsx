import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import WebTorrent from 'webtorrent';
import createTorrent from 'create-torrent';
import randomString from 'random-string';
import classNames from 'classnames';
import * as stateActions from '../../redux/stateActions';
import * as requestActions from '../../redux/requestActions';
import { store } from '../../store';
import config from '../../../config';
import FileEntry, { FileEntryProps } from './FileEntry';

export const client = WebTorrent.WEBRTC_SUPPORT && new WebTorrent({
	tracker : {
		rtcConfig : {
			iceServers : config.turnServers
		}
	}
});

const notifyPeers = (file) =>
{
	const { displayName, picture } = store.getState().me;

	store.dispatch(requestActions.sendFile(file, displayName, picture));
};

export const shareFiles = async (files) =>
{
	const notification =
	{
		id   : randomString({ length: 6 }).toLowerCase(),
		text : 'Creating torrent',
		type : 'info'
	};

	store.dispatch(stateActions.addNotification(notification));

	createTorrent(files, (err, torrent) =>
	{
		if (err)
		{
			return store.dispatch(requestActions.notify({
				text : 'An error occured while uploading a file'
			}));
		}

		const existingTorrent = client.get(torrent);

		if (existingTorrent)
		{
			return notifyPeers({
				magnet : existingTorrent.magnetURI
			});
		}
		
		client.seed(files, (newTorrent) =>
		{
			store.dispatch(stateActions.removeNotification(notification.id));
			
			store.dispatch(requestActions.notify({
				text : 'Torrent successfully created'
			}));

			notifyPeers({
				magnet : newTorrent.magnetURI
			});
		});
	});
};

class FileSharing extends Component 
{
	constructor(props)
	{
		super(props);

		this.fileInput = React.createRef();
	}

	handleFileChange = async (event) =>
	{
		if (event.target.files.length > 0)
		{
			await shareFiles(event.target.files);
		}
	};

	handleClick = () =>
	{
		if (WebTorrent.WEBRTC_SUPPORT)
		{
			// We want to open the file dialog when we click a button
			// instead of actually rendering the input element itself.
			this.fileInput.current.click();
		}
	};

	render()
	{
		const buttonDescription = WebTorrent.WEBRTC_SUPPORT ?
			'Share file' : 'File sharing not supported';

		return (
			<div data-component='FileSharing'>
				<div className='sharing-toolbar'>
					<input
						style={{ display: 'none' }}
						ref={this.fileInput}
						type='file'
						onChange={this.handleFileChange}
						multiple
					/>

					<div
						type='button'
						onClick={this.handleClick}
						className={classNames('share-file', {
							disabled : !WebTorrent.WEBRTC_SUPPORT
						})}
					>
						<span>{buttonDescription}</span>
					</div>
				</div>

				<div className='shared-files'>
					{this.props.sharing.map((entry, i) => (
						<FileEntry
							data={entry}
							key={i}
						/>
					))}
				</div>
			</div>
		);
	}
}

FileSharing.propTypes = {
	sharing : PropTypes.arrayOf(FileEntryProps.data).isRequired
};

const mapStateToProps = (state) =>
	({
		sharing : state.sharing
	});

export default connect(
	mapStateToProps
)(FileSharing);
import React, { Component } from 'react';
import WebTorrent from 'webtorrent';
import createTorrent from 'create-torrent';
import dragDrop from 'drag-drop';
import randomString from 'random-string';
import * as stateActions from '../../redux/stateActions';
import * as requestActions from '../../redux/requestActions';
import { store } from '../../store';
import config from '../../../config';

export const client = new WebTorrent({
	tracker: {
		rtcConfig: {
			iceServers: config.turnServers
		}
	}
});

const notifyPeers = (file) =>
{
	const { displayName, picture } = store.getState().me;

	store.dispatch(stateActions.addUserFile(file));
	store.dispatch(requestActions.sendChatFile(file, displayName, picture));
};

const shareFiles = async (files) =>
{
	const notification =
	{
		id: randomString({ length: 6 }).toLowerCase(),
		text: 'Creating torrent',
		type: 'info'
	};

	store.dispatch(stateActions.addNotification(notification));

	createTorrent(files, (err, torrent) =>
	{
		if (err)
		{
			return store.dispatch(requestActions.notify({
				text: 'An error occured while uploading a file'
			}));
		}

		const existingTorrent = client.get(torrent);

		if (existingTorrent)
		{
			return notifyPeers({
				magnet: existingTorrent.magnetURI
			});
		}
		
		client.seed(files, (newTorrent) =>
		{
			store.dispatch(stateActions.removeNotification(notification.id));
			
			store.dispatch(requestActions.notify({
				text: 'Torrent successfully created'
			}))

			notifyPeers({
				magnet : newTorrent.magnetURI
			});
		});
	});
};

dragDrop('body', async (files) => await shareFiles(files));

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
		// We want to open the file dialog when we click a button
		// instead of actually rendering the input element itself.
		this.fileInput.current.click();
	};

	render()
	{
		return (
			<div>
				<input
					style={{ display: 'none' }}
					ref={this.fileInput}
					type='file'
					onChange={this.handleFileChange}
					multiple
				/>

				<button onClick={this.handleClick}>share file</button>
			</div>
		);
	}
}

export default FileSharing;
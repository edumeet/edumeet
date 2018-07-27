import React, { Component } from 'react';
import WebTorrent from 'webtorrent';
import dragDrop from 'drag-drop';
import * as stateActions from '../../redux/stateActions';
import * as requestActions from '../../redux/requestActions';
import { store } from '../../store';

export const client = new WebTorrent();

const notifyPeers = (file) =>
{
	const { displayName, picture } = store.getState().me;

	store.dispatch(stateActions.addUserFile(file));
	store.dispatch(requestActions.sendChatFile(file, displayName, picture));
};

const shareFiles = (files) =>
{
	client.seed(files, (torrent) => 
	{
		notifyPeers({
			magnet : torrent.magnetURI
		});
	});
};

dragDrop('body', shareFiles);

class FileSharing extends Component 
{
	constructor(props)
	{
		super(props);

		this.fileInput = React.createRef();
	}

	handleFileChange = (event) =>
	{
		if (event.target.files.length > 0)
		{
			shareFiles(event.target.files);
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
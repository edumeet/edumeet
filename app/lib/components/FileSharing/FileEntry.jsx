import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import magnet from 'magnet-uri';
import * as requestActions from '../../redux/requestActions';
import { saveAs } from 'file-saver/FileSaver';
import { client } from './index';

const DEFAULT_PICTURE = 'resources/images/avatar-empty.jpeg';

class FileEntry extends Component
{
	state = {
		active   : false,
		numPeers : 0,
		progress : 0,
		files    : null
	};

	saveFile = (file) =>
	{
		file.getBlob((err, blob) =>
		{
			if (err)
			{
				return this.props.notify({
					text : 'An error occurred while saving a file'
				});
			}
	
			saveAs(blob, file.name);
		});
	};

	handleTorrent = (torrent) =>
	{
		// Torrent already done, this can happen if the
		// same file was sent multiple times.
		if (torrent.progress === 1)
		{
			this.setState({
				files    : torrent.files,
				numPeers : torrent.numPeers,
				progress : 1,
				active   : false
			});

			return;
		}

		const onProgress = () =>
		{
			this.setState({
				numPeers : torrent.numPeers,
				progress : torrent.progress
			});
		};

		onProgress();

		setInterval(onProgress, 500);

		torrent.on('done', () => 
		{
			onProgress();
			clearInterval(onProgress);

			this.setState({
				files  : torrent.files,
				active : false
			});
		});
	};

	handleDownload = () =>
	{
		this.setState({
			active : true
		});
		
		const magnetURI = this.props.data.file.magnet;

		const existingTorrent = client.get(magnet);

		if (existingTorrent)
		{
			// Never add duplicate torrents, use the existing one instead.
			return this.handleTorrent(existingTorrent);
		}

		client.add(magnetURI, this.handleTorrent);
	}

	render()
	{
		return (
			<div className='file-entry'>
				<img className='file-avatar' src={this.props.data.picture || DEFAULT_PICTURE} />
	
				<div className='file-content'>
					{this.props.data.me ? (
						<p>You shared a file.</p>
					) : (
						<p>{this.props.data.name} shared a file.</p>
					)}

					{!this.state.active && !this.state.files && (
						<div className='file-info'>
							<span className='button' onClick={this.handleDownload}>
								<img src='resources/images/download-icon.svg' />
							</span>

							<p>{magnet.decode(this.props.data.file.magnet).dn}</p>
						</div>
					)}

					{this.state.active && this.state.numPeers === 0 && (
						<p>
							Locating peers
						</p>
					)}

					{this.state.active && this.state.numPeers > 0 && (
						<progress value={this.state.progress} />
					)}

					{this.state.files && (
						<Fragment>
							<p>Torrent finished downloading.</p>

							{this.state.files.map((file, i) => (
								<div className='file-info' key={i}>
									<span className='button' onClick={() => this.saveFile(file)}>
										<img src='resources/images/save-icon.svg' />
									</span>

									<p>{file.name}</p>
								</div>
							))}
						</Fragment>
					)}
				</div>
			</div>
		);
	}
}

export const FileEntryProps = {
	data : PropTypes.shape({
		name    : PropTypes.string.isRequired,
		picture : PropTypes.string.isRequired,
		file    : PropTypes.shape({
			magnet : PropTypes.string.isRequired
		}).isRequired,
		me : PropTypes.bool
	}).isRequired,
	notify : PropTypes.func.isRequired
};

FileEntry.propTypes = FileEntryProps;

const mapDispatchToProps = {
	notify : requestActions.notify
};

export default connect(
	undefined,
	mapDispatchToProps
)(FileEntry);
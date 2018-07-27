import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { notifyAction } from '../../redux/stateActions';
import { saveAs } from 'file-saver/FileSaver';
import { client } from './FileSharing';

class FileChatEntry extends Component
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

	download = () =>
	{
		this.setState({
			active : true
		});

		client.add(this.props.message.file.magnet, (torrent) =>
		{
			const onProgress = () =>
			{
				this.setState({
					numPeers : torrent.numPeers,
					progress : Math.round(torrent.progress * 100 * 100) / 100
				});
			};

			setInterval(onProgress, 500);
			onProgress();

			torrent.on('done', () => 
			{
				onProgress();
				clearInterval(onProgress);

				this.setState({
					files : torrent.files
				});
			});
		});
	}

	render()
	{
		return (
			<Fragment>
				<div>
					<button onClick={this.download}>
						append shared file to body
					</button>

					{this.state.active && (
						<div>
							peers: {this.state.numPeers}
							progress: {this.state.progress}
						</div>
					)}

					{this.state.files && (
						<div>
							{this.state.files.map((file, i) => (
								<div key={i}>
									<button onClick={() => this.saveFile(file)}>
										download {file.name}
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</Fragment>
		);
	}
}

const mapDispatchToProps = {
	notify : notifyAction
};

export default connect(
	undefined,
	mapDispatchToProps
)(FileChatEntry);
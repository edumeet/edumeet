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
					progress : torrent.progress
				});
			};

			setInterval(onProgress, 500);
			onProgress();

			torrent.on('done', () => 
			{
				onProgress();
				clearInterval(onProgress);

				this.setState({
					files : torrent.files,
					active: false
				});
			});
		});
	}

	render()
	{
		return (
			<Fragment>
				<div>
					{!this.state.active && !this.state.files && (
						<Fragment>
							<p>A new file was shared.</p>

							<button onClick={this.download}>
								Download
							</button>
						</Fragment>
					)}

					{this.state.active && this.state.numPeers === 0 && (
						<div>
							Locating peers
						</div>
					)}

					{this.state.active && this.state.numPeers > 0 && (
						<progress value={this.state.progress} />
					)}

					{this.state.files && (
						<div>
							{this.state.files.map((file, i) => (
								<div key={i}>
									<button onClick={() => this.saveFile(file)}>
										Save {file.name}
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
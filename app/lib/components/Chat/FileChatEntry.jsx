import React, { Component, Fragment } from 'react';
import WebTorrent from 'webtorrent';
import { saveAs } from 'file-saver/FileSaver';

const saveFile = (file) =>
{
  file.getBlob((err, blob) =>
  {
    if (err)
    {
      console.error('WebTorrent error');
      return;
    }

    console.log('TRYING TO SAVE BLOB', blob)
    saveAs(blob, file.name);
  });
};

class FileChatEntry extends Component
{
  state = {
    active: false,
    numPeers: 0,
    progress: 0,
    files: null
  };

  download = () =>
  {
    this.setState({
      active: true
    });

    this.props.client.add(this.props.message.file.magnet, (torrent) =>
    {
      const onProgress = () =>
      {
        this.setState({
          numPeers: torrent.numPeers,
          progress: Math.round(torrent.progress * 100 * 100) / 100
        });
      };

      setInterval(onProgress, 500);
      onProgress();

      torrent.on('done', () => {
        onProgress();
        clearInterval(onProgress);

        this.setState({
          files: torrent.files
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
                  <button onClick={() => saveFile(file)}>download {file.name}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Fragment>
    );
  }
}

export default FileChatEntry;
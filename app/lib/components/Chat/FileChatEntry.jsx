import React, { Component, Fragment } from 'react';
import WebTorrent from 'webtorrent';
import { saveAs } from 'file-saver/FileSaver';

class FileChatEntry extends Component
{
  state = {
    active: false,
    numPeers: 0,
    progress: 0
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

        torrent.files.forEach((file) => {
          file.getBlob((err, blob) => {
            if (err)
            {
              console.error('webtorrent error!!!');
              return;
            }

            saveAs(blob);
          });
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
        </div>
      </Fragment>
    );
  }
}

export default FileChatEntry;
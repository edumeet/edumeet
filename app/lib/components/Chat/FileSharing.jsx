import React, { Component } from 'react';
import { connect } from 'react-redux';
import WebTorrent from 'webtorrent';
import dragDrop from 'drag-drop';
import * as stateActions from '../../redux/stateActions';
import * as requestActions from '../../redux/requestActions';
import { store } from '../../store';

export const client = new WebTorrent();

const notifyPeers = (file) =>
{
  const { displayName, picture } = store.getState().me;
  store.dispatch(stateActions.addUserFile(file));
  store.dispatch(requestActions.sendChatFile(file, displayName, picture));
};

const shareFiles = (files) =>
{
  client.seed(files, (torrent) => {
    notifyPeers({
      magnet: torrent.magnetURI
    });
  });
};

dragDrop('body', shareFiles);

class FileSharing extends Component {
  constructor(props)
  {
    super(props);
  }

  handleFileChange = (event) =>
  {
    if (event.target.files.length > 0)
    {
      shareFiles(event.target.files);
    }
  };

  render()
  {
    return (
      <input type="file" onChange={this.handleFileChange} />
    );
  }
}

export default FileSharing;
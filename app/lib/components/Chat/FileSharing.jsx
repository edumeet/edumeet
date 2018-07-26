import React, { Component } from 'react';
import { connect } from 'react-redux';
import WebTorrent from 'webtorrent';
import dragDrop from 'drag-drop';
import * as stateActions from '../../redux/stateActions';
import * as requestActions from '../../redux/requestActions';

class FileSharing extends Component {
  notifyPeers = (file) =>
  {
    this.props.notifyPeers(
      file,
      this.props.displayName,
      this.props.picture
    );
  };

  componentDidMount()
  {
    this.client = new WebTorrent();

    dragDrop('body', (files) =>
    {
      this.client.seed(files, (torrent) => {
        this.notifyPeers({
          magnet: torrent.magnetURI
        });
      });
    });
  }

  render()
  {
    return (
      <div>
        drag & drop files to share them!!!
      </div>
    );
  }
}

const mapStateToProps = (state) =>
  ({
    displayName: state.me.displayName,
    picture: state.me.picture
  });

const mapDispatchToProps = (dispatch) =>
  ({
    notifyPeers: (file, displayName, picture) =>
    {
      dispatch(stateActions.addUserFile(file));
      dispatch(requestActions.sendChatFile(file, displayName, picture));
    }
  });

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FileSharing);
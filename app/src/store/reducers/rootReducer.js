import { combineReducers } from 'redux';
import room from './room';
import me from './me';
import producers from './producers';
import consumers from './consumers';
import transports from './transports';
import peers from './peers';
import lobbyPeers from './lobbyPeers';
import peerVolumes from './peerVolumes';
import notifications from './notifications';
import toolarea from './toolarea';
import chat from './chat';
import files from './files';
import recorder from './recorder';
import settings from './settings';
import config from './config';
import intl from './intl';

export default combineReducers({
	// intl : intlReducer,
	room,
	me,
	producers,
	consumers,
	transports,
	peers,
	lobbyPeers,
	peerVolumes,
	notifications,
	toolarea,
	chat,
	files,
	recorder,
	settings,
	config,
	intl
});

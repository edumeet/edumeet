import { combineReducers } from 'redux';
import room from './room';
import me from './me';
import producers from './producers';
import peers from './peers';
import consumers from './consumers';
import peerVolumes from './peerVolumes';
import notifications from './notifications';
import chatmessages from './chatmessages';
import toolarea from './toolarea';
import files from './files';

export default combineReducers({
	room,
	me,
	producers,
	peers,
	consumers,
	peerVolumes,
	notifications,
	chatmessages,
	toolarea,
	files
});

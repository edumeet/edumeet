import { combineReducers } from 'redux';
import room from './room';
import me from './me';
import producers from './producers';
import peers from './peers';
import consumers from './consumers';
import notifications from './notifications';

const reducers = combineReducers(
	{
		room,
		me,
		producers,
		peers,
		consumers,
		notifications
	});

export default reducers;

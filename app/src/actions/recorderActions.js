// Recoding STATE
import BrowserRecorder from '../BrowserRecorder';

export const RECORDING_START = 'start';
export const RECORDING_STOP = 'stop';
export const RECORDING_PAUSE = 'pause';
export const RECORDING_RESUME = 'resume';
export const RECORDING_INIT = null;

export const recorder = new BrowserRecorder();
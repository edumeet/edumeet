const initialState = null;

export const RECORDING_INIT = 'init';
export const RECORDING_START = 'start';
export const RECORDING_STOP = 'stop';
export const RECORDING_PAUSE = 'pause';
export const RECORDING_RESUME = 'resume';

const recorderReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'SET_LOCAL_RECORDING_STATE':
		{
			const { localRecordingState } = action.payload;

			return { ...state, localRecordingState };
		}

		default:
			return state;
	}
};

export default recorderReducer;

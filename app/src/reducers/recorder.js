const initialState = {
	localRecordingState : {
		status  : 'init',
		consent : 'init'
	}
}

;

const recorderReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'SET_LOCAL_RECORDING_STATE':
		{
			const { status } = action.payload;

			// eslint-disable-next-line no-console
			console.log(action.payload);

			const localRecordingState = state['localRecordingState'];

			localRecordingState.status = status;

			return { ...state,
				localRecordingState : localRecordingState
			};
		}

		case 'SET_LOCAL_RECORDING_CONSENT':
		{
			const { agreed } = action.payload;
			const localRecordingState = state['localRecordingState'];

			localRecordingState.consent = agreed;

			return { ...state,
				localRecordingState : localRecordingState
			};
		}

		default:
			return state;
	}
};

export default recorderReducer;

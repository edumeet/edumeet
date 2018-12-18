const files = (state = {}, action) =>
{
	switch (action.type)
	{
		case 'ADD_FILE':
		{
			const { file } = action.payload;

			const newFile = {
				active   : false,
				progress : 0,
				files    : null,
				me       : false,
				...file
			};

			return { ...state, [file.magnetUri]: newFile };
		}

		case 'ADD_FILE_HISTORY':
		{
			const { fileHistory } = action.payload;
			const newFileHistory = {};

			fileHistory.map((file) =>
			{
				const newFile = {
					active   : false,
					progress : 0,
					files    : null,
					me       : false,
					...file
				};

				newFileHistory[file.magnetUri] = newFile;
			});

			return { ...state, ...newFileHistory };
		}

		case 'SET_FILE_ACTIVE':
		{
			const { magnetUri } = action.payload;
			const file = state[magnetUri];

			const newFile = { ...file, active: true };

			return { ...state, [magnetUri]: newFile };
		}

		case 'SET_FILE_INACTIVE':
		{
			const { magnetUri } = action.payload;
			const file = state[magnetUri];

			const newFile = { ...file, active: false };

			return { ...state, [magnetUri]: newFile };
		}

		case 'SET_FILE_PROGRESS':
		{
			const { magnetUri, progress } = action.payload;
			const file = state[magnetUri];

			const newFile = { ...file, progress: progress };

			return { ...state, [magnetUri]: newFile };
		}

		case 'SET_FILE_DONE':
		{
			const { magnetUri, sharedFiles } = action.payload;
			const file = state[magnetUri];

			const newFile = {
				...file,
				files    : sharedFiles,
				progress : 1,
				active   : false,
				timeout  : false
			};

			return { ...state, [magnetUri]: newFile };
		}

		case 'REMOVE_FILE':
		{
			const { magnetUri } = action.payload;

			return state.filter((file) => file.magnetUri !== magnetUri);
		}

		default:
			return state;
	}
};

export default files;

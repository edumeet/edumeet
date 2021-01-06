const files = (state = [], action) =>
{
	switch (action.type)
	{
		case 'ADD_FILE':
		{
			const { peerId, magnetUri, time } = action.payload;

			const newFile = {
				type      : 'file',
				time      : time ? time : Date.now(),
				active    : false,
				progress  : 0,
				files     : null,
				peerId    : peerId,
				magnetUri : magnetUri
			};

			return [ ...state, newFile ];
		}

		case 'ADD_FILE_HISTORY':
		{
			const { fileHistory } = action.payload;

			const newFileHistory = [];

			fileHistory.forEach((file) =>
			{
				const newFile =
				{
					active   : false,
					type     : 'file',
					progress : 0,
					files    : null,
					...file
				};

				newFileHistory.push(newFile);
			});

			return [ ...state, ...newFileHistory ];
		}

		case 'SET_FILE_ACTIVE':
		{
			const { magnetUri } = action.payload;

			state.forEach((item, index) =>
			{
				if (item.magnetUri === magnetUri)
				{
					state[index] = { ...item, active: true };

				}
			});

			return [ ...state ];
		}

		case 'SET_FILE_INACTIVE':
		{
			const { magnetUri } = action.payload;

			state.forEach((item, index) =>
			{
				if (item.magnetUri === magnetUri)
				{
					state[index] = { ...item, active: false };
				}
			});

			return [ ...state ];
		}

		case 'SET_FILE_PROGRESS':
		{
			const { magnetUri, progress } = action.payload;

			state.forEach((item, index) =>
			{
				if (item.magnetUri === magnetUri)
				{
					state[index] = { ...item, progress: progress };
				}
			});

			return [ ...state ];
		}

		case 'SET_FILE_DONE':
		{
			const { magnetUri, sharedFiles } = action.payload;

			state.forEach((item, index) =>
			{
				if (item.magnetUri === magnetUri)
				{
					state[index] = {
						...item,
						files    : sharedFiles,
						progress : 1,
						// type : 'file',
						// time : Date.now(),
						active   : false,
						timeout  : false
					};
				}
			});

			return [ ...state ];
		}

		case 'CLEAR_FILES':
			return [];

		default:
			return state;
	}
};

export default files;

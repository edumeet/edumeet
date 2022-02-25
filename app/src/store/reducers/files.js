const initialState =
{
	files       : [],
	count       : 0,
	countUnread : 0
};

const files = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'ADD_FILE':
		{
			const file = action.payload;

			return {
				...state,
				files : [
					...state.files,
					{
						...file,
						active   : false,
						progress : 0,
						files    : null
					}
				],
				count       : state.count + 1,
				countUnread : file.sender === 'response' ? ++state.countUnread : state.countUnread

			};
		}

		case 'ADD_FILE_HISTORY':
		{
			const { fileHistory } = action.payload;

			const newFileHistory = [];

			fileHistory.forEach((file) =>
			{
				newFileHistory.push({
					active   : false,
					progress : 0,
					files    : null,
					...file
				});
			});

			return {
				...state,
				files : newFileHistory,
				count : newFileHistory.length
			};
		}

		case 'SET_FILE_ACTIVE':
		{
			const { magnetUri } = action.payload;

			state.files.forEach((item, index) =>
			{
				if (item.magnetUri === magnetUri)
				{
					state.files[index].active = true;
				}
			});

			return { ...state };
		}

		case 'SET_FILE_INACTIVE':
		{
			const { magnetUri } = action.payload;

			state.files.forEach((item, index) =>
			{
				if (item.magnetUri === magnetUri)
				{
					state.files[index].active = false;
				}
			});

			return { ...state };
		}

		case 'SET_FILE_PROGRESS':
		{
			const { magnetUri, progress } = action.payload;

			state.files.forEach((item, index) =>
			{
				if (item.magnetUri === magnetUri)
				{
					state.files[index].progress = progress;
				}
			});

			return { ...state };
		}

		case 'SET_FILE_DONE':
		{
			const { magnetUri, sharedFiles } = action.payload;

			state.files.forEach((item, index) =>
			{
				if (item.magnetUri === magnetUri)
				{
					state.files[index] = {
						...item,
						files    : sharedFiles,
						progress : 1,
						active   : false,
						timeout  : false
					};
				}
			});

			return { ...state };
		}

		case 'CLEAR_FILES':
		{
			return {
				...state,
				files       : [],
				count       : 0,
				countUnread : 0
			};

		}
		default:
			return state;
	}
};

export default files;

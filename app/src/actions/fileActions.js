export const addFile = (peerId, magnetUri) =>
	({
		type    : 'ADD_FILE',
		payload : { peerId, magnetUri }
	});

export const addFileHistory = (fileHistory) =>
	({
		type    : 'ADD_FILE_HISTORY',
		payload : { fileHistory }
	});

export const setFileActive = (magnetUri) =>
	({
		type    : 'SET_FILE_ACTIVE',
		payload : { magnetUri }
	});

export const setFileInActive = (magnetUri) =>
	({
		type    : 'SET_FILE_INACTIVE',
		payload : { magnetUri }
	});

export const setFileProgress = (magnetUri, progress) =>
	({
		type    : 'SET_FILE_PROGRESS',
		payload : { magnetUri, progress }
	});

export const setFileDone = (magnetUri, sharedFiles) =>
	({
		type    : 'SET_FILE_DONE',
		payload : { magnetUri, sharedFiles }
	});

export const clearFiles = () =>
	({
		type : 'CLEAR_FILES'
	});
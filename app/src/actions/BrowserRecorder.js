// import Logger from './../Logger';
// this.logger = new Logger('RoomClient');

import streamSaver from 'streamsaver';
import { WritableStream } from 'web-streams-polyfill/ponyfill';
import { openDB, deleteDB } from 'idb';
export default class BrowserRecorder
{

	constructor()
	{
		// MediaRecorder
		this.recorder = null;
		this.recordingMimeType = null;
		this.recorderStream = null;
		this.gdmStream = null;
		// this.fileName = `${dbName}.webm`;
		this.fileName = 'apple.webm';

		// IndexedDB
		this.idbDB = null;
		this.logToIDB = null;
		this.idbName = 'default';
		this.idbStoreName = 'chunks';

		// MIXER
		this.ctx = new AudioContext();
		this.dest = this.ctx.createMediaStreamDestination();
		this.gainNode = this.ctx.createGain();
		this.gainNode.connect(this.dest);

		this.RECORDING_CONSTRAINTS = {
			videoBitsPerSecond : 8000000,
			video              :
		{
			displaySurface : 'browser',
			width          : { ideal: 1920 }
		},
			audio    : true,
			advanced : [
				{ width: 1920, height: 1080 },
        		{ width: 1280, height: 720 }
        	]
        };

		// 10 sec
		this.RECORDING_SLICE_SIZE = 10000;
	}

	mixer(audiotrack, videostream)
	{
		// AUDIO 
		if (audiotrack != null)
		{
			this.ctx.createMediaStreamSource(
				new MediaStream([ audiotrack ])
			).connect(this.dest);
		}
		// VIDEO+AUDIO
		if (videostream.getAudioTracks().length > 0)
		{
			this.ctx.createMediaStreamSource(videostream).connect(this.dest);
		}
		// VIDEOMIX
		let tracks = this.dest.stream.getTracks();

		tracks = tracks.concat(videostream.getVideoTracks());

		return new MediaStream(tracks);

	}

	addTrack(track)
	{
		// gainNode.disconnect(); if i want to delete previos streams
		this.ctx.createMediaStreamSource(track).connect(this.dest);
	}

	async start({ additionalAudioTracks, recordingMimeType, constraints, micTrack = null })
	{
		this.recordingMimeType = recordingMimeType;
		// logger.debug('startLocalRecording()');
		// Check
		if (typeof MediaRecorder === undefined)
		{
			throw new Error('Unsupported media recording API');
		}
		// Check mimetype is supported by the browser
		if (MediaRecorder.isTypeSupported(this.recordingMimeType) === false)
		{
			throw new Error('Unsupported media recording format %O', this.recordingMimeType);
		}

		try
		{
			// Screensharing
			this.gdmStream = await navigator.mediaDevices.getDisplayMedia(
				this.RECORDING_CONSTRAINTS
			);

			this.gdmStream.getVideoTracks().forEach((track) =>
			{
				track.addEventListener('ended', (e) =>
				{
					// logger.debug(`gdmStream ${track.kind} track ended event: ${JSON.stringify(e)}`);
					this.stopLocalRecording();
				});
			});

			this.recorderStream = this.mixer(micTrack, this.gdmStream);

			this.recorder = new MediaRecorder(
				this.recorderStream, { mimeType: this.recordingMimeType }
			);

			if (typeof indexedDB === 'undefined' || typeof indexedDB.open === 'undefined')
			{
				// logger.warn('IndexedDB API is not available in this browser. Fallback to ');
				this.logToIDB = false;
			}
			else
			{
				this.idbName = Date.now();
				this.idbDB = await openDB(this.idbName, 1,
					{
						upgrade(db)
						{
							db.createObjectStore(this.idbStoreName);
						}
					}
				);
			}

			let chunkCounter = 0;

			// Save a recorded chunk (blob) to indexedDB
			const saveToDB = async function(data)
			{
				return await this.idbDB.put(this.idbStoreName, data, Date.now());
			};

			if (this.recorder)
			{
				this.recorder.ondataavailable = (e) =>
				{
					if (e.data && e.data.size > 0)
					{
						chunkCounter++;
						// logger.debug(`put chunk: ${chunkCounter}`);
						if (this.logToIDB)
						{
							try
							{
								saveToDB(e.data);
							}
							catch (error)
							{
								// logger.error('Error during saving data chunk to IndexedDB! error:%O', error);
							}
						}
						else
						{
							this.recordingData.push(e.data);
						}
					}
				};

				this.recorder.onerror = (error) =>
				{
					/*
					logger.err(`Recorder onerror: ${error}`);
					switch (error.name)
					{
						case 'SecurityError':
							store.dispatch(requestActions.notify(
								{
									type : 'error',
									text : intl.formatMessage({
										id             : 'room.localRecordingSecurityError',
                                        defaultMessage : 'Recording the specified source is not 
                                        allowed due to security restrictions.
                                         Check you client settings!'
									})
								}));
							break;
						case 'InvalidStateError':
						default:
							throw new Error(error);
                    }
                     */
				};

				this.recorder.onstop = (e) =>
				{
					// logger.debug(`Logger stopped event: ${e}`);

					if (this.logToIDB)
					{
						try
						{
							const useFallback = false;

							if (useFallback)
							{
								this.idbDB.getAll(this.idbStoreName).then((blobs) =>
								{

									this.saveRecordingAndCleanup(blobs, this.idbDB, this.idbName);

								});
							}
							else
							{
								// stream saver
								// On firefox WritableStream isn't implemented yet web-streams-polyfill/ponyfill will fix it
								if (!window.WritableStream)
								{
									streamSaver.WritableStream = WritableStream;
								}
								const fileStream = streamSaver.createWriteStream(`${this.idbName}.webm`, {
									// size : blob.size // Makes the procentage visiable in the download
								});

								const writer = fileStream.getWriter();

								this.idbDB.getAllKeys(this.idbStoreName).then((keys) =>
								{
									// recursive function to save the data from the indexed db
									this.saveRecordingWithStreamSaver(
										keys, writer, true, this.idbDB, this.idbName
									);
								});

							}

						}
						catch (error)
						{
							// logger.error('Error during getting all data chunks from IndexedDB! error: %O', error);
						}

					}
					else
					{
						this.saveRecordingAndCleanup(this.recordingData, this.idbDB, this.idbName);
					}

				};

				this.recorder.start(this.RECORDING_SLICE_SIZE);

			}
		}
		catch (error)
		{
			/*
            store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.unexpectedErrorDuringLocalRecording',
						defaultMessage : 'Unexpected error ocurred during local recording'
					})
				}));
            logger.error('startLocalRecording() [error:"%o"]', error);
            */
			if (this.recorder) this.recorder.stop();
			// store.dispatch(meActions.setLocalRecordingState(RECORDING_STOP));
			if (typeof this.gdmStream !== 'undefined' && this.gdmStream && typeof this.gdmStream.getTracks === 'function')
			{
				this.gdmStream.getTracks().forEach((track) => track.stop());
			}

			this.gdmStream = null;
			this.recorderStream = null;
			this.recorder = null;

			return -1;
		}

		try
		{
			// await this.sendRequest('setLocalRecording', { localRecordingState: RECORDING_START });

			// store.dispatch(meActions.setLocalRecordingState(RECORDING_START));

			/* store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'room.youStartedLocalRecording',
						defaultMessage : 'You started local recording'
					})
				})); */
		}
		catch (error)
		{
			/*
            store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.unexpectedErrorDuringLocalRecording',
						defaultMessage : 'Unexpected error ocurred during local recording'
					})
				}));
            logger.error('startLocalRecording() [error:"%o"]', error);
            */
		}
	}
	stop()
	{
		// logger.debug('stopLocalRecording()');
		try
		{
			this.recorder.stop();

			/*
            store.dispatch(requestActions.notify(
				{
					text : intl.formatMessage({
						id             : 'room.youStoppedLocalRecording',
						defaultMessage : 'You stopped local recording'
					})
				}));
            */
			// store.dispatch(meActions.setLocalRecordingState(RECORDING_STOP));

			// await this.sendRequest('setLocalRecording', { localRecordingState: RECORDING_STOP });

		}
		catch (error)
		{
			/*
            store.dispatch(requestActions.notify(
				{
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.unexpectedErrorDuringLocalRecording',
						defaultMessage : 'Unexpected error ocurred during local recording'
					})
				}));

            logger.error('stopLocalRecording() [error:"%o"]', error);
            */
		}
	}
	invokeSaveAsDialog(blob)
	{
		const link = document.createElement('a');

		link.style = 'display:none;opacity:0;color:transparent;';
		link.href = URL.createObjectURL(blob);
		link.download = this.fileName;

		(document.body || document.documentElement).appendChild(link);
		if (typeof link.click === 'function')
		{
			link.click();
		}
		else
		{
			link.target = '_blank';
			link.dispatchEvent(new MouseEvent('click',
				{
					view       : window,
					bubbles    : true,
					cancelable : true
				}));
		}
		URL.revokeObjectURL(link.href);

	}
	// save recording and destroy
	saveRecordingAndCleanup(blobs, db, dbName)
	{
		// merge blob
		const blob = new Blob(blobs, { type: this.recordingMimeType });

		// Stop all used video/audio tracks
		if (this.recorderStream && this.recorderStream.getTracks().length > 0)
			this.recorderStream.getTracks().forEach((track) => track.stop());

		if (this.gdmStream && this.gdmStream.getTracks().length > 0)
			this.gdmStream.getTracks().forEach((track) => track.stop());

		// save as
		this.invokeSaveAsDialog(blob, `${dbName}.webm`);

		// destroy
		this.saveRecordingCleanup(db, dbName);
	}

	// save recording with Stream saver and destroy
	saveRecordingWithStreamSaver(keys, writer, stop = false, db, dbName)
	{
		let readableStream = null;

		let reader = null;

		let pump = null;

		const key = keys[0];

		// on the first call we stop the streams (tab/screen sharing) 
		if (stop)
		{
			// Stop all used video/audio tracks
			if (this.recorderStream && this.recorderStream.getTracks().length > 0)
				this.recorderStream.getTracks().forEach((track) => track.stop());

			if (this.gdmStream && this.gdmStream.getTracks().length > 0)
				this.gdmStream.getTracks().forEach((track) => track.stop());
		}
		// we remove the key that we are removing
		keys.shift();
		db.get(this.idbStoreName, key).then((blob) =>
		{
			if (keys.length === 0)
			{
				// if this is the last key we close the writable stream and cleanup the indexedDB
				readableStream = blob.stream();
				reader = readableStream.getReader();
				pump = () => reader.read()
					.then((res) => (res.done
						? this.saveRecordingCleanup(db, dbName, writer)
						: writer.write(res.value).then(pump)));
				pump();
			}
			else
			{
				// push data to the writable stream
				readableStream = blob.stream();
				reader = readableStream.getReader();
				pump = () => reader.read()
					.then((res) => (res.done
						? this.saveRecordingWithStreamSaver(keys, writer, false, db, dbName)
						: writer.write(res.value).then(pump)));
				pump();
			}
		});

	}

	saveRecordingCleanup(db, dbName, writer = null)
	{
		if (writer != null)
		{
			writer.close();
		}
		// destroy
		db.close();
		deleteDB(dbName);
		// delete all previouse recordings that might be left in indexedDB
		// https://bugzilla.mozilla.org/show_bug.cgi?id=934640
		if (indexedDB.databases instanceof Function)
		{
			indexedDB.databases().then((r) => r.forEach((dbdata) => deleteDB(dbdata.name)));
		}

		this.recordingMimeType = null;
		this.recordingData = [];
		this.recorder = null;
	}

	recoverRecording(dbName)
	{
		try
		{
			openDB(dbName, 1).then((db) =>
			{
				db.getAll(this.idbStoreName).then((blobs) =>
				{
					this.saveRecordingAndCleanup(blobs, db, dbName);
				});
			}
			);
		}
		catch (error)
		{
			// logger.error('Error during save recovered recording error: %O', error);
		}
	}
}
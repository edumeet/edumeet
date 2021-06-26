import { EventEmitterTyped, IEventsDescriptor } from './EventEmitter';
import EdumeetSignalingAPI from './SignalingAPI';
import Logger from './Logger';
import type { Instance as WebTorrentInstance, Torrent } from 'webtorrent';
import type { IEdumeetFile } from './types';
import { isWebRTCSupported } from './utils';
import type EdumeetRoom from './Room';


const logger = new Logger('Files');

interface FileEvents extends IEventsDescriptor {
	error: (err: string|Error) => void,
	fileAdded: (file: IEdumeetFile) => void
	filesCleared: () => void,
	downloadStarted: (file: IEdumeetFile) => void
	downloadProgress: (file: IEdumeetFile) => void
	downloadCompleted: (file: IEdumeetFile) => void
}



export default class EdumeetFiles extends EventEmitterTyped<FileEvents> {
	private api: EdumeetSignalingAPI
	private _webTorrent?: WebTorrentInstance
	private files: Map<string, IEdumeetFile> = new Map()
	private room: EdumeetRoom
	torrentTrackers: string[] = [
		'wss://tracker.openwebtorrent.com',
		// 'wss://tracker.btorrent.xyz',
		// 'wss://tracker.fastcast.nz'
	]
	constructor({ api, room }: {
		api: EdumeetSignalingAPI,
		room: EdumeetRoom
	}) {
		super();
		this.api = api;
		this.room = room

		this.api.on('notification:sendFile' ,(obj: any) => {
			const file: IEdumeetFile = {
				active    : false,
				progress  : 0,
				files     : null,
				peerId    : obj.peerId,
				magnetUri : obj.magnetUri
			}
			this.files.set(file.magnetUri, file)
			this.emit('fileAdded', obj)
		})
		this.api.on('notification:moderator:clearChat', () => {
			this.files.clear()
			// TODO: stop potential ongoing downloads?
			this.emit('filesCleared')
		})
	}
	isSupported() {
		return isWebRTCSupported();
	}
	getFiles(): IEdumeetFile[] {
		return Array.from(this.files.values())
	}
	async connect(iceServers: RTCIceServer[]) {
		if (!isWebRTCSupported()) {
			logger.warn('WebRTC is not supported by this browser. File sharing is now disabled');
			return;
		}
		const { default: WebTorrent } = await import(
			/* webpackPrefetch: true */
			/* webpackChunkName: "webtorrent" */
			'webtorrent'
		);
			
		this._webTorrent = new WebTorrent({
			tracker : {
				rtcConfig : {
					iceServers
				}
			}
		});
		this._webTorrent.on('error', (err: string|Error) => this.emit('error', err));
	}

	async addFiles(files: FileList|File[]): Promise<IEdumeetFile> {
		if(!this._webTorrent) throw new Error('could not add file. call connect() first')
		const webTorrent = this._webTorrent
		const { default: createTorrent } = await import(
			/* webpackPrefetch: true */
			/* webpackChunkName: "createtorrent" */
			'create-torrent'
		);
		
		const torrent: Torrent = await new Promise( (resolve, reject) => {
			createTorrent(files, (err, torrent) => {
				if (err) {
					reject(err)
					return
				}
				const existingTorrent = webTorrent.get(torrent);
				
				if (existingTorrent) {
					resolve(existingTorrent)
				} else {
					webTorrent.seed(
						files,
						{ announce: this.torrentTrackers },
						resolve
					);
				}
			});
		})


		const file: IEdumeetFile = {
			active    : false,
			progress  : 0,
			files     : null,
			peerId    : this.room.getMe().id,
			magnetUri : torrent.magnetURI,
			torrent   : torrent
		}
		this.files.set(file.magnetUri, file)
		
		await this.api.sendFile({
			type       : 'file',
			time       : Date.now(),
			sender     : 'response',
			name       : this.room.getMe().displayName,
			picture    : this.room.getMe().avatarUrl,
			peerId: this.room.getMe().id,
			magnetUri: torrent.magnetURI
		});
		this.emit('fileAdded', file)
		return file
	}

	async startDownload(magnetUri: string) {
		if(!this._webTorrent) throw new Error('call connect() first before starting a download')
		const webTorrent = this._webTorrent
		const file = this.files.get(magnetUri)
		if(!file) throw new Error('file unknown')

		let torrent: Torrent|void = file.torrent

		if(!torrent) {
			torrent = webTorrent.get(magnetUri);
		}
		if(!torrent) {
			torrent = await new Promise( (resolve) => webTorrent.add(magnetUri, resolve)) as Torrent
		}
		file.torrent = torrent
		if (torrent.progress === 1) {
			file.active = false
			file.progress = 1
			this.emit('downloadComplete', file)
			return;
		}

		file.active = true
		this.emit('downloadStarted', file)

		let lastMove = 0;
		torrent.on('download', () => {
			file.progress = (torrent as Torrent).progress
			if (Date.now() - lastMove > 1000) {
				this.emit('downloadProgress', file)
				lastMove = Date.now();
			}
		});

		torrent.on('done', () => {
			file.active = false
			file.progress = 1
			this.emit('downloadCompleted', file)
		});
	}
	handleFileHistory(history: Array<{peerId: string, magnetUri: string}>) {
		for(let f of history) {
			const file: IEdumeetFile = {
				peerId: f.peerId,
				magnetUri: f.magnetUri,
				files:  null,
				active: false,
				progress: 0,
			}
			this.files.set(f.magnetUri, file)
		}
	}
	async clear() {
		// await this.api.moderatorClearChat();
		this.files.clear()
		this.emit('filesCleared')
	}
}
'use strict';

import React from 'react';
import ClipboardButton from 'react-clipboard.js';
import TransitionAppear from './TransitionAppear';
import LocalVideo from './LocalVideo';
import RemoteVideo from './RemoteVideo';
import Stats from './Stats';
import Logger from '../Logger';
import utils from '../utils';
import Client from '../Client';

const logger = new Logger('Room');
const STATS_INTERVAL = 1000;

export default class Room extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			peers                : {},
			localStream          : null,
			localVideoResolution : null, // qvga / vga / hd / fullhd.
			multipleWebcams      : false,
			webcamType           : null,
			connectionState      : null,
			remoteStreams        : {},
			showStats            : false,
			stats                : null
		};

		// Mounted flag
		this._mounted = false;
		// Client instance
		this._client = null;
		// Timer to retrieve RTC stats.
		this._statsTimer = null;
	}

	render()
	{
		let props = this.props;
		let state = this.state;
		let numPeers = Object.keys(state.remoteStreams).length;

		return (
			<TransitionAppear duration={2000}>
				<div data-component='Room'>

					<div className='room-link-wrapper'>
						<div className='room-link'>
							<ClipboardButton
								component='a'
								className='link'
								button-href={window.location.href}
								data-clipboard-text={window.location.href}
								onSuccess={this.handleRoomLinkCopied.bind(this)}
								onClick={() => {}} // Avoid link action.
							>
								invite people to this room
							</ClipboardButton>
						</div>
					</div>

					<div className='remote-videos'>
						{
							Object.keys(state.remoteStreams).map((msid) =>
							{
								let stream = state.remoteStreams[msid];
								let peer;

								for (let peerId of Object.keys(state.peers))
								{
									peer = state.peers[peerId];

									if (peer.msids.indexOf(msid) !== -1)
										break;
								}

								if (!peer)
									return;

								return (
									<TransitionAppear key={msid} duration={500}>
										<RemoteVideo
											peer={peer}
											stream={stream}
											fullsize={numPeers === 1}
											onDisableVideo={this.handleDisableRemoteVideo.bind(this)}
											onEnableVideo={this.handleEnableRemoteVideo.bind(this)}
										/>
									</TransitionAppear>
								);
							})
						}
					</div>

					<TransitionAppear duration={500}>
						<div className='local-video'>
							<LocalVideo
								peerId={props.peerId}
								stream={state.localStream}
								resolution={state.localVideoResolution}
								multipleWebcams={state.multipleWebcams}
								webcamType={state.webcamType}
								connectionState={state.connectionState}
								onMicMute={this.handleLocalMute.bind(this)}
								onWebcamToggle={this.handleLocalWebcamToggle.bind(this)}
								onWebcamChange={this.handleLocalWebcamChange.bind(this)}
								onResolutionChange={this.handleLocalResolutionChange.bind(this)}
							/>

							{state.showStats ?
								<TransitionAppear duration={500}>
									<Stats
										stats={state.stats || new Map()}
										onClose={this.handleStatsClose.bind(this)}
									/>
								</TransitionAppear>
							:
								<div
									className='show-stats'
									onClick={this.handleClickShowStats.bind(this)}
								/>
							}
						</div>
					</TransitionAppear>
				</div>
			</TransitionAppear>
		);
	}

	componentDidMount()
	{
		// Set flag
		this._mounted = true;

		// Run the client
		this._runClient();
	}

	componentWillUnmount()
	{
		let state = this.state;

		// Unset flag
		this._mounted = false;

		// Close client
		this._client.removeAllListeners();
		this._client.close();

		// Close local MediaStream
		if (state.localStream)
			utils.closeMediaStream(state.localStream);
	}

	handleRoomLinkCopied()
	{
		logger.debug('handleRoomLinkCopied()');

		this.props.onNotify(
			{
				level    : 'success',
				position : 'tr',
				title    : 'Room URL copied to the clipboard',
				message  : 'Share it with others to join this room'
			});
	}

	handleLocalMute(value)
	{
		logger.debug('handleLocalMute() [value:%s]', value);

		let micTrack = this.state.localStream.getAudioTracks()[0];

		if (!micTrack)
			return Promise.reject(new Error('no audio track'));

		micTrack.enabled = !value;

		return Promise.resolve();
	}

	handleLocalWebcamToggle(value)
	{
		logger.debug('handleLocalWebcamToggle() [value:%s]', value);

		return Promise.resolve()
			.then(() =>
			{
				if (value)
					return this._client.addVideo();
				else
					return this._client.removeVideo();
			})
			.then(() =>
			{
				let localStream = this.state.localStream;

				this.setState({ localStream });
			});
	}

	handleLocalWebcamChange()
	{
		logger.debug('handleLocalWebcamChange()');

		this._client.changeWebcam();
	}

	handleLocalResolutionChange()
	{
		logger.debug('handleLocalResolutionChange()');

		this._client.changeVideoResolution();
	}

	handleStatsClose()
	{
		logger.debug('handleStatsClose()');

		this.setState({ showStats: false });
		this._stopStats();
	}

	handleClickShowStats()
	{
		logger.debug('handleClickShowStats()');

		this.setState({ showStats: true });
		this._startStats();
	}

	handleDisableRemoteVideo(msid)
	{
		logger.debug('handleDisableRemoteVideo() [msid:"%s"]', msid);

		this._client.disableRemoteVideo(msid);
	}

	handleEnableRemoteVideo(msid)
	{
		logger.debug('handleEnableRemoteVideo() [msid:"%s"]', msid);

		this._client.enableRemoteVideo(msid);
	}

	_runClient()
	{
		let peerId = this.props.peerId;
		let roomId = this.props.roomId;

		logger.debug('_runClient() [peerId:"%s", roomId:"%s"]', peerId, roomId);

		this._client = new Client(peerId, roomId);

		this._client.on('localstream', (stream, resolution) =>
		{
			this.setState(
				{
					localStream          : stream,
					localVideoResolution : resolution
				});
		});

		this._client.on('join', () =>
		{
			// Clear remote streams (for reconnections).
			this.setState({ remoteStreams: {} });

			this.props.onNotify(
				{
					level       : 'success',
					title       : 'Yes!',
					message     : 'You are in the room!',
					image       : '/resources/images/room.svg',
					imageWidth  : 80,
					imageHeight : 80
				});

			// Start retrieving WebRTC stats (unless mobile)
			if (utils.isDesktop())
			{
				this.setState({ showStats: true });

				setTimeout(() =>
				{
					this._startStats();
				}, STATS_INTERVAL / 2);
			}
		});

		this._client.on('close', (error) =>
		{
			// Clear remote streams (for reconnections).
			this.setState({ remoteStreams: {} });

			if (error)
			{
				this.props.onNotify(
					{
						level   : 'error',
						title   : 'Error',
						message : error.message
					});
			}

			// Stop retrieving WebRTC stats.
			this._stopStats();
		});

		this._client.on('disconnected', () =>
		{
			// Clear remote streams (for reconnections).
			this.setState({ remoteStreams: {} });

			this.props.onNotify(
				{
					level   : 'error',
					title   : 'Warning',
					message : 'app disconnected'
				});

			// Stop retrieving WebRTC stats.
			this._stopStats();
		});

		this._client.on('numwebcams', (num) =>
		{
			this.setState(
				{
					multipleWebcams : (num > 1 ? true : false)
				});
		});

		this._client.on('webcamtype', (type) =>
		{
			this.setState({ webcamType: type });
		});

		this._client.on('peers', (peers) =>
		{
			let peersObject = {};

			for (let peer of peers)
			{
				peersObject[peer.id] = peer;
			}

			this.setState({ peers: peersObject });
		});

		this._client.on('addpeer', (peer) =>
		{
			this.props.onNotify(
				{
					level   : 'success',
					message : `${peer.id} joined the room`
				});

			let peers = this.state.peers;

			peers[peer.id] = peer;
			this.setState({ peers });
		});

		this._client.on('updatepeer', (peer) =>
		{
			let peers = this.state.peers;

			peers[peer.id] = peer;
			this.setState({ peers });
		});

		this._client.on('removepeer', (peer) =>
		{
			this.props.onNotify(
				{
					level   : 'info',
					message : `${peer.id} left the room`
				});

			let peers = this.state.peers;

			delete peers[peer.id];
			this.setState({ peers });
		});

		this._client.on('connectionstate', (state) =>
		{
			this.setState({ connectionState: state });
		});

		this._client.on('addstream', (stream) =>
		{
			let remoteStreams = this.state.remoteStreams;

			remoteStreams[stream.id] = stream;
			this.setState({ remoteStreams });
		});

		this._client.on('removestream', (stream) =>
		{
			let remoteStreams = this.state.remoteStreams;

			delete remoteStreams[stream.id];
			this.setState({ remoteStreams });
		});

		this._client.on('addtrack', () =>
		{
			let remoteStreams = this.state.remoteStreams;

			this.setState({ remoteStreams });
		});

		this._client.on('removetrack', () =>
		{
			let remoteStreams = this.state.remoteStreams;

			this.setState({ remoteStreams });
		});

		this._client.on('forcestreamsupdate', () =>
		{
			// Just firef for Firefox due to bug:
			// https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
			this.forceUpdate();
		});
	}

	_startStats()
	{
		logger.debug('_startStats()');

		getStats.call(this);

		function getStats()
		{
			this._client.getStats()
				.then((stats) =>
				{
					if (!this._mounted)
						return;

					this.setState({ stats });

					this._statsTimer = setTimeout(() =>
					{
						getStats.call(this);
					}, STATS_INTERVAL);
				})
				.catch((error) =>
				{
					logger.error('getStats() failed: %o', error);

					this.setState({ stats: null });

					this._statsTimer = setTimeout(() =>
					{
						getStats.call(this);
					}, STATS_INTERVAL);
				});
		}
	}

	_stopStats()
	{
		logger.debug('_stopStats()');

		this.setState({ stats: null });

		clearTimeout(this._statsTimer);
	}
}

Room.propTypes =
{
	peerId             : React.PropTypes.string.isRequired,
	roomId             : React.PropTypes.string.isRequired,
	onNotify           : React.PropTypes.func.isRequired,
	onHideNotification : React.PropTypes.func.isRequired
};

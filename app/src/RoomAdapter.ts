import { Store } from 'redux';
import EdumeetRoom from 'lib-edumeet/src/Room';
import * as requestActions from './actions/requestActions';
import * as meActions from './actions/meActions';
import * as intlActions from './actions/intlActions';
import * as roomActions from './actions/roomActions';
import * as peerActions from './actions/peerActions';
import * as peerVolumeActions from './actions/peerVolumeActions';
import * as settingsActions from './actions/settingsActions';
import * as chatActions from './actions/chatActions';
import * as fileActions from './actions/fileActions';
import * as lobbyPeerActions from './actions/lobbyPeerActions';
import * as consumerActions from './actions/consumerActions';
import * as producerActions from './actions/producerActions';
import * as notificationActions from './actions/notificationActions';
import * as transportActions from './actions/transportActions';
import { createIntl, IntlShape } from 'react-intl';
import * as locales from './translations/locales';
import Logger from './Logger';
import {
	IEdumeetConsumer,
	IEdumeetSimulastProfiles,
	RtpEncodingParameters
} from 'lib-edumeet/src/types';
import { PERMISSIONS } from 'lib-edumeet/src/consts';
import type WebTorrent from 'webtorrent';
import { startKeyListener } from './keyBindings';

import { config } from './config';
import BrowserRecorder from './BrowserRecorder';
const logger = new Logger('RoomAdapter');

let store: Store;
let intl: IntlShape;

interface IRoomAdapterProps {
	peerId: string;
	accessCode: string;
	device: any;
	produce: boolean;
	headless: boolean;
	forceTcp: boolean;
	displayName: string;
	muted: boolean;
}

/**
 * Adapter between lib-edumeet and the react UI
 * - setting redux states
 * - methods for calling lib-edumeet
 * - notification sounds
 */
export default class RoomAdapter
{
	private _muted = false
	protected room: EdumeetRoom
	protected _soundAlerts: {
		[type: string]: {
			audio: HTMLAudioElement;
			delay?: number;
			last?: number;
		};
	}
	protected _autoJoinAudio = false
	protected _autoJoinVideo = false

	static init(data: any)
	{
		store = data.store;
	}

	constructor({
		peerId,
		// accessCode,
		device,
		produce,
		headless,
		forceTcp,
		displayName,
		muted
	}: IRoomAdapterProps)
	{
		// @ts-ignore
		window.roomClient = this;

		this._muted = muted;

		const {
			autoGainControl,
			echoCancellation,
			noiseSuppression,
			noiseThreshold,
			resolution,
			aspectRatio,
			frameRate,
			screenSharingResolution,
			screenSharingFrameRate,
			hideNoVideoParticipants,
			sampleRate,
			channelCount,
			sampleSize,
			opusStereo,
			opusDtx,
			opusFec,
			opusPtime,
			opusMaxPlaybackRate,
			enableOpusDetails
		} = store.getState().settings;

		// so far there was mistakenly `maxBitRate` used, but RTCRtpEncodingParameters
		// only understands `maxBitrate` (lower case R)
		// https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpEncodingParameters/maxBitrate
		// lib-edumeet works with `maxBitrate`, so we rename the key and accept both for now
		// TODO: change config key maxBitRate -> maxBitrate

		const simulcastProfiles: IEdumeetSimulastProfiles = {};

		for (const width of Object.keys(config.simulcastProfiles))
		{
			const profile = config.simulcastProfiles[width];

			simulcastProfiles[parseInt(width)] = profile.map(
				(p: any): RtpEncodingParameters =>
				{
					return {
						scaleResolutionDownBy : p.scaleResolutionDownBy,
						maxBitrate            : p.maxBitRate || p.maxBitrate
					};
				}
			);
		}

		this.room = new EdumeetRoom(
			{
				hostname : config.serverHostname || window.location.hostname,
				port     : config[
					process.env.NODE_ENV !== 'production' ? 'developmentPort' : 'productionPort'
				],
				requestRetries : config.requestRetries || 3,
				requestTimeout : config.requestTimeout || 20000,
				simulcast      : {
					enabled               : Boolean(config.simulcast),
					screenSharing         : Boolean(config.simulcastSharing),
					adaptiveScalingFactor : Math.min(
						Math.max(config.adaptiveScalingFactor || 0.75, 0.5),
						1.0
					),
					profiles : config.simulcastProfiles
				},
				torrentsEnabled    : true,
				opusDetailsEnabled : enableOpusDetails,
				networkPriorities  : config.networkPriorities,
				spotlights         : {
					lastN                   : device.platform === 'desktop' ? config.lastN : config.mobileLastN,
					hideNoVideoParticipants : hideNoVideoParticipants
				},
				defaults : {
					audio : {
						autoGainControl,
						echoCancellation,
						noiseSuppression,
						noiseThreshold,
						sampleRate,
						channelCount,
						sampleSize,
						opusStereo,
						opusDtx,
						opusFec,
						opusPtime,
						opusMaxPlaybackRate
					},
					video : {
						resolution,
						aspectRatio,
						frameRate
					},
					screenshare : {
						resolution : screenSharingResolution,
						frameRate  : screenSharingFrameRate
					}
				}
			},
			{
				peerId,
				isProduceEnabled : produce,
				forceTcp
			}
		);

		if (displayName) store.dispatch(settingsActions.setDisplayName(displayName));

		store.dispatch(settingsActions.setLastN(this.room.spotlights.maxSpotlights));

		if (store.getState().settings.localPicture)
		{
			store.dispatch(meActions.setPicture(store.getState().settings.localPicture));
		}

		store.dispatch(
			settingsActions.setRecorderSupportedMimeTypes(
				BrowserRecorder.getSupportedMimeTypes()
			)
		);

		// Put the browser info into state
		store.dispatch(meActions.setBrowser(device));

		// Alert sounds
		this._soundAlerts = { default: { audio: new Audio('/sounds/notify.mp3') } };
		if (config.notificationSounds)
		{
			for (const [ k, v ] of Object.entries(config.notificationSounds) as any)
			{
				if (v && v.play !== undefined)
				{
					this._soundAlerts[k] = {
						audio : new Audio(v.play),
						delay : v.delay ? v.delay : 0
					};
				}
			}
		}

		this.attachEventHandlers();

		store.subscribe(() =>
		{
			const {
				voiceActivatedUnmute,
				displayName: displayName2
			} = store.getState().settings;
			const { picture } = store.getState().me;

			this.room.producers.isVoiceActivationEnabled = voiceActivatedUnmute;
			this.room.changeDisplayName(displayName2);
			this.room.changeAvatar(picture);
		});

		this.setLocale(store.getState().intl.locale);

		startKeyListener(this.room, store, intl);

		if (headless)
		{
			const encodedRoomId = encodeURIComponent(
				decodeURIComponent(window.location.pathname.slice(1))
			);

			this.join({
				roomId    : encodedRoomId,
				joinVideo : false,
				joinAudio : false
			});
		}
	}
	private attachEventHandlers()
	{

		// Edumeet Events
		this.room.on('disconnect', ({ reason }) =>
		{
			if (reason === 'io server disconnect')
			{
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'socket.disconnected',
							defaultMessage : 'You are disconnected'
						})
					})
				);

				this.close();
			}

			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'socket.reconnecting',
						defaultMessage : 'You are disconnected, attempting to reconnect'
					})
				})
			);

			store.dispatch(peerActions.clearPeers());
			store.dispatch(consumerActions.clearConsumers());
			store.dispatch(roomActions.clearSpotlights());
			store.dispatch(roomActions.setRoomState('connecting'));
		});

		this.room.on('reconnect_failed', () =>
		{
			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'socket.disconnected',
						defaultMessage : 'You are disconnected'
					})
				})
			);

			this.close();
		});

		this.room.on('reconnect', () =>
		{
			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'socket.reconnected',
						defaultMessage : 'You are reconnected'
					})
				})
			);

			store.dispatch(roomActions.setRoomState('connected'));
		});

		this.room.on('joined', this.handleJoined);
		this.room.on('_roomReady', () =>
		{
			store.dispatch(roomActions.toggleJoined());
		});
		this.room.on('roomUpdate', this.handleRoomUpdate);
		this.room.on('peerVolumeChange', ({ peerId, volume }) =>
		{
			store.dispatch(peerVolumeActions.setPeerVolume(peerId, volume));
		});
		this.room.on('peerJoined', ({ peer, initial }) =>
		{
			if (peer.isInLobby)
			{
				store.dispatch(lobbyPeerActions.addLobbyPeer(peer.id));
				if (peer.displayName)
				{
					store.dispatch(
						lobbyPeerActions.setLobbyPeerDisplayName(peer.displayName, peer.id)
					);
				}
				if (peer.avatarUrl)
				{
					store.dispatch(lobbyPeerActions.setLobbyPeerPicture(peer.avatarUrl, peer.id));
				}

				if (!initial)
				{
					store.dispatch(roomActions.setToolbarsVisible(true));
					this._soundNotification('parkedPeer');
					store.dispatch(
						requestActions.notify({
							text : intl.formatMessage({
								id             : 'room.newLobbyPeer',
								defaultMessage : 'New participant entered the lobby'
							})
						})
					);
				}
			}
			else
			{
				store.dispatch(peerActions.addPeer({ ...peer, consumers: [] }));
				if (!initial)
				{
					this._soundNotification('newPeer');
					store.dispatch(
						requestActions.notify({
							text : intl.formatMessage(
								{
									id             : 'room.newPeer',
									defaultMessage : '{displayName} joined the room'
								},
								{
									displayName : peer.displayName
								}
							)
						})
					);
				}
			}
		});
		this.room.on('peerChanged', ({ prev, peer }) =>
		{
			if (prev.displayName !== peer.displayName)
			{
				if (peer.isInLobby)
				{
					store.dispatch(
						lobbyPeerActions.setLobbyPeerDisplayName(peer.displayName, peer.id)
					);

					store.dispatch(
						requestActions.notify({
							text : intl.formatMessage(
								{
									id             : 'room.lobbyPeerChangedDisplayName',
									defaultMessage :
										'Participant in lobby changed name to {displayName}'
								},
								{
									displayName : peer.displayName
								}
							)
						})
					);
				}
				else
				{
					store.dispatch(peerActions.setPeerDisplayName(prev.displayName, peer.id));

					store.dispatch(
						requestActions.notify({
							text : intl.formatMessage(
								{
									id             : 'room.peerChangedDisplayName',
									defaultMessage : '{oldDisplayName} is now {displayName}'
								},
								{
									oldDisplayName : prev.displayName,
									displayName    : peer.displayName
								}
							)
						})
					);
				}
			}

			if (prev.avatarUrl !== peer.avatarUrl)
			{
				if (peer.isInLobby)
				{
					store.dispatch(lobbyPeerActions.setLobbyPeerPicture(peer.avatarUrl, peer.id));

					store.dispatch(
						requestActions.notify({
							text : intl.formatMessage({
								id             : 'room.lobbyPeerChangedPicture',
								defaultMessage : 'Participant in lobby changed picture'
							})
						})
					);
				}
				else
				{
					store.dispatch(peerActions.setPeerPicture(peer.id, peer.avatarUrl));
				}
			}
		});
		this.room.on('peerLeft', ({ peerId, wasInLobby }) =>
		{
			if (wasInLobby)
			{
				store.dispatch(lobbyPeerActions.removeLobbyPeer(peerId));
			}
			else
			{
				store.dispatch(peerActions.removePeer(peerId));
			}
		});
		this.room.on('peerRoleAdded', ({ peerId, role }) =>
		{
			if (peerId === this.room.getMyPeerId())
			{
				store.dispatch(meActions.addRole(role.id));
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage(
							{
								id             : 'roles.gotRole',
								defaultMessage : 'You got the role: {role}'
							},
							{
								role : role.label
							}
						)
					})
				);
			}
			else
			{
				store.dispatch(peerActions.addPeerRole(peerId, role.id));
			}
		});
		this.room.on('peerRoleRemoved', ({ peerId, role }) =>
		{
			if (peerId === this.room.getMyPeerId())
			{
				store.dispatch(meActions.removeRole(role.id));

				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage(
							{
								id             : 'roles.lostRole',
								defaultMessage : 'You lost the role: {role}'
							},
							{
								role : role.label
							}
						)
					})
				);
			}
			else
			{
				store.dispatch(peerActions.removePeerRole(peerId, role.id));
			}
		});
		this.room.on('chatMessage', (message) =>
		{
			if (message.peerId === this.room.getMyPeerId())
			{
				store.dispatch(
					chatActions.addMessage({
						type    : message.type,
						time    : message.time,
						sender  : message.sender,
						isRead  : true,
						name    : message.profileName,
						picture : undefined,
						text    : message.content
					})
				);
				store.dispatch(chatActions.setIsScrollEnd(true));
			}
			else
			{
				store.dispatch(
					chatActions.addMessage({
						type    : message.type,
						text    : message.content,
						time    : message.time,
						name    : message.profileName,
						sender  : message.sender,
						picture : message.picture,
						peerId  : message.peerId,
						isRead  : false
					})
				);

				if (
					!store.getState().toolarea.toolAreaOpen ||
					(store.getState().toolarea.toolAreaOpen &&
						store.getState().toolarea.currentToolTab !== 'chat')
				)
				{
					// Make sound
					store.dispatch(roomActions.setToolbarsVisible(true));
					this._soundNotification('chatMessage');
				}
			}
		});
		this.room.on('chatCleared', () =>
		{
			store.dispatch(chatActions.clearChat());
			store.dispatch(fileActions.clearFiles());

			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'moderator.clearChat',
						defaultMessage : 'Moderator cleared the chat'
					})
				})
			);
		});
		this.room.on('activeSpeaker', ({ peerId }) =>
		{
			store.dispatch(roomActions.setRoomActiveSpeaker(peerId));
		});
		this.room.spotlights.on('update', ({ currentSpotlights }) =>
		{
			store.dispatch(roomActions.setSpotlights(currentSpotlights));
		});
		this.room.on('newDeviceDetected', () =>
		{
			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'devices.devicesChanged',
						defaultMessage :
							'Your devices changed, configure your devices in the settings dialog'
					})
				})
			);
		});
		this.room.on('handUpdate', ({ peerId, handRaised, timestamp }) =>
		{
			if (peerId === this.room.getMyPeerId())
			{
				store.dispatch(meActions.setRaisedHand(handRaised));
			}
			else
			{
				store.dispatch(peerActions.setPeerRaisedHand(peerId, handRaised, timestamp));
				const { displayName } = store.getState().peers[peerId];

				if (displayName)
				{
					const text = handRaised
						? intl.formatMessage(
							{
								id             : 'room.raisedHand',
								defaultMessage : '{displayName} raised their hand'
							},
							{ displayName }
						)
						: intl.formatMessage(
							{
								id             : 'room.loweredHand',
								defaultMessage : '{displayName} put their hand down'
							},
							{
								displayName
							}
						);

					store.dispatch(
						requestActions.notify({
							text
						})
					);
				}

				this._soundNotification('raisedHand');
			}
		});

		/*
		 * General Producer Events
		 */
		this.room.producers.on('audioDevicesUpdate', ({ devices }) =>
		{
			store.dispatch(meActions.setAudioDevices(devices));
		});
		this.room.producers.on('videoDevicesUpdate', ({ devices }) =>
		{
			store.dispatch(meActions.setWebcamDevices(devices));
		});
		this.room.producers.on('producerAdded', (payload) =>
		{
			store.dispatch(producerActions.addProducer(payload));
		});
		this.room.producers.on('producerRemoved', ({ id }) =>
		{
			store.dispatch(producerActions.removeProducer(id));
		});
		this.room.producers.on('producerPaused', ({ id }) =>
		{
			store.dispatch(producerActions.setProducerPaused(id));
		});
		this.room.producers.on('producerResumed', ({ id }) =>
		{
			store.dispatch(producerActions.setProducerResumed(id));
		});
		this.room.producers.on('producerScore', ({ id, scores }) =>
		{
			store.dispatch(producerActions.setProducerScore(id, scores));
		});

		/*
		 * Microphone Events
		 */
		this.room.producers.on('microphoneDisconnected', () =>
		{
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.microphoneDisconnected',
						defaultMessage : 'Microphone disconnected'
					})
				})
			);
		});
		this.room.producers.on('microphoneMuted', ({ byModerator }) =>
		{
			store.dispatch(settingsActions.setAudioMuted(true));

			if (byModerator)
			{
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'moderator.muteAudio',
							defaultMessage : 'Moderator muted your audio'
						})
					})
				);
			}
		});
		this.room.producers.on('microphoneUnmuted', () =>
		{
			store.dispatch(settingsActions.setAudioMuted(false));
		});
		this.room.producers.on('speaking', () =>
		{
			store.dispatch(meActions.setIsSpeaking(true));
			store.dispatch(meActions.setAutoMuted(false)); // sanity action
		});

		this.room.producers.on('stoppedSpeaking', ({ autoMuted }) =>
		{
			store.dispatch(meActions.setIsSpeaking(false));
			if (autoMuted)
			{
				store.dispatch(meActions.setAutoMuted(true));
			}
		});
		this.room.producers.on('audioInProgress', (state) =>
		{
			store.dispatch(meActions.setAudioInProgress(state));
		});

		/*
		 * Webcam Events
		 */
		this.room.producers.on('webcamDisconnect', () =>
		{
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.cameraDisconnected',
						defaultMessage : 'Camera disconnected'
					})
				})
			);
		});
		this.room.producers.on('webcamStopped', ({ byModerator }) =>
		{
			store.dispatch(settingsActions.setVideoMuted(true));

			if (byModerator)
			{
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'moderator.muteVideo',
							defaultMessage : 'Moderator stopped your video'
						})
					})
				);
			}
		});
		this.room.producers.on('videoInProgress', (state) =>
		{
			store.dispatch(meActions.setWebcamInProgress(state));
		});

		/*
		 * Screenshare Events
		 */
		this.room.producers.on('screenSharingDisconnect', () =>
		{
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.screenSharingDisconnected',
						defaultMessage : 'Screen sharing disconnected'
					})
				})
			);
		});
		this.room.producers.on('screenSharingStopped', ({ byModerator }) =>
		{
			if (byModerator)
			{
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'moderator.stopScreenSharing',
							defaultMessage : 'Moderator stopped your screen sharing'
						})
					})
				);
			}
		});
		this.room.producers.on('screenSharingInProgress', (state) =>
		{
			store.dispatch(meActions.setScreenShareInProgress(state));
		});

		/*
		 * Consumer Events
		 */
		this.room.consumers.on('audioDevicesUpdate', ({ devices }) =>
		{
			store.dispatch(meActions.setAudioOutputDevices(devices));
		});
		this.room.consumers.on('consumerAdded', (payload) =>
		{
			store.dispatch(consumerActions.addConsumer(payload, payload.peerId));
		});
		this.room.consumers.on('consumerPaused', ({ id, originator }) =>
		{
			store.dispatch(consumerActions.setConsumerPaused(id, originator));
		});
		this.room.consumers.on('consumerResumed', ({ id, originator }) =>
		{
			store.dispatch(consumerActions.setConsumerResumed(id, originator));
		});
		this.room.consumers.on('consumerRemoved', ({ id, peerId }) =>
		{
			store.dispatch(consumerActions.removeConsumer(id, peerId));
		});
		this.room.consumers.on('consumerUpdate', (consumer) =>
		{
			if (consumer.preferredSpatialLayer || consumer.preferredTemporalLayer)
			{
				store.dispatch(
					consumerActions.setConsumerPreferredLayers(
						consumer.id,
						consumer.preferredSpatialLayer,
						consumer.preferredTemporalLayer
					)
				);
			}
			if (consumer.currentSpatialLayer || consumer.currentTemporalLayer)
			{
				store.dispatch(
					consumerActions.setConsumerCurrentLayers(
						consumer.id,
						consumer.currentSpatialLayer,
						consumer.currentTemporalLayer
					)
				);
			}
			if (consumer.priority)
			{
				store.dispatch(
					consumerActions.setConsumerPriority(consumer.id, consumer.priority)
				);
			}
			if (consumer.score)
			{
				store.dispatch(
					consumerActions.setConsumerScore(consumer.id, { score: consumer.score })
				);
			}
		});
		this.room.consumers.on('consumerOpusConfigChange', ({ id, opusConfig }) =>
		{
			store.dispatch(consumerActions.setConsumerOpusConfig(id, opusConfig));
		});
		this.room.consumers.on('selectedPeerRemoved', ({ peerId }) =>
		{
			store.dispatch(roomActions.removeSelectedPeer(peerId));
		});

		// Files
		this.room.files.on('error', (error) =>
		{
			logger.error('Filesharing [error:"%o"]', error);
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'filesharing.error',
						defaultMessage : 'There was a filesharing error'
					})
				})
			);
		});
		this.room.files.on('fileAdded', (file) =>
		{
			store.dispatch(fileActions.addFile(file));

			if (file.peerId !== this.room.getMyPeerId())
			{
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'room.newFile',
							defaultMessage : 'New file available'
						})
					})
				);
				if (
					!store.getState().toolarea.toolAreaOpen ||
					(store.getState().toolarea.toolAreaOpen &&
						store.getState().toolarea.currentToolTab !== 'chat')
				)
				{
					// Make sound
					store.dispatch(roomActions.setToolbarsVisible(true));
					this._soundNotification('sendFile');
				}
			}
		});
		this.room.files.on('filesCleared', () =>
		{
			store.dispatch(fileActions.clearFiles());

			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'moderator.clearFiles',
						defaultMessage : 'Moderator cleared the files'
					})
				})
			);
		});
		this.room.files.on('downloadCompleted', (file) =>
		{
			store.dispatch(fileActions.setFileDone(file.magnetUri, file.torrent?.files));
		});
		this.room.files.on('downloadProgress', (file) =>
		{
			store.dispatch(fileActions.setFileProgress(file.magnetUri, file.progress));
		});

	}

	private handleJoined = async () =>
	{
		// Set our media capabilities.
		store.dispatch(
			meActions.setMediaCapabilities({
				canSendMic     : this.room.producers.canProduce('audio'),
				canSendWebcam  : this.room.producers.canProduce('video'),
				canShareScreen : this.room.producers.isScreenShareAvailable(),
				canShareFiles  : this.room.files.isSupported()
			})
		);

		if (this.room.isLocked)
		{
			store.dispatch(roomActions.setRoomLocked());
		}
		else
		{
			store.dispatch(roomActions.setRoomUnLocked());
		}

		if (this.room.accessCode)
		{
			store.dispatch(roomActions.setAccessCode(this.room.accessCode));
		}

		store.dispatch(fileActions.addFileHistory(this.room.files.getFiles()));

		const chatHistory = this.room.getChatHistory().map((m) => ({
			type    : m.type,
			sender  : m.sender,
			text    : m.content,
			time    : m.time,
			name    : m.profileName,
			picture : m.picture
		}));

		store.dispatch(chatActions.addChatHistory(chatHistory));

		if (
			this._autoJoinVideo &&
			this.room.producers.canProduce('video') &&
			this.room.havePermission(PERMISSIONS.SHARE_VIDEO)
		)
		{
			await this.updateWebcam({ init: true, start: true });
		}

		if (
			this._autoJoinAudio &&
			!this._muted &&
			this.room.producers.canProduce('audio') &&
			this.room.havePermission(PERMISSIONS.SHARE_AUDIO)
		)
		{
			await this.updateMic({ start: true });
			const autoMuteThreshold = config.autoMuteThreshold;

			if (autoMuteThreshold >= 0 && this.room.getPeers().length >= autoMuteThreshold)
			{
				this.muteMic();
			}
		}

		const { selectedAudioOutputDevice } = store.getState().settings;

		if (!selectedAudioOutputDevice)
		{
			const defaultOutputDevice = this.room.consumers.getAudioDevice();

			if (defaultOutputDevice)
			{
				store.dispatch(
					settingsActions.setSelectedAudioOutputDevice(defaultOutputDevice.deviceId)
				);
			}
		}
		// Clean all the existing notifications.
		store.dispatch(notificationActions.removeAllNotifications());

		store.dispatch(
			requestActions.notify({
				text : intl.formatMessage({
					id             : 'room.joined',
					defaultMessage : 'You have joined the room'
				})
			})
		);
	}

	private handleRoomUpdate = (room: Partial<EdumeetRoom>) =>
	{
		if (room.state)
		{
			store.dispatch(roomActions.setRoomState(room.state));
		}
		if (typeof room.isLoggedIn !== 'undefined')
		{
			store.dispatch(meActions.loggedIn(room.isLoggedIn));
		}
		if (room.name)
		{
			store.dispatch(roomActions.setRoomName(room.name));
		}
		if (room.isSignInRequired)
		{
			store.dispatch(meActions.loggedIn(false));
			store.dispatch(roomActions.setSignInRequired(true));
		}
		if (room.isOverRoomLimit)
		{
			store.dispatch(roomActions.setOverRoomLimit(true));
		}
		if (room.isLocked)
		{
			store.dispatch(roomActions.setRoomLocked());
			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'room.locked',
						defaultMessage : 'Room is now locked'
					})
				})
			);
		}
		if (room.isLocked === false)
		{
			store.dispatch(roomActions.setRoomUnLocked());
			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'room.unlocked',
						defaultMessage : 'Room is now unlocked'
					})
				})
			);
		}
		if (typeof room.accessCode !== 'undefined')
		{
			store.dispatch(roomActions.setAccessCode(room.accessCode));

			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'room.setAccessCode',
						defaultMessage : 'Access code for room updated'
					})
				})
			);
		}
		if (typeof room.isJoinByAccessCode !== 'undefined')
		{
			store.dispatch(roomActions.setJoinByAccessCode(room.isJoinByAccessCode));

			if (room.isJoinByAccessCode)
			{
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'room.accessCodeOn',
							defaultMessage : 'Access code for room is now activated'
						})
					})
				);
			}
			else
			{
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'room.accessCodeOff',
							defaultMessage : 'Access code for room is now deactivated'
						})
					})
				);
			}
		}
		if (room.isInLobby)
		{
			store.dispatch(roomActions.setInLobby(true));
		}
		if (room.allowWhenRoleMissing)
		{
			store.dispatch(roomActions.setAllowWhenRoleMissing(room.allowWhenRoleMissing));
		}
		if (room.roomPermissions)
		{
			const permissions: any = {};

			for (const key of Object.keys(room.roomPermissions))
			{
				permissions[key] = room.roomPermissions[key].map((roleId) => ({ id: roleId }));
			}
			store.dispatch(roomActions.setRoomPermissions(permissions));
		}
		if (room.roles)
		{
			store.dispatch(roomActions.setUserRoles(room.roles));
		}
	}

	async join({
		roomId,
		joinVideo,
		joinAudio
	}: {
		roomId: string;
		joinVideo: boolean;
		joinAudio: boolean;
	})
	{
		this._autoJoinAudio = joinAudio;
		this._autoJoinVideo = joinVideo;
		this.room.join({
			roomId
		});
	}

	async setMaxSendingSpatialLayer(spatialLayer: number)
	{
		await this.room.producers.setMaxSendingSpatialLayer(spatialLayer);
	}
	async setConsumerPreferredLayersMax(consumer: IEdumeetConsumer)
	{
		await this.room.consumers.setConsumerPreferredLayersMax(consumer.id);
	}
	async adaptConsumerPreferredLayers(
		consumer: IEdumeetConsumer,
		viewportWidth: number,
		viewportHeight: number
	)
	{
		await this.room.consumers.adaptConsumerPreferredLayers(
			consumer.id,
			viewportWidth,
			viewportHeight
		);
	}
	async setConsumerPriority(consumerId: string, priority: number)
	{
		await this.room.consumers.setPriority(consumerId, priority);
	}
	async requestConsumerKeyFrame(consumerId: string)
	{
		await this.room.consumers.requestConsumerKeyFrame(consumerId);
	}

	async modifyPeerConsumer(peerId: string, type: 'mic' | 'webcam' | 'screen', mute: boolean)
	{
		logger.debug('modifyPeerConsumer() [peerId:"%s", type:"%s"]', peerId, type);

		if (type === 'mic')
		{
			store.dispatch(peerActions.setPeerAudioInProgress(peerId, true));
		}
		else if (type === 'webcam')
		{
			store.dispatch(peerActions.setPeerVideoInProgress(peerId, true));
		}
		else if (type === 'screen')
		{
			store.dispatch(peerActions.setPeerScreenInProgress(peerId, true));
		}

		try
		{
			if (mute)
			{
				await this.room.consumers.mutePeerConsumer(peerId, type);
			}
			else
			{
				await this.room.consumers.unmutePeerConsumer(peerId, type);
			}
		}
		catch (error)
		{
			logger.error('modifyPeerConsumer() [error:"%o"]', error);
		}

		if (type === 'mic')
		{
			store.dispatch(peerActions.setPeerAudioInProgress(peerId, false));
		}
		else if (type === 'webcam')
		{
			store.dispatch(peerActions.setPeerVideoInProgress(peerId, false));
		}
		else if (type === 'screen')
		{
			store.dispatch(peerActions.setPeerScreenInProgress(peerId, false));
		}
	}

	async setAudioGain(micConsumer: IEdumeetConsumer, peerId: string, audioGain: number)
	{
		logger.debug(
			'setAudioGain() [micConsumer:"%o", peerId:"%s", type:"%s"]',
			micConsumer,
			peerId,
			audioGain
		);

		if (!micConsumer)
		{
			return;
		}

		micConsumer.audioGain = audioGain;

		try
		{
			for (const consumer of this.room.consumers.consumers)
			{
				if (consumer.peerId === peerId)
				{
					store.dispatch(consumerActions.setConsumerAudioGain(consumer.id, audioGain));
				}
			}
		}
		catch (error)
		{
			logger.error('setAudioGain() [error:"%o"]', error);
		}
	}

	setLocale(locale: string)
	{
		if (locale === null) locale = locales.detect();

		const one = locales.loadOne(locale);

		store.dispatch(
			intlActions.updateIntl({
				locale   : one.locale[0],
				messages : one.messages,
				list     : locales.getList(),
				formats  : undefined
			})
		);

		intl = createIntl({
			locale   : store.getState().intl.locale,
			messages : store.getState().intl.messages
		});

		document.documentElement.lang = store.getState().intl.locale.toUpperCase();
	}

	/**
	 * @deprecated seems placed wrongly in this class
	 */
	login(roomId = this.room.getRoomId())
	{
		const url = `/auth/login?peerId=${this.room.getMe().id}&roomId=${roomId}`;

		window.open(url, 'loginWindow');
	}

	/**
	 * @deprecated seems placed wrongly in this class
	 */
	logout(roomId = this.room.getRoomId())
	{
		window.open(`/auth/logout?peerId=${this.room.getMe().id}&roomId=${roomId}`, 'logoutWindow');
	}

	setLoggedIn(loggedIn: boolean)
	{
		logger.debug('setLoggedIn() | [loggedIn: "%s"]', loggedIn);

		store.dispatch(meActions.loggedIn(loggedIn));
	}

	setPicture(picture: string)
	{
		store.dispatch(settingsActions.setLocalPicture(picture));
		store.dispatch(meActions.setPicture(picture));
		this.room.changeAvatar(picture);
	}
	async changeDisplayName(displayName: string)
	{
		displayName = displayName.trim();

		if (!displayName)
		{
			displayName = `Guest ${Math.floor(Math.random() * (100000 - 10000)) + 10000}`;
		}

		logger.debug('changeDisplayName() [displayName:"%s"]', displayName);

		store.dispatch(meActions.setDisplayNameInProgress(true));

		try
		{
			await this.room.changeDisplayName(displayName);
			store.dispatch(settingsActions.setDisplayName(displayName));
			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage(
						{
							id             : 'room.changedDisplayName',
							defaultMessage : 'Your display name changed to {displayName}'
						},
						{
							displayName
						}
					)
				})
			);
		}
		catch (error)
		{
			logger.error('changeDisplayName() [error:"%o"]', error);
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.changeDisplayNameError',
						defaultMessage : 'An error occurred while changing your display name'
					})
				})
			);
		}
		store.dispatch(meActions.setDisplayNameInProgress(false));
	}

	receiveLoginChildWindow(data: { displayName: string; picture?: string })
	{
		logger.debug('receiveFromChildWindow() | [data:"%o"]', data);

		const { displayName, picture } = data;

		store.dispatch(settingsActions.setDisplayName(displayName));

		if (!store.getState().settings.localPicture)
		{
			store.dispatch(meActions.setPicture(picture));
		}

		store.dispatch(meActions.loggedIn(true));
		store.dispatch(
			requestActions.notify({
				text : intl.formatMessage({
					id             : 'room.loggedIn',
					defaultMessage : 'You are logged in'
				})
			})
		);
	}

	receiveLogoutChildWindow()
	{
		logger.debug('receiveLogoutChildWindow()');

		if (!store.getState().settings.localPicture)
		{
			store.dispatch(meActions.setPicture(null));
		}

		store.dispatch(meActions.loggedIn(false));
		store.dispatch(
			requestActions.notify({
				text : intl.formatMessage({
					id             : 'room.loggedOut',
					defaultMessage : 'You are logged out'
				})
			})
		);
	}

	protected async _soundNotification(type = 'default')
	{
		const { notificationSounds } = store.getState().settings;

		if (!notificationSounds) return;

		const soundAlert = this._soundAlerts[type] || this._soundAlerts.default;

		const now = Date.now();

		if (
			!soundAlert.last !== undefined &&
			now - (soundAlert.last || 0) < (soundAlert.delay || 0)
		)
		{
			return;
		}
		soundAlert.last = now;
		const alertPromise = soundAlert.audio.play();

		if (alertPromise)
		{
			try
			{
				await alertPromise;
			}
			catch (error)
			{
				logger.error('_soundAlert.play() [error:"%o"]', error);
			}
		}
	}

	async getTransportStats()
	{
		try
		{
			const stats = await this.room.transport.getStats();

			if (stats.recv)
			{
				store.dispatch(transportActions.addTransportStats(stats.recv, 'recv'));
			}

			if (stats.send)
			{
				store.dispatch(transportActions.addTransportStats(stats.send, 'send'));
			}
		}
		catch (error)
		{
			logger.error('getTransportStats() [error:"%o"]', error);
		}
	}

	changeMaxSpotlights(maxSpotlights: number)
	{
		this.room.spotlights.maxSpotlights = maxSpotlights;

		store.dispatch(settingsActions.setLastN(maxSpotlights));
	}

	addSelectedPeer(peerId: string)
	{
		logger.debug('addSelectedPeer() [peerId:"%s"]', peerId);

		this.room.spotlights.addPeerToSelectedSpotlights(peerId);

		store.dispatch(roomActions.addSelectedPeer(peerId));
	}
	setSelectedPeer(peerId: string)
	{
		logger.debug('setSelectedPeer() [peerId:"%s"]', peerId);

		this.clearSelectedPeers();
		this.addSelectedPeer(peerId);
	}

	removeSelectedPeer(peerId: string)
	{
		logger.debug('removeSelectedPeer() [peerId:"%s"]', peerId);

		this.room.spotlights.removePeerFromSelectedSpotlights(peerId);

		store.dispatch(roomActions.removeSelectedPeer(peerId));
	}

	clearSelectedPeers()
	{
		logger.debug('clearSelectedPeers()');

		this.room.spotlights.clearPeersFromSelectedSpotlights();

		store.dispatch(roomActions.clearSelectedPeers());
	}

	/*
	 *  Microphone
	 */
	async updateMic({
		newDeviceId,
		start,
		restart
	}: { newDeviceId?: string; start?: boolean; restart?: boolean } = {})
	{
		logger.debug(
			'updateMic() [start:"%s", restart:"%s", newDeviceId:"%s"]',
			start,
			restart,
			newDeviceId
		);

		try
		{
			if (newDeviceId)
			{
				store.dispatch(settingsActions.setSelectedAudioDevice(newDeviceId));
			}

			if (!start && !restart && !this.room.producers.isMicrophoneActive())
			{
				// only update settings
				return;
			}

			const { selectedAudioDevice } = store.getState().settings;
			const deviceId = await this.room.producers.getAvailableAudioDeviceId(
				selectedAudioDevice
			);
			const { autoGainControl, echoCancellation, noiseSuppression, noiseThreshold } =
				store.getState().settings;

			const isActive = this.room.producers.isMicrophoneActive();

			await this.room.producers.updateMicrophoneSettings({
				deviceId,
				autoGainControl,
				echoCancellation,
				noiseSuppression,
				noiseThreshold
			});
			if (!isActive) await this.room.producers.startMicrophone();
			store.dispatch(
				settingsActions.setSelectedAudioDevice(
					this.room.producers.getSelectedAudioDeviceId()
				)
			);
		}
		catch (error)
		{
			logger.error('updateMic() [error:"%o"]', error);
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.microphoneError',
						defaultMessage : 'An error occurred while accessing your microphone'
					})
				})
			);
		}
	}

	async muteMic()
	{
		try
		{
			await this.room.producers.muteMicrophone();
		}
		catch (error)
		{
			logger.error('muteMic() [error:"%o"]', error);

			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.microphoneMuteError',
						defaultMessage : 'Unable to mute your microphone'
					})
				})
			);
		}
	}
	async unmuteMic()
	{
		logger.debug('unmuteMic()');

		if (!this.room.producers.isMicrophoneStarted())
		{
			await this.updateMic();

			return;
		}

		try
		{
			await this.room.producers.unmuteMicrophone();
		}
		catch (error)
		{
			logger.error('unmuteMic() [error:"%o"]', error);

			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.microphoneUnMuteError',
						defaultMessage : 'Unable to unmute your microphone'
					})
				})
			);
		}
	}
	async disableMic()
	{
		logger.debug('disableMic()');
		await this.room.producers.stopMicrophone();
	}
	setNoiseThreshold(threshold: number)
	{
		this.room.producers.updateMicrophoneSettings({
			noiseThreshold : threshold
		});
		store.dispatch(settingsActions.setNoiseThreshold(threshold));
	}

	/**
	 * @deprecated method prefixed with an underscore, but still used outside
	 */
	_setNoiseThreshold(threshold: number)
	{
		this.setNoiseThreshold(threshold);
	}

	/*
	 *  Webcam
	 */
	async updateWebcam({
		start = false,
		restart = false,
		init = false,
		newDeviceId = null,
		newResolution = null,
		newFrameRate = null
	} = {})
	{
		logger.debug(
			'updateWebcam() [start:"%s", restart:"%s", newDeviceId:"%s", newResolution:"%s", newFrameRate:"%s"]',
			start,
			restart,
			newDeviceId,
			newResolution,
			newFrameRate
		);

		try
		{
			if (newDeviceId)
			{
				store.dispatch(settingsActions.setSelectedWebcamDevice(newDeviceId));
			}

			if (newResolution)
			{
				store.dispatch(settingsActions.setVideoResolution(newResolution));
			}

			if (newFrameRate)
			{
				store.dispatch(settingsActions.setVideoFrameRate(newFrameRate));
			}

			if (!start && !restart && !this.room.producers.isWebcamActive())
			{
				// only update settings
				return;
			}

			const { videoMuted } = store.getState().settings;

			if (init && videoMuted)
			{
				return;
			}
			store.dispatch(settingsActions.setVideoMuted(false));

			const deviceId = await this.room.producers.getAvailableVideoDeviceId(
				store.getState().settings.selectedWebcam
			);
			const { resolution, aspectRatio, frameRate } = store.getState().settings;

			await this.room.producers.updateWebcamSettings({
				deviceId,
				resolution,
				aspectRatio,
				frameRate
			});
			if (!this.room.producers.isWebcamActive())
			{
				await this.room.producers.startWebcam();
			}
		}
		catch (error)
		{
			logger.error('updateWebcam() [error:"%o"]', error);

			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.cameraError',
						defaultMessage : 'An error occurred while accessing your camera'
					})
				})
			);
		}
	}

	async disableWebcam()
	{
		logger.debug('disableWebcam()');
		await this.room.producers.stopWebcam();
	}

	async updateRecorderPreferredMimeType({ recorderPreferredMimeType = null } = {})
	{
		logger.debug(
			'updateRecorderPreferredMimeType [mime-type: "%s"]',
			recorderPreferredMimeType
		);
		store.dispatch(
			settingsActions.setRecorderPreferredMimeType(recorderPreferredMimeType)
		);
	}

	/*
	 *  ScreenSharing
	 */
	async updateScreenSharing(
		{ start = false, newResolution = null, newFrameRate = null } = {}
	)
	{
		logger.debug('updateScreenSharing() [start:"%s"]', start);

		try
		{
			if (!this.room.producers.canProduce('video'))
			{
				throw new Error('cannot produce video');
			}

			if (newResolution)
			{
				store.dispatch(settingsActions.setScreenSharingResolution(newResolution));
			}

			if (newFrameRate)
			{
				store.dispatch(settingsActions.setScreenSharingFrameRate(newFrameRate));
			}

			if (!start && !this.room.producers.isScreenShareActive())
			{
				// only update settings
				return;
			}

			const { screenSharingResolution, aspectRatio, screenSharingFrameRate } =
				store.getState().settings;

			await this.room.producers.updateScreenShareSettings({
				resolution : screenSharingResolution,
				aspectRatio,
				frameRate  : screenSharingFrameRate
			});
			if (start) await this.room.producers.startScreenSharing();
		}
		catch (error)
		{
			logger.error('updateScreenSharing() [error:"%o"]', error);

			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'devices.screenSharingError',
						defaultMessage : 'An error occurred while accessing your screen'
					})
				})
			);
		}
	}

	async disableScreenSharing()
	{
		logger.debug('disableScreenSharing()');
		await this.room.producers.stopScreenSharing();
	}

	async addExtraVideo(videoDeviceId: string)
	{
		logger.debug('addExtraVideo() [videoDeviceId:"%s"]', videoDeviceId);

		store.dispatch(roomActions.setExtraVideoOpen(false));

		store.dispatch(meActions.setWebcamInProgress(true));

		try
		{
			const { resolution, aspectRatio, frameRate } = store.getState().settings;

			await this.room.producers.startExtraVideo({
				deviceId : videoDeviceId,
				resolution,
				aspectRatio,
				frameRate
			});
			logger.debug('addExtraVideo() succeeded');
		}
		catch (err)
		{
			if (err.message === 'extraVideo duplicated')
			{
				logger.error('addExtraVideo() duplicate');
				store.dispatch(
					requestActions.notify({
						type : 'error',
						text : intl.formatMessage({
							id             : 'room.extraVideoDuplication',
							defaultMessage : 'Extra videodevice duplication errordefault'
						})
					})
				);
			}
			else
			{
				logger.error('addExtraVideo() [error:"%o"]', err);

				store.dispatch(
					requestActions.notify({
						type : 'error',
						text : intl.formatMessage({
							id             : 'devices.cameraError',
							defaultMessage : 'An error occurred while accessing your camera'
						})
					})
				);
			}
		}
		store.dispatch(meActions.setWebcamInProgress(false));
	}

	async disableExtraVideo(producerId: string)
	{
		logger.debug('disableExtraVideo()');
		store.dispatch(meActions.setWebcamInProgress(true));
		await this.room.producers.stopExtraVideo(producerId);
		store.dispatch(meActions.setWebcamInProgress(false));
	}

	/*
	 * Files
	 */
	async shareFiles(data: { attachment: FileList | File[] })
	{
		store.dispatch(
			requestActions.notify({
				text : intl.formatMessage({
					id             : 'filesharing.startingFileShare',
					defaultMessage : 'Attempting to share file'
				})
			})
		);

		try
		{
			await this.room.files.addFiles(data.attachment);
			store.dispatch(
				requestActions.notify({
					text : intl.formatMessage({
						id             : 'filesharing.successfulFileShare',
						defaultMessage : 'File successfully shared'
					})
				})
			);
		}
		catch (err)
		{
			logger.error('error while sharing file: %o', err);
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'filesharing.unableToShare',
						defaultMessage : 'Unable to share file'
					})
				})
			);
		}
	}

	saveFile(file: WebTorrent.TorrentFile)
	{
		file.getBlob(async (err, blob) =>
		{
			if (err || !blob)
			{
				store.dispatch(
					requestActions.notify({
						type : 'error',
						text : intl.formatMessage({
							id             : 'filesharing.saveFileError',
							defaultMessage : 'Unable to save file'
						})
					})
				);

				return;
			}
			const { saveAs } = await import(

				/* webpackPrefetch: true */
				/* webpackChunkName: "file-saver" */
				'file-saver'
			);

			saveAs(blob, file.name);
		});
	}
	handleDownload(magnetUri: string)
	{
		store.dispatch(fileActions.setFileActive(magnetUri));

		this.room.files.startDownload(magnetUri);
	}

	async sendChatMessage(chatMessage: { text: string })
	{
		logger.debug('sendChatMessage() [chatMessage:"%s"]', chatMessage);

		try
		{
			await this.room.sendChatMessage(chatMessage.text);
		}
		catch (error)
		{
			logger.error('sendChatMessage() [error:"%o"]', error);

			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.chatError',
						defaultMessage : 'Unable to send chat message'
					})
				})
			);
		}
	}
	async setRaisedHand(raisedHand: boolean)
	{
		logger.debug('setRaisedHand: ', raisedHand);

		store.dispatch(meActions.setRaisedHandInProgress(true));
		try
		{
			await this.room.setHandRaised(raisedHand);
		}
		catch (error)
		{
			logger.error('setRaisedHand() [error:"%o"]', error);
		}
		store.dispatch(meActions.setRaisedHandInProgress(false));
	}

	async lockRoom()
	{
		logger.debug('lockRoom()');
		try
		{
			await this.room.setRoomLock(true);
		}
		catch (error)
		{
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.cantLock',
						defaultMessage : 'Unable to lock the room'
					})
				})
			);
			logger.error('lockRoom() [error:"%o"]', error);
		}
	}

	async unlockRoom()
	{
		logger.debug('unlockRoom()');
		try
		{
			await this.room.setRoomLock(false);
		}
		catch (error)
		{
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : intl.formatMessage({
						id             : 'room.cantUnLock',
						defaultMessage : 'Unable to unlock the room'
					})
				})
			);
			logger.error('unlockRoom() [error:"%o"]', error);
		}
	}

	async promoteAllLobbyPeers()
	{
		logger.debug('promoteAllLobbyPeers()');

		store.dispatch(roomActions.setLobbyPeersPromotionInProgress(true));

		try
		{
			await this.room.promoteAllLobbyPeers();
		}
		catch (error)
		{
			logger.error('promoteAllLobbyPeers() [error:"%o"]', error);
		}

		store.dispatch(roomActions.setLobbyPeersPromotionInProgress(false));
	}

	async promoteLobbyPeer(peerId: string)
	{
		logger.debug('promoteLobbyPeer() [peerId:"%s"]', peerId);

		store.dispatch(lobbyPeerActions.setLobbyPeerPromotionInProgress(peerId, true));

		try
		{
			await this.room.promoteLobbyPeer(peerId);
		}
		catch (error)
		{
			logger.error('promoteLobbyPeer() [error:"%o"]', error);
		}

		store.dispatch(lobbyPeerActions.setLobbyPeerPromotionInProgress(peerId, false));
	}

	async clearChat()
	{
		logger.debug('clearChat()');

		store.dispatch(roomActions.setClearChatInProgress(true));

		try
		{
			await this.room.clearChat();
			await this.room.files.clear();
		}
		catch (error)
		{
			logger.error('clearChat() [error:"%o"]', error);
		}

		store.dispatch(roomActions.setClearChatInProgress(false));
	}

	async givePeerRole(peerId: string, roleId: number)
	{
		logger.debug('givePeerRole() [peerId:"%s", roleId:"%s"]', peerId, roleId);

		store.dispatch(peerActions.setPeerModifyRolesInProgress(peerId, true));

		try
		{
			await this.room.givePeerRole(peerId, roleId);
		}
		catch (error)
		{
			logger.error('givePeerRole() [error:"%o"]', error);
		}

		store.dispatch(peerActions.setPeerModifyRolesInProgress(peerId, false));
	}

	async removePeerRole(peerId: string, roleId: number)
	{
		logger.debug('removePeerRole() [peerId:"%s", roleId:"%s"]', peerId, roleId);

		store.dispatch(peerActions.setPeerModifyRolesInProgress(peerId, true));

		try
		{
			await this.room.removePeerRole(peerId, roleId);
		}
		catch (error)
		{
			logger.error('removePeerRole() [error:"%o"]', error);
		}

		store.dispatch(peerActions.setPeerModifyRolesInProgress(peerId, false));
	}

	async kickPeer(peerId: string)
	{
		logger.debug('kickPeer() [peerId:"%s"]', peerId);

		store.dispatch(peerActions.setPeerKickInProgress(peerId, true));

		try
		{
			await this.room.kickPeer(peerId);
		}
		catch (error)
		{
			logger.error('kickPeer() [error:"%o"]', error);
		}

		store.dispatch(peerActions.setPeerKickInProgress(peerId, false));
	}

	async mutePeer(peerId: string)
	{
		logger.debug('mutePeer() [peerId:"%s"]', peerId);

		store.dispatch(peerActions.setMutePeerInProgress(peerId, true));

		try
		{
			await this.room.mutePeer(peerId);
		}
		catch (error)
		{
			logger.error('mutePeer() [error:"%o"]', error);
		}

		store.dispatch(peerActions.setMutePeerInProgress(peerId, false));
	}

	async stopPeerVideo(peerId: string)
	{
		logger.debug('stopPeerVideo() [peerId:"%s"]', peerId);

		store.dispatch(peerActions.setStopPeerVideoInProgress(peerId, true));

		try
		{
			await this.room.stopPeerVideo(peerId);
		}
		catch (error)
		{
			logger.error('stopPeerVideo() [error:"%o"]', error);
		}

		store.dispatch(peerActions.setStopPeerVideoInProgress(peerId, false));
	}

	async stopPeerScreenSharing(peerId: string)
	{
		logger.debug('stopPeerScreenSharing() [peerId:"%s"]', peerId);

		store.dispatch(peerActions.setStopPeerScreenSharingInProgress(peerId, true));

		try
		{
			await this.room.stopPeerScreenSharing(peerId);
		}
		catch (error)
		{
			logger.error('stopPeerScreenSharing() [error:"%o"]', error);
		}

		store.dispatch(peerActions.setStopPeerScreenSharingInProgress(peerId, false));
	}

	async muteAllPeers()
	{
		logger.debug('muteAllPeers()');

		store.dispatch(roomActions.setMuteAllInProgress(true));

		try
		{
			await this.room.muteAllPeers();
		}
		catch (error)
		{
			logger.error('muteAllPeers() [error:"%o"]', error);
		}

		store.dispatch(roomActions.setMuteAllInProgress(false));
	}

	async stopAllPeerVideo()
	{
		logger.debug('stopAllPeerVideo()');

		store.dispatch(roomActions.setStopAllVideoInProgress(true));

		try
		{
			await this.room.stopAllPeerVideo();
		}
		catch (error)
		{
			logger.error('stopAllPeerVideo() [error:"%o"]', error);
		}

		store.dispatch(roomActions.setStopAllVideoInProgress(false));
	}

	async stopAllPeerScreenSharing()
	{
		logger.debug('stopAllPeerScreenSharing()');

		store.dispatch(roomActions.setStopAllScreenSharingInProgress(true));

		try
		{
			await this.room.stopAllPeerScreenSharing();
		}
		catch (error)
		{
			logger.error('stopAllPeerScreenSharing() [error:"%o"]', error);
		}

		store.dispatch(roomActions.setStopAllScreenSharingInProgress(false));
	}

	async closeMeeting()
	{
		logger.debug('closeMeeting()');

		store.dispatch(roomActions.setCloseMeetingInProgress(true));

		try
		{
			await this.room.closeMeeting();
		}
		catch (error)
		{
			logger.error('closeMeeting() [error:"%o"]', error);
		}

		store.dispatch(roomActions.setCloseMeetingInProgress(false));
	}

	async lowerPeerHand(peerId: string)
	{
		logger.debug('lowerPeerHand() [peerId:"%s"]', peerId);

		store.dispatch(peerActions.setPeerRaisedHandInProgress(peerId, true));

		try
		{
			await this.room.lowerPeerHand(peerId);
		}
		catch (error)
		{
			logger.error('lowerPeerHand() [error:"%o"]', error);
		}

		store.dispatch(peerActions.setPeerRaisedHandInProgress(peerId, false));
	}

	async setAccessCode(code: string)
	{
		logger.debug('setAccessCode()');

		try
		{
			await this.room.setAccessCode(code);
			store.dispatch(
				requestActions.notify({
					text : 'Access code saved.'
				})
			);
		}
		catch (error)
		{
			logger.error('setAccessCode() [error:"%o"]', error);
			store.dispatch(
				requestActions.notify({
					type : 'error',
					text : 'Unable to set access code.'
				})
			);
		}
	}
	async changeAudioOutputDevice(deviceId: string)
	{
		logger.debug('changeAudioOutputDevice() [deviceId:"%s"]', deviceId);

		store.dispatch(meActions.setAudioOutputInProgress(true));

		try
		{
			const device = this.room.consumers.getAudioDevice(deviceId);

			if (!device) throw new Error('Selected audio output device no longer available');

			store.dispatch(settingsActions.setSelectedAudioOutputDevice(deviceId));
		}
		catch (error)
		{
			logger.error('changeAudioOutputDevice() [error:"%o"]', error);
		}

		store.dispatch(meActions.setAudioOutputInProgress(false));
	}

	async saveChat()
	{
		const html = window.document.getElementsByTagName('html')[0].cloneNode(true) as Element;

		const chatEl = html.querySelector('#chatList');

		// @ts-ignore
		html.querySelector('body')?.replaceChildren(chatEl);

		const fileName = 'chat.html'

		// remove unused tags
		;[ 'script', 'link' ].forEach((element) =>
		{
			const el = html.getElementsByTagName(element);

			let i = el.length;

			while (i--) el[i].parentNode?.removeChild(el[i]);
		});

		// embed images
		for await (const img of html.querySelectorAll('img'))
		{
			img.src = `${img.src}`;

			await fetch(img.src)
				.then((response) => response.blob())
				.then((data) =>
				{
					const reader = new FileReader();

					reader.readAsDataURL(data);

					reader.onloadend = () =>
					{
						if (!reader.result) return;
						img.src = reader.result.toString();
					};
				});
		}

		const blob = new Blob([ html.innerHTML ], { type: 'text/html;charset=utf-8' });

		saveAs(blob, fileName);
	}

	sortChat(order: 'desc' | 'asc')
	{
		store.dispatch(chatActions.sortChat(order));
	}

	setHideNoVideoParticipants(hideNoVideoParticipants: boolean)
	{
		this.room.spotlights.hideNoVideoParticipants = hideNoVideoParticipants;
	}

	close()
	{
		logger.debug('close()');

		this.room.close();

		store.dispatch(roomActions.setRoomState('closed'));

		// @ts-ignore
		window.location = `/${this.room.getRoomId()}`;
	}
}

'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import browser from 'bowser';
import Logger from '../Logger';

const logger = new Logger('Stats'); // eslint-disable-line no-unused-vars

// TODO: TMP
global.BROWSER = browser;

export default class Stats extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			stats :
			{
				transport : null,
				audio     : null,
				video     : null
			}
		};
	}

	componentWillMount()
	{
		let stats = this.props.stats;

		this._processStats(stats);
	}

	componentWillReceiveProps(nextProps)
	{
		let stats = nextProps.stats;

		this._processStats(stats);
	}

	render()
	{
		let state = this.state;

		return (
			<div data-component='Stats'>
				<div
					className='close'
					onClick={this.handleCloseClick.bind(this)}
				/>
				{
					Object.keys(state.stats).map((blockName) =>
					{
						let block = state.stats[blockName];

						if (!block)
							return;

						let items = Object.keys(block).map((itemName) =>
						{
							let value = block[itemName];

							if (value === undefined)
								return;

							return (
								<div key={itemName} className='item'>
									<div className='key'>{itemName}</div>
									<div className='value'>{value}</div>
								</div>
							);
						});

						if (!items.length)
							return null;

						return (
							<div key={blockName} className='block'>
								<h1>{blockName}</h1>
								{items}
							</div>
						);
					})
				}
			</div>
		);
	}

	handleCloseClick()
	{
		this.props.onClose();
	}

	_processStats(stats)
	{
		if (browser.check({ chrome: '58' }, true))
		{
			this._processStatsChrome58(stats);
		}
		else if (browser.check({ chrome: '40' }, true))
		{
			this._processStatsChromeOld(stats);
		}
		else if (browser.check({ firefox: '40' }, true))
		{
			this._processStatsFirefox(stats);
		}
		else
		{
			logger.warn('_processStats() | unsupported browser [name:"%s", version:%s]',
				browser.name, browser.version);
		}
	}

	_processStatsChrome58(stats)
	{
		let transport = {};
		let audio = {};
		let video = {};
		let selectedCandidatePair = null;
		let localCandidates = {};
		let remoteCandidates = {};

		for (let group of stats.values())
		{
			switch (group.type)
			{
				case 'transport':
				{
					transport['bytes sent'] = group.bytesSent;
					transport['bytes received'] = group.bytesReceived;

					break;
				}

				case 'candidate-pair':
				{
					if (!group.writable)
						break;

					selectedCandidatePair = group;

					transport['available bitrate'] =
						Math.round(group.availableOutgoingBitrate / 1000) + ' kbps';
					transport['current RTT'] =
						Math.round(group.currentRoundTripTime * 1000) + ' ms';

					break;
				}

				case 'local-candidate':
				{
					localCandidates[group.id] = group;

					break;
				}

				case 'remote-candidate':
				{
					remoteCandidates[group.id] = group;

					break;
				}

				case 'codec':
				{
					let mimeType = group.mimeType.split('/');
					let kind = mimeType[0];
					let codec = mimeType[1];
					let block;

					switch (kind)
					{
						case 'audio':
							block = audio;
							break;
						case 'video':
							block = video;
							break;
					}

					if (!block)
						break;

					block['codec'] = codec;
					block['payload type'] = group.payloadType;

					break;
				}

				case 'track':
				{
					if (group.kind !== 'video')
						break;

					video['frame size'] = group.frameWidth + ' x ' + group.frameHeight;
					video['frames sent'] = group.framesSent;

					break;
				}

				case 'outbound-rtp':
				{
					if (group.isRemote)
						break;

					let block;

					switch (group.mediaType)
					{
						case 'audio':
							block = audio;
							break;
						case 'video':
							block = video;
							break;
					}

					if (!block)
						break;

					block['ssrc'] = group.ssrc;
					block['bytes sent'] = group.bytesSent;
					block['packets sent'] = group.packetsSent;

					if (block === video)
						block['frames encoded'] = group.framesEncoded;

					block['NACK count'] = group.nackCount;
					block['PLI count'] = group.pliCount;
					block['FIR count'] = group.firCount;

					break;
				}
			}
		}

		// Post checks.

		if (!video.ssrc)
			video = {};

		if (!audio.ssrc)
			audio = {};

		if (selectedCandidatePair)
		{
			let localCandidate = localCandidates[selectedCandidatePair.localCandidateId];
			let remoteCandidate = remoteCandidates[selectedCandidatePair.remoteCandidateId];

			transport['protocol'] = localCandidate.protocol;
			transport['local IP'] = localCandidate.ip;
			transport['local port'] = localCandidate.port;
			transport['remote IP'] = remoteCandidate.ip;
			transport['remote port'] = remoteCandidate.port;
		}

		// Set state.
		this.setState(
		{
			stats :
			{
				transport,
				audio,
				video
			}
		});
	}

	_processStatsChromeOld(stats)
	{
		let transport = {};
		let audio = {};
		let video = {};

		for (let group of stats.values())
		{
			switch (group.type)
			{
				case 'googCandidatePair':
				{
					if (group.googActiveConnection !== 'true')
						break;

					let localAddress = group.googLocalAddress.split(':');
					let remoteAddress = group.googRemoteAddress.split(':');
					let localIP = localAddress[0];
					let localPort = localAddress[1];
					let remoteIP = remoteAddress[0];
					let remotePort = remoteAddress[1];

					transport['protocol'] = group.googTransportType;
					transport['local IP'] = localIP;
					transport['local port'] = localPort;
					transport['remote IP'] = remoteIP;
					transport['remote port'] = remotePort;
					transport['bytes sent'] = group.bytesSent;
					transport['bytes received'] = group.bytesReceived;
					transport['RTT'] = Math.round(group.googRtt) + ' ms';

					break;
				}

				case 'VideoBwe':
				{
					transport['available bitrate'] =
						Math.round(group.googAvailableSendBandwidth / 1000) + ' kbps';
					transport['transmit bitrate'] =
						Math.round(group.googTransmitBitrate / 1000) + ' kbps';

					break;
				}

				case 'ssrc':
				{
					if (group.packetsSent === undefined)
						break;

					let block;

					switch (group.mediaType)
					{
						case 'audio':
							block = audio;
							break;
						case 'video':
							block = video;
							break;
					}

					if (!block)
						break;

					block['codec'] = group.googCodecName;
					block['ssrc'] = group.ssrc;
					block['bytes sent'] = group.bytesSent;
					block['packets sent'] = group.packetsSent;
					block['packets lost'] = group.packetsLost;

					if (block === video)
					{
						block['frames encoded'] = group.framesEncoded;
						video['frame size'] =
							group.googFrameWidthSent + ' x ' + group.googFrameHeightSent;
						video['frame rate'] = group.googFrameRateSent;
					}

					block['NACK count'] = group.googNacksReceived;
					block['PLI count'] = group.googPlisReceived;
					block['FIR count'] = group.googFirsReceived;

					break;
				}
			}
		}

		// Post checks.

		if (!video.ssrc)
			video = {};

		if (!audio.ssrc)
			audio = {};

		// Set state.
		this.setState(
		{
			stats :
			{
				transport,
				audio,
				video
			}
		});
	}

	_processStatsFirefox(stats)
	{
		let transport = {};
		let audio = {};
		let video = {};
		let selectedCandidatePair = null;
		let localCandidates = {};
		let remoteCandidates = {};

		for (let group of stats.values())
		{
			// TODO: REMOVE
			global.STATS = stats;

			switch (group.type)
			{
				case 'candidate-pair':
				{
					if (!group.selected)
						break;

					selectedCandidatePair = group;

					break;
				}

				case 'local-candidate':
				{
					localCandidates[group.id] = group;

					break;
				}

				case 'remote-candidate':
				{
					remoteCandidates[group.id] = group;

					break;
				}

				case 'outbound-rtp':
				{
					if (group.isRemote)
						break;

					let block;

					switch (group.mediaType)
					{
						case 'audio':
							block = audio;
							break;
						case 'video':
							block = video;
							break;
					}

					if (!block)
						break;

					block['ssrc'] = group.ssrc;
					block['bytes sent'] = group.bytesSent;
					block['packets sent'] = group.packetsSent;

					if (block === video)
					{
						block['bitrate'] =
							Math.round(group.bitrateMean / 1000) + ' kbps';
						block['frames encoded'] = group.framesEncoded;
						video['frame rate'] = Math.round(group.framerateMean);
					}

					block['NACK count'] = group.nackCount;
					block['PLI count'] = group.pliCount;
					block['FIR count'] = group.firCount;

					break;
				}
			}
		}

		// Post checks.

		if (!video.ssrc)
			video = {};

		if (!audio.ssrc)
			audio = {};

		if (selectedCandidatePair)
		{
			let localCandidate = localCandidates[selectedCandidatePair.localCandidateId];
			let remoteCandidate = remoteCandidates[selectedCandidatePair.remoteCandidateId];

			transport['protocol'] = localCandidate.transport;
			transport['local IP'] = localCandidate.ipAddress;
			transport['local port'] = localCandidate.portNumber;
			transport['remote IP'] = remoteCandidate.ipAddress;
			transport['remote port'] = remoteCandidate.portNumber;
		}

		// Set state.
		this.setState(
		{
			stats :
			{
				transport,
				audio,
				video
			}
		});
	}
}

Stats.propTypes =
{
	stats   : PropTypes.object.isRequired,
	onClose : PropTypes.func.isRequired
};

import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import EditableInput from '../Controls/EditableInput';
import Logger from '../../Logger';
import { yellow, orange, red } from '@material-ui/core/colors';
import SignalCellularOffIcon from '@material-ui/icons/SignalCellularOff';
import SignalCellular0BarIcon from '@material-ui/icons/SignalCellular0Bar';
import SignalCellular1BarIcon from '@material-ui/icons/SignalCellular1Bar';
import SignalCellular2BarIcon from '@material-ui/icons/SignalCellular2Bar';
import SignalCellular3BarIcon from '@material-ui/icons/SignalCellular3Bar';

const logger = new Logger('VideoView');

const styles = (theme) =>
	({
		root :
		{
			position      : 'relative',
			flex          : '100 100 auto',
			height        : '100%',
			width         : '100%',
			display       : 'flex',
			flexDirection : 'column',
			overflow      : 'hidden'
		},

		video :
		{
			flex               : '100 100 auto',
			height             : '100%',
			width              : '100%',
			objectFit          : 'cover',
			userSelect         : 'none',
			transitionProperty : 'opacity',
			transitionDuration : '.15s',
			backgroundColor    : 'var(--peer-video-bg-color)',
			'&.isMirrored'     :
			{
				transform : 'scaleX(-1)'
			},
			'&.hidden' :
			{
				opacity            : 0,
				transitionDuration : '0s'
			},
			'&.loading' :
			{
				filter : 'blur(5px)'
			},
			'&.contain' :
			{
				objectFit       : 'contain',
				backgroundColor : 'rgba(0, 0, 0, 1)'
			}
		},
		info :
		{
			width          : '100%',
			height         : '100%',
			padding        : theme.spacing(1),
			position       : 'absolute',
			zIndex         : 10,
			display        : 'flex',
			flexDirection  : 'column',
			justifyContent : 'space-between'
		},
		media :
		{
			display            : 'flex',
			transitionProperty : 'opacity',
			transitionDuration : '.15s'
		},
		box :
		{
			padding      : theme.spacing(0.5),
			borderRadius : 2,
			userSelect   : 'none',
			margin       : 0,
			color        : 'rgba(255, 255, 255, 0.7)',
			fontSize     : '0.8em',

			'&.left' :
				{
					backgroundColor : 'rgba(0, 0, 0, 0.25)',
					display         : 'grid',
					gap             : '1px 5px',

					// eslint-disable-next-line
					gridTemplateAreas : '\
				"AcodL		Acod	Acod	Acod	Acod" \
					"VcodL		Vcod	Vcod	Vcod	Vcod" \
					"ResL		Res		Res		Res		Res" \
					"RecvL		RecvBps RecvBps RecvSum RecvSum" \
					"SendL		SendBps SendBps SendSum SendSum" \
					"IPlocL		IPloc	IPloc	IPloc	IPloc" \
					"IPsrvL		IPsrv	IPsrv	IPsrv	IPsrv" \
					"STLcurrL	STLcurr	STLcurr STLcurr STLcurr" \
					"STLprefL	STLpref STLpref STLpref STLpref"',

					'& .AcodL'    : { gridArea: 'AcodL' },
					'& .Acod'     : { gridArea: 'Acod' },
					'& .VcodL'    : { gridArea: 'VcodL' },
					'& .Vcod'     : { gridArea: 'Vcod' },
					'& .ResL'     : { gridArea: 'ResL' },
					'& .Res'      : { gridArea: 'Res' },
					'& .RecvL'    : { gridArea: 'RecvL' },
					'& .RecvBps'  : { gridArea: 'RecvBps', justifySelf: 'flex-end' },
					'& .RecvSum'  : { gridArea: 'RecvSum', justifySelf: 'flex-end' },
					'& .SendL'    : { gridArea: 'SendL' },
					'& .SendBps'  : { gridArea: 'SendBps', justifySelf: 'flex-end' },
					'& .SendSum'  : { gridArea: 'SendSum', justifySelf: 'flex-end' },
					'& .IPlocL'   : { gridArea: 'IPlocL' },
					'& .IPloc'    : { gridArea: 'IPloc' },
					'& .IPsrvL'   : { gridArea: 'IPsrvL' },
					'& .IPsrv'    : { gridArea: 'IPsrv' },
					'& .STLcurrL' : { gridArea: 'STLcurrL' },
					'& .STLcurr'  : { gridArea: 'STLcurr' },
					'& .STLprefL' : { gridArea: 'STLprefL' },
					'& .STLpref'  : { gridArea: 'STLpref' }

				},
			'&.right' :
			{
				marginLeft : 'auto',
				width      : 30
			},
			'&.hidden' :
			{
				opacity            : 0,
				transitionDuration : '0s'
			}
		},
		peer :
		{
			display : 'flex'
		},
		displayNameEdit :
		{
			fontSize        : 14,
			fontWeight      : 400,
			color           : 'rgba(255, 255, 255, 0.85)',
			border          : 'none',
			borderBottom    : '1px solid #aeff00',
			backgroundColor : 'transparent'
		},
		displayNameStatic :
		{
			userSelect : 'none',
			cursor     : 'text',
			fontSize   : 14,
			fontWeight : 400,
			color      : 'rgba(255, 255, 255, 0.85)',
			'&:hover'  :
			{
				backgroundColor : 'rgb(174, 255, 0, 0.25)'
			}
		}
	});

class VideoView extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			videoWidth  : null,
			videoHeight : null
		};

		// Latest received video track.
		// @type {MediaStreamTrack}
		this._videoTrack = null;

		// Periodic timer for showing video resolution.
		this._videoResolutionTimer = null;
	}

	render()
	{
		const {
			isMe,
			isMirrored,
			isScreen,
			isExtraVideo,
			showQuality,
			displayName,
			showPeerInfo,
			videoContain,
			advancedMode,
			videoVisible,
			videoMultiLayer,
			audioScore,
			videoScore,
			consumerCurrentSpatialLayer,
			consumerCurrentTemporalLayer,
			consumerPreferredSpatialLayer,
			consumerPreferredTemporalLayer,
			audioCodec,
			videoCodec,
			onChangeDisplayName,
			children,
			classes,
			netInfo
		} = this.props;

		const {
			videoWidth,
			videoHeight
		} = this.state;

		let quality = null;

		if (showQuality)
		{
			quality = <SignalCellularOffIcon style={{ color: red[500] }}/>;

			if (videoScore || audioScore)
			{
				const score = videoScore ? videoScore : audioScore;

				switch (isMe ? score.score : score.producerScore)
				{
					case 0:
					case 1:
					{
						quality = <SignalCellular0BarIcon style={{ color: red[500] }}/>;

						break;
					}

					case 2:
					case 3:
					{
						quality = <SignalCellular1BarIcon style={{ color: red[500] }}/>;

						break;
					}

					case 4:
					case 5:
					case 6:
					{
						quality = <SignalCellular2BarIcon style={{ color: orange[500] }}/>;

						break;
					}

					case 7:
					case 8:
					case 9:
					{
						quality = <SignalCellular3BarIcon style={{ color: yellow[500] }}/>;

						break;
					}

					case 10:
					{
						quality = null;

						break;
					}

					default:
					{
						break;
					}
				}
			}
		}

		return (
			<div className={classes.root}>
				<div className={classes.info}>
					<div className={classes.media}>
						<div className={classnames(classes.box, 'left', { hidden: !advancedMode })}>
							{ audioCodec &&
								<React.Fragment>
									<span className={'AcodL'}>Acod: </span>
									<span className={'Acod'}>
										{audioCodec}
									</span>
								</React.Fragment>
							}

							{ videoCodec &&
								<React.Fragment>
									<span className={'VcodL'}>Vcod: </span>
									<span className={'Vcod'}>
										{videoCodec}
									</span>
								</React.Fragment>
							}

							{ (videoVisible && videoWidth !== null) &&
								<React.Fragment>
									<span className={'ResL'}>Res: </span>
									<span className={'Res'}>
										{videoWidth}x{videoHeight}
									</span>
								</React.Fragment>
							}

							{ isMe && !isScreen && !isExtraVideo &&
									(netInfo.recv && netInfo.send && netInfo.send.iceSelectedTuple) &&
									<React.Fragment>
										<span className={'RecvL'}>Recv: </span>
										<span className={'RecvBps'}>
											{(netInfo.recv.sendBitrate/1024/1024).toFixed(2)}Mb/s
										</span>
										<span className={'RecvSum'}>
											{(netInfo.recv.bytesSent/1024/1024).toFixed(2)}MB
										</span>

										<span className={'SendL'}>Send: </span>
										<span className={'SendBps'}>
											{(netInfo.send.recvBitrate/1024/1024).toFixed(2)}Mb/s
										</span>
										<span className={'SendSum'}>
											{(netInfo.send.bytesReceived/1024/1024).toFixed(2)}MB
										</span>

										<span className={'IPlocL'}>IPloc: </span>
										<span className={'IPloc'}>
											{netInfo.send.iceSelectedTuple.remoteIp}
										</span>

										<span className={'IPsrvL'}>IPsrv: </span>
										<span className={'IPsrv'}>
											{netInfo.send.iceSelectedTuple.localIp}
										</span>
									</React.Fragment>
							}

							{ videoMultiLayer &&
								<React.Fragment>
									<span className={'STLcurrL'}>STLcurr: </span>
									<span className={'STLcurr'}>{consumerCurrentSpatialLayer} {consumerCurrentTemporalLayer}</span>

									<span className={'STLprefL'}>STLpref: </span>
									<span className={'STLpref'}>{consumerPreferredSpatialLayer} {consumerPreferredTemporalLayer}</span>
								</React.Fragment>
							}

						</div>
						{ showQuality &&
							<div className={classnames(classes.box, 'right')}>
								{
									quality
								}
							</div>
						}
					</div>

					{ showPeerInfo &&
						<div className={classes.peer}>
							<div className={classes.box}>
								{ isMe ?
									<React.Fragment>
										<EditableInput
											value={displayName}
											propName='newDisplayName'
											className={classes.displayNameEdit}
											classLoading='loading'
											classInvalid='invalid'
											shouldBlockWhileLoading
											editProps={{
												maxLength   : 30,
												autoCorrect : 'off',
												spellCheck  : false
											}}
											onChange={
												({ newDisplayName }) =>
													onChangeDisplayName(newDisplayName)}
										/>
									</React.Fragment>
									:
									<span className={classes.displayNameStatic}>
										{displayName}
									</span>
								}
							</div>
						</div>
					}
				</div>

				<video
					ref='videoElement'
					className={classnames(classes.video, {
						hidden       : !videoVisible,
						'isMirrored' : isMirrored,
						contain      : videoContain
					})}
					autoPlay
					playsInline
					muted
					controls={false}
				/>

				{children}
			</div>
		);
	}

	componentDidMount()
	{
		const { videoTrack } = this.props;

		this._setTracks(videoTrack);
	}

	componentWillUnmount()
	{
		clearInterval(this._videoResolutionTimer);

		const { videoElement } = this.refs;

		if (videoElement)
		{
			videoElement.oncanplay = null;
			videoElement.onplay = null;
			videoElement.onpause = null;
		}
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps !== this.props)
		{
			const { videoTrack } = this.props;

			this._setTracks(videoTrack);
		}
	}

	_setTracks(videoTrack)
	{
		if (this._videoTrack === videoTrack)
			return;

		this._videoTrack = videoTrack;

		clearInterval(this._videoResolutionTimer);
		this._hideVideoResolution();

		const { videoElement } = this.refs;

		if (videoTrack)
		{
			const stream = new MediaStream();

			stream.addTrack(videoTrack);

			videoElement.srcObject = stream;

			videoElement.oncanplay = () => this.setState({ videoCanPlay: true });

			videoElement.play()
				.catch((error) => logger.warn('videoElement.play() [error:"%o]', error));

			this._showVideoResolution();
		}
		else
		{
			videoElement.srcObject = null;
		}
	}

	_showVideoResolution()
	{
		this._videoResolutionTimer = setInterval(() =>
		{
			const { videoWidth, videoHeight } = this.state;
			const { videoElement } = this.refs;

			// Don't re-render if nothing changed.
			if (
				videoElement.videoWidth === videoWidth &&
				videoElement.videoHeight === videoHeight
			)
				return;

			this.setState(
				{
					videoWidth  : videoElement.videoWidth,
					videoHeight : videoElement.videoHeight
				});
		}, 1000);
	}

	_hideVideoResolution()
	{
		this.setState({ videoWidth: null, videoHeight: null });
	}
}

VideoView.propTypes =
{
	isMe                           : PropTypes.bool,
	isMirrored                     : PropTypes.bool,
	isScreen                       : PropTypes.bool,
	isExtraVideo   	               : PropTypes.bool,
	showQuality                    : PropTypes.bool,
	displayName                    : PropTypes.string,
	showPeerInfo                   : PropTypes.bool,
	videoContain                   : PropTypes.bool,
	advancedMode                   : PropTypes.bool,
	videoTrack                     : PropTypes.any,
	videoVisible                   : PropTypes.bool.isRequired,
	consumerSpatialLayers          : PropTypes.number,
	consumerTemporalLayers         : PropTypes.number,
	consumerCurrentSpatialLayer    : PropTypes.number,
	consumerCurrentTemporalLayer   : PropTypes.number,
	consumerPreferredSpatialLayer  : PropTypes.number,
	consumerPreferredTemporalLayer : PropTypes.number,
	videoMultiLayer                : PropTypes.bool,
	audioScore                     : PropTypes.any,
	videoScore                     : PropTypes.any,
	audioCodec                     : PropTypes.string,
	videoCodec                     : PropTypes.string,
	onChangeDisplayName            : PropTypes.func,
	children                       : PropTypes.object,
	classes                        : PropTypes.object.isRequired,
	netInfo                        : PropTypes.object
};

export default withStyles(styles)(VideoView);

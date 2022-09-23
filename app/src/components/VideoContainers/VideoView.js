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
import { AudioAnalyzer } from './AudioAnalyzer';
import { fabric } from 'fabric';

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
			objectFit          : 'contain',
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
			transitionDuration : '.15s',
			alignItems         : 'flex-start'
		},
		canvasForDrawing :
		{
			zIndex          : -1,
			backgroundColor : 'rgba(255, 0, 0, 0)'
		},
		canvasForShowing :
		{
			zIndex          : 9,
			backgroundColor : 'rgba(0, 0, 255, 0)',
			'&.isMirrored'  :
			{
				transform : 'scaleX(-1)'
			}
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
					"VPortL		VPort VPort VPort VPort" \
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
					'& .VPortL'   : { gridArea: 'VPortL' },
					'& .VPort'    : { gridArea: 'VPort' },
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
				display : 'none'
			},
			'&.audioAnalyzer' :
			{
				width           : '30%',
				height          : '30%',
				minWidth        : '180px',
				minHeight       : '120px',
				marginLeft      : theme.spacing(0.5),
				backgroundColor : 'rgba(0, 0, 0, 0.25)'
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
			backgroundColor : 'rgba(0, 0, 0, 0.25)',
			padding         : theme.spacing(0.6)
		},
		displayNameStatic :
		{
			userSelect      : 'none',
			cursor          : 'text',
			fontSize        : 14,
			fontWeight      : 400,
			color           : 'rgba(255, 255, 255, 0.85)',
			backgroundColor : 'rgba(0, 0, 0, 0.25)',
			padding         : theme.spacing(0.6),
			'&:hover'       :
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

		this._canvasForDrawing = null;
		this._canvasForShowing = null;
		this._producerId = null;
		this._peerId = null;

		// Latest received video track.
		// @type {MediaStreamTrack}
		this._videoTrack = null;

		// Latest received audio track.
		// @type {MediaStreamTrack}
		this._audioTrack = null;

		// Periodic timer for showing video resolution.
		this._videoResolutionTimer = null;

		// Audio Analyzer
		this.audioAnalyzerContainer = React.createRef();
	}

	render()
	{
		const {
			isMe,
			isMirrored,
			isScreen,
			isExtraVideo,
			showQuality,
			showAudioAnalyzer,
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
			netInfo,
			width,
			height,
			opusConfig,
			localRecordingState,
			recordingConsents,
			peer,
			producerId,
			pathsToDraw,
			onDrawPathOnVideo,
			isDrawingEnabled
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
						{(audioCodec || videoCodec) &&
						<div className={classnames(classes.box, 'left', { hidden: !advancedMode })}>
							{ audioCodec &&
								<React.Fragment>
									<span className={'AcodL'}>Acod: </span>
									<span className={'Acod'}>
										{audioCodec} {opusConfig}
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

							{ (videoVisible && width && height) &&
								<React.Fragment>
									<span className={'VPortL'}>VPort: </span>
									<span className={'VPort'}>
										{Math.round(width)}x{Math.round(height)}
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
						}

						{showAudioAnalyzer && advancedMode &&
						<div
							className={classnames(classes.box, 'audioAnalyzer')}
							ref={this.audioAnalyzerContainer}
						/>
						}

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
										{
											(
												(
													localRecordingState==='start' ||
													localRecordingState==='resume'
												)&&
												(
													recordingConsents!==undefined &&
													!recordingConsents.includes(peer.id)
												)
											) ? '':displayName
										}
									</span>
								}
							</div>
						</div>
					}
				</div>

				<canvas
					ref='canvasForDrawingRef'
					width={width}
					height={height}
					className={classes.canvasForDrawing}
				/>

				<canvas
					ref='canvasForShowingRef'
					width={width}
					height={height}
					className={classnames(classes.canvasForShowing, {
						'isMirrored' : isMirrored
					})}
				/>

				<video
					ref='videoElement'
					className={classnames(classes.video, {
						hidden : (!videoVisible ||
							(
								!isMe &&
								(
									localRecordingState==='start' ||
									localRecordingState==='resume'
								)&&
								(
									recordingConsents!==undefined &&
									!recordingConsents.includes(peer.id)
								)
							)
						),
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
		const {
			videoTrack,
			audioTrack,
			showAudioAnalyzer,
			width,
			height,
			peer,
			producerId
		} = this.props;

		this._setTracks(videoTrack);

		// Audio analyzer
		if (showAudioAnalyzer && this.props.advancedMode)
		{
			this._setAudioMonitorTrack(audioTrack);
		}
		else if (this.audioAnalyzer)
		{
			this.audioAnalyzer.delete();
			this.audioAnalyzer = null;
		}

		this._producerId = producerId;

		if (peer)
		{
			this._peerId = peer.id;
		}

		if (canvasForShowingRef)
		{
			this._canvasForShowing = new fabric.Canvas(canvasForShowingRef,
				{ width: width, height: height });

			this._drawPaths();
		}

		if (canvasForDrawingRef)
		{
			this._createDrawingCanvas();
		}
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

		if (this.audioAnalyzer)
		{
			this.audioAnalyzer.delete();
			this.audioAnalyzer = null;
		}

		if (this._canvasForShowing)
			this._canvasForShowing.dispose();

		if (this._canvasForDrawing)
			this._canvasForDrawing.dispose();
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps !== this.props)
		{
			const {
				videoTrack,
				audioTrack,
				showAudioAnalyzer,
				width,
				height,
				peer,
				producerId,
				pathsToDraw,
				isDrawingEnabled,
				isMe,
				isMirrored
			} = this.props;

			this._setTracks(videoTrack);

			if (showAudioAnalyzer && this.props.advancedMode)
			{
				this._setAudioMonitorTrack(audioTrack);
			}
			else if (this.audioAnalyzer)
			{
				this.audioAnalyzer.delete();
				this.audioAnalyzer = null;
			}

			let doRecreateCanvases = false;

			if (prevProps.peer.id !== peer.id)
			{
				this._peerId = peer.id;
				doRecreateCanvases = true;
			}

			if (prevProps.producerId !== producerId)
			{
				this._producerId = producerId;
				doRecreateCanvases = true;
			}

			if (prevProps.isMirrored !== isMirrored)
			{
				if (this._canvasForDrawing)
				{
					this._canvasForDrawing.remove(...this._canvasForDrawing.getObjects());
					this._canvasForDrawing.dispose();
					this._canvasForDrawing = null;
				}
				if (this._producerId)
					this._createDrawingCanvas();
			}

			if (prevProps.isDrawingEnabled !== isDrawingEnabled)
			{
				if (this._canvasForDrawing)
				{
					this._canvasForDrawing.remove(...this._canvasForDrawing.getObjects());
					this._canvasForDrawing.dispose();
					this._canvasForDrawing = null;
				}
				if (this._producerId)
					this._createDrawingCanvas();
			}

			if (doRecreateCanvases)
			{
				this._canvasForShowing.remove(...this._canvasForShowing.getObjects());

				if (this._canvasForDrawing)
				{
					this._canvasForDrawing.remove(...this._canvasForDrawing.getObjects());
					this._canvasForDrawing.dispose();
					this._canvasForDrawing = null;
				}
				if (this._producerId)
					this._createDrawingCanvas();
			}

			if (prevProps.width !== width || prevProps.height !== height)
			{
				if (this._canvasForDrawing)
					this._rescaleCanvas(this._canvasForDrawing,
						width, height);

				if (this._canvasForShowing)
					this._rescaleCanvas(this._canvasForShowing,
						width, height);
			}

			this._drawPaths();
		}
	}

	_getBrushWidth(canvasWidth)
	{
		let brushWidth = 4 * canvasWidth / 1920;

		if (brushWidth < 1)
			brushWidth = 1;

		return brushWidth;
	}

	_drawPaths()
	{
		const {
			pathsToDraw
		} = this.props;

		if (this._canvasForShowing && pathsToDraw)
		{
			const newLength = pathsToDraw.length;

			let prevLength = this._canvasForShowing.getObjects().length;

			if (newLength < prevLength)
			{
				this._canvasForShowing.remove(...this._canvasForShowing.getObjects());
				prevLength = 0;
			}

			if (newLength > prevLength)
			{
				const newPaths = pathsToDraw.slice(prevLength);

				newPaths.forEach((pathEntry) =>
				{
					const factor = this._canvasForShowing.width / pathEntry.srcWidth;

					fabric.util.enlivenObjects([ pathEntry.path ], (paths) =>
					{
						paths.forEach((pathObject) =>
						{
							pathObject.scaleX = pathObject.scaleX * factor;
							pathObject.scaleY = pathObject.scaleY * factor;
							pathObject.left = pathObject.left * factor;
							pathObject.top = pathObject.top * factor;
							pathObject.setCoords();
							pathObject.selectable = false;

							this._canvasForShowing.add(pathObject);
						});
					});
				});
			}
		}
	}

	_createDrawingCanvas()
	{
		const {
			width,
			height,
			isDrawingEnabled,
			onDrawPathOnVideo,
			isMirrored
		} = this.props;

		const { canvasForDrawingRef } = this.refs;

		if (canvasForDrawingRef)
		{
			if (isDrawingEnabled)
			{
				canvasForDrawingRef.style.zIndex = '51';
			}
			else
			{
				canvasForDrawingRef.style.zIndex = '-1';
			}

			this._canvasForDrawing = new fabric.Canvas(canvasForDrawingRef,
				{ width: width, height: height });

			this._canvasForDrawing.isDrawingMode = true;
			this._canvasForDrawing.freeDrawingBrush = new fabric.PencilBrush(
				this._canvasForDrawing);
			this._canvasForDrawing.freeDrawingBrush.decimate = 10;
			this._canvasForDrawing.freeDrawingBrush.color = '#00ff00';
			this._canvasForDrawing.freeDrawingBrush.width = this._getBrushWidth(width);

			this._canvasForDrawing.on('path:created', (opt) =>
			{
				if (this._peerId && this._producerId)
				{
					const pathToSend = opt.path.toJSON();

					if (isMirrored)
					{
						pathToSend.left = this._canvasForDrawing.width -
							pathToSend.left - pathToSend.width - pathToSend.strokeWidth;

						for (const pathEntry of pathToSend.path)
						{
							pathEntry[1] = this._canvasForDrawing.width - pathEntry[1];
							if (pathEntry[0] === 'Q')
								pathEntry[3] = this._canvasForDrawing.width - pathEntry[3];
						}
					}

					onDrawPathOnVideo(pathToSend,
						this._canvasForDrawing.width, this._peerId, this._producerId);

					setTimeout(() =>
					{
						if (this._canvasForDrawing)
						{
							this._canvasForDrawing.remove(opt.path);
						}
					}, 1000);
				}
				else
				{
					this._canvasForDrawing.remove(opt.path);
				}
			});
		}
	}

	_rescaleCanvas(canvas, width, height)
	{
		const prevWidth = canvas.getWidth();

		canvas.setDimensions({ width: width, height: height });

		if (prevWidth && prevWidth > 0 && !isNaN(width / prevWidth))
		{
			const factor = width / prevWidth;

			canvas.getObjects().forEach((canvasObject) =>
			{
				canvasObject.scaleX = canvasObject.scaleX * factor;
				canvasObject.scaleY = canvasObject.scaleY * factor;
				canvasObject.left = canvasObject.left * factor;
				canvasObject.top = canvasObject.top * factor;
				canvasObject.setCoords();
			});
			canvas.renderAll();
			canvas.calcOffset();
		}

		if (canvas.isDrawingMode && canvas.freeDrawingBrush)
		{
			canvas.freeDrawingBrush.width = this._getBrushWidth(width);
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

	_setAudioMonitorTrack(track)
	{
		if (!this.audioAnalyzer)
		{
			logger.debug('_setAudioMonitorTrack creating audioAnalyzer with dom:', this.audioAnalyzerContainer.current);
			this.audioAnalyzer = new AudioAnalyzer(this.audioAnalyzerContainer.current);
		}

		if (track)
		{
			this.audioAnalyzer.addTrack(track);
		}
		else
		{
			// disconnects all the tracks
			this.audioAnalyzer.removeTracks();
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

	handleMenuClick(event)
	{
		logger.debug('handleMenuClick', event.currentTarget);

		this.menuAnchorElement = event.currentTarget;
	}

	handleMenuClose(event)
	{
		logger.debug('handleMenuClose', event.currentTarget);

		this.menuAnchorElement = null;
	}
}

VideoView.propTypes =
{
	isMe                           : PropTypes.bool,
	isMirrored                     : PropTypes.bool,
	isScreen                       : PropTypes.bool,
	isExtraVideo   	               : PropTypes.bool,
	showQuality                    : PropTypes.bool,
	showAudioAnalyzer              : PropTypes.bool,
	displayName                    : PropTypes.string,
	showPeerInfo                   : PropTypes.bool,
	videoContain                   : PropTypes.bool,
	advancedMode                   : PropTypes.bool,
	videoTrack                     : PropTypes.any,
	videoVisible                   : PropTypes.bool.isRequired,
	audioTrack                     : PropTypes.any,
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
	netInfo                        : PropTypes.object,
	width                          : PropTypes.number,
	height                         : PropTypes.number,
	opusConfig                     : PropTypes.string,
	localRecordingState            : PropTypes.string,
	recordingConsents              : PropTypes.array,
	peer                           : PropTypes.object,
	producerId                     : PropTypes.string,
	pathsToDraw                    : PropTypes.arrayOf(PropTypes.object),
	onDrawPathOnVideo              : PropTypes.func,
	isDrawingEnabled               : PropTypes.bool

};

export default withStyles(styles)(VideoView);

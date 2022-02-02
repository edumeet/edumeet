import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from '../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import * as settingsActions from '../../store/actions/settingsActions';
import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import classnames from 'classnames';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Select from '@material-ui/core/Select';
import Slider from '@material-ui/core/Slider';
import Typography from '@material-ui/core/Typography';
import Collapse from '@material-ui/core/Collapse';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
// import ListItemIcon from '@material-ui/core/ListItemIcon';
// import Divider from '@material-ui/core/Divider';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import Mic from '@material-ui/icons/Mic';
import Videocam from '@material-ui/icons/Videocam';
import Switch from '@material-ui/core/Switch';
import ImageUploader from 'react-images-upload';
import Resizer from 'react-image-file-resizer';
import { config } from '../../config';

const insertableStreamsSupported = Boolean(RTCRtpSender.prototype.createEncodedStreams);

const NoiseSlider = withStyles(
	{
		root :
		{
			color   : '#3880ff',
			height  : 2,
			padding : '15px 0'
		},
		track : {
			height : 2
		},
		rail : {
			height  : 2,
			opacity : 0.2
		},
		mark : {
			backgroundColor : '#bfbfbf',
			height          : 10,
			width           : 3,
			marginTop       : -3
		},
		markActive : {
			opacity         : 1,
			backgroundColor : 'currentColor'
		}
	})(Slider);

const styles = (theme) => ({
	setting :
	{
		padding : theme.spacing(2)
	},
	margin :
	{
		height : theme.spacing(3)
	},
	root : {
		width           : '100%',
		backgroundColor : theme.palette.background.paper
	},
	switchLabel : {
		justifyContent : 'space-between',
		flex           : 'auto',
		display        : 'flex',
		padding        : theme.spacing(1),
		paddingLeft    : 0,
		marginLeft     : 0
	},
	nested : {
		display       : 'block',
		paddingTop    : 0,
		paddingBottom : 0,
		paddingLeft   : '25px',
		paddingRight  : '25px'
	},
	formControl :
	{
		display : 'flex'
	},
	tabsHeader :
	{
		minHeight : '72px'
	}
});

const tabs =
[
	'videoSettings',
	'audioSettings'
];

const MediaSettings = ({
	setAudioPreset,
	setEchoCancellation,
	setAutoGainControl,
	setNoiseSuppression,
	setVoiceActivatedUnmute,
	setSampleRate,
	setChannelCount,
	setSampleSize,
	setOpusDtx,
	setOpusFec,
	setOpusPtime,
	setEnableOpusDetails,
	roomClient,
	me,
	volume,
	settings,
	classes
}) =>
{
	const intl = useIntl();

	const [ audioSettingsOpen, setAudioSettingsOpen ] = React.useState(false);
	const [ videoSettingsOpen, setVideoSettingsOpen ] = React.useState(false);
	const [ currentSettingsTab, setSettingsTab ] = React.useState('videoSettings');

	const onDrop = (picture) =>
	{
		if (picture.length > 0)
		{
			Resizer.imageFileResizer(picture[0], 1280, 720, 'JPEG', 99, 0,
				(uri) =>
				{
					const reader = new FileReader();

					reader.addEventListener('load', () =>
					{
						roomClient.setPicture(reader.result);
					});

					reader.readAsDataURL(uri);
				},
				'blob');
		}
		else
		{
			roomClient.setPicture(null);
		}
	};

	const resolutions = [ {
		value : 'low',
		label : intl.formatMessage({
			id             : 'label.low',
			defaultMessage : 'Low'
		})
	},
	{
		value : 'medium',
		label : intl.formatMessage({
			id             : 'label.medium',
			defaultMessage : 'Medium'
		})
	},
	{
		value : 'high',
		label : intl.formatMessage({
			id             : 'label.high',
			defaultMessage : 'High (HD)'
		})
	},
	{
		value : 'veryhigh',
		label : intl.formatMessage({
			id             : 'label.veryHigh',
			defaultMessage : 'Very high (FHD)'
		})
	},
	{
		value : 'ultra',
		label : intl.formatMessage({
			id             : 'label.ultra',
			defaultMessage : 'Ultra (UHD)'
		})
	} ];

	let webcams;

	if (me.webcamDevices)
		webcams = Object.values(me.webcamDevices);
	else
		webcams = [];

	let audioDevices;

	if (me.audioDevices)
		audioDevices = Object.values(me.audioDevices);
	else
		audioDevices = [];

	let audioOutputDevices;

	if (me.audioOutputDevices)
		audioOutputDevices = Object.values(me.audioOutputDevices);
	else
		audioOutputDevices = [];

	return (
		<React.Fragment>

			<ImageUploader
				withIcon
				onChange={onDrop}
				imgExtension={[ '.jpg', '.jpeg', '.png' ]}
				maxFileSize={5242880}
				singleImage
				withPreview
				defaultImages={settings.localPicture?[ settings.localPicture ]:[]}
				buttonType='button'
				buttonText={intl.formatMessage({
					id             : 'settings.myPhotoButton',
					defaultMessage : 'Set my photo'
				})}
				label={intl.formatMessage({
					id             : 'settings.myPhotoLabel',
					defaultMessage : 'Max. file size: 5MB, accepted: jpg, jpeg, png'
				})}
				fileSizeError={intl.formatMessage({
					id             : 'settings.myPhotoSizeError',
					defaultMessage : ' file is too large'
				})}
				fileTypeError={intl.formatMessage({
					id             : 'settings.myPhotoTypeError',
					defaultMessage : ' is not a supported file extension'
				})}
			/>

			<Tabs
				className={classes.tabsHeader}
				value={tabs.indexOf(currentSettingsTab)}
				onChange={(event, value) => setSettingsTab(tabs[value])}
				indicatorColor='primary'
				textColor='primary'
				variant='fullWidth'
			>
				<Tab
					label={
						intl.formatMessage({
							id             : 'label.videoSettings',
							defaultMessage : 'Video settings'
						})
					}
					icon={<Videocam />}
				/>
				<Tab
					label={intl.formatMessage({
						id             : 'label.audioSettings',
						defaultMessage : 'Audio settings'
					})}
					icon={<Mic />}
				/>
			</Tabs>

			{currentSettingsTab === 'videoSettings' && <form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={(webcams.find((w) => w.deviceId === settings.selectedWebcam) && settings.selectedWebcam) || ''}
						onChange={(event) =>
						{
							if (event.target.value)
							{
								roomClient.updateWebcam({
									restart     : true,
									newDeviceId : event.target.value
								});
							}
						}}
						displayEmpty
						name={intl.formatMessage({
							id             : 'settings.camera',
							defaultMessage : 'Camera'
						})}
						autoWidth
						className={classes.selectEmpty}
						disabled={webcams.length === 0 || me.webcamInProgress}
					>
						{ webcams.map((webcam, index) =>
						{
							return (
								<MenuItem key={index} value={webcam.deviceId}>{webcam.label}</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						{ webcams.length > 0 ?
							intl.formatMessage({
								id             : 'settings.selectCamera',
								defaultMessage : 'Select video device'
							})
							:
							intl.formatMessage({
								id             : 'settings.cantSelectCamera',
								defaultMessage : 'Unable to select video device'
							})
						}
					</FormHelperText>
				</FormControl>
				<List className={classes.root} component='nav'>
					<ListItem button onClick={() => setVideoSettingsOpen(!videoSettingsOpen)}>
						<ListItemText primary={intl.formatMessage({
							id             : 'settings.showAdvancedVideo',
							defaultMessage : 'Advanced video settings'
						})}
						/>
						{videoSettingsOpen ? <ExpandLess /> : <ExpandMore />}
					</ListItem>
					<Collapse in={videoSettingsOpen} timeout='auto'>
						<FormControl className={classes.formControl}>
							<Select
								value={settings.resolution || ''}
								onChange={(event) =>
								{
									if (event.target.value)
										roomClient.updateWebcam({
											restart       : true,
											newResolution : event.target.value
										});
								}}
								name='Video resolution'
								autoWidth
								className={classes.selectEmpty}
							>
								{resolutions.map((resolution, index) =>
								{
									return (
										<MenuItem key={index} value={resolution.value}>
											{resolution.label}
										</MenuItem>
									);
								})}
							</Select>
							<FormHelperText>
								<FormattedMessage
									id='settings.resolution'
									defaultMessage='Select your video resolution'
								/>
							</FormHelperText>
						</FormControl>
						<FormControl className={classes.formControl}>
							<Select
								value={settings.frameRate}
								onChange={(event) =>
								{
									if (event.target.value)
										roomClient.updateWebcam({
											restart      : true,
											newFrameRate : event.target.value
										});
								}}
								name='Frame rate'
								autoWidth
								className={classes.selectEmpty}
							>
								{ [ 1, 5, 10, 15, 20, 25, 30, 60 ].map((frameRate) =>
								{
									return (
										<MenuItem key={frameRate} value={frameRate}>
											{frameRate}
										</MenuItem>
									);
								})}
							</Select>
							<FormHelperText>
								<FormattedMessage
									id='settings.webcamFrameRate'
									defaultMessage='Select your webcam frame rate'
								/>
							</FormHelperText>
						</FormControl>
						<FormControl className={classes.formControl}>
							<Select
								value={settings.screenSharingFrameRate || ''}
								onChange={(event) =>
								{
									if (event.target.value)
										roomClient.updateScreenSharing({ newFrameRate: event.target.value });
								}}
								name='Frame rate'
								autoWidth
								className={classes.selectEmpty}
							>
								{ [ 1, 5, 10, 15, 20, 25, 30 ].map((screenSharingFrameRate) =>
								{
									return (
										<MenuItem key={screenSharingFrameRate} value={screenSharingFrameRate}>
											{screenSharingFrameRate}
										</MenuItem>
									);
								})}
							</Select>
							<FormHelperText>
								<FormattedMessage
									id='settings.screenSharingFrameRate'
									defaultMessage='Select your screen sharing frame rate'
								/>
							</FormHelperText>
						</FormControl>
						<FormControl className={classes.formControl}>
							<Select
								value={settings.recorderPreferredMimeType || ''}
								onChange={(event) =>
								{
									if (event.target.value)
										roomClient.updateRecorderPreferredMimeType(
											{ recorderPreferredMimeType: event.target.value }
										);

								}}
								name='Video recordings preferred mime type'
								autoWidth
								className={classes.selectEmpty}
							>
								{settings.recorderSupportedMimeTypes.map((mimetype, index) =>
								{
									return (
										<MenuItem key={index} value={mimetype}>
											{mimetype}
										</MenuItem>
									);
								})}
							</Select>
							<FormHelperText>
								<FormattedMessage
									id='settings.recordingsPreferredMimeType'
									defaultMessage='Select your preferred video mime type'
								/>
							</FormHelperText>
						</FormControl>
					</Collapse>
				</List>
			</form>}

			{currentSettingsTab === 'audioSettings' && <form className={classes.setting} autoComplete='off'>
				<FormControl className={classes.formControl}>
					<Select
						value={settings.selectedAudioDevice || ''}
						onChange={(event) =>
						{
							if (event.target.value)
								roomClient.updateMic({ restart: true, newDeviceId: event.target.value });
						}}
						displayEmpty
						name={intl.formatMessage({
							id             : 'settings.audio',
							defaultMessage : 'Audio input device'
						})}
						autoWidth
						className={classes.selectEmpty}
						disabled={audioDevices.length === 0 || me.audioInProgress}
					>
						{ audioDevices.map((audio, index) =>
						{
							return (
								<MenuItem key={index} value={audio.deviceId}>{audio.label==='' ? index+1 : audio.label }</MenuItem>
							);
						})}
					</Select>
					<FormHelperText>
						{ audioDevices.length > 0 ?
							intl.formatMessage({
								id             : 'settings.selectAudio',
								defaultMessage : 'Select audio input device'
							})
							:
							intl.formatMessage({
								id             : 'settings.cantSelectAudio',
								defaultMessage : 'Unable to select audio input device'
							})
						}
					</FormHelperText>
				</FormControl>
				{ config.audioOutputSupportedBrowsers.includes(me.browser.name) &&
					<FormControl className={classes.formControl}>
						<Select
							value={settings.selectedAudioOutputDevice || ''}
							onChange={(event) =>
							{
								if (event.target.value)
									roomClient.changeAudioOutputDevice(event.target.value);
							}}
							displayEmpty
							name={intl.formatMessage({
								id             : 'settings.audioOutput',
								defaultMessage : 'Audio output device'
							})}
							autoWidth
							className={classes.selectEmpty}
							disabled={audioOutputDevices.length === 0 || me.audioOutputInProgress}
						>
							{ audioOutputDevices.map((audioOutput, index) =>
							{
								return (
									<MenuItem
										key={index}
										value={audioOutput.deviceId}
									>
										{audioOutput.label}
									</MenuItem>
								);
							})}
						</Select>
						<FormHelperText>
							{ audioOutputDevices.length > 0 ?
								intl.formatMessage({
									id             : 'settings.selectAudioOutput',
									defaultMessage : 'Select audio output device'
								})
								:
								intl.formatMessage({
									id             : 'settings.cantSelectAudioOutput',
									defaultMessage : 'Unable to select audio output device'
								})
							}
						</FormHelperText>
					</FormControl>
				}

				{settings.audioPresets && <FormControl className={classes.formControl}>
					<Select
						value={settings.audioPreset}
						onChange={(event) =>
						{
							const audioPreset = event.target.value;

							if (audioPreset)
							{
								setAudioPreset(audioPreset);

								if (settings.audioPresets
									&& settings.audioPresets[audioPreset])
								{
									const {
										autoGainControl,
										echoCancellation,
										noiseSuppression,
										voiceActivatedUnmute,
										noiseThreshold,
										sampleRate,
										channelCount,
										sampleSize,
										opusDtx,
										opusFec,
										opusPtime,
										opusMaxPlaybackRate
									} = settings.audioPresets[audioPreset];

									setAutoGainControl(autoGainControl);
									setEchoCancellation(echoCancellation);
									setNoiseSuppression(noiseSuppression);
									setVoiceActivatedUnmute(voiceActivatedUnmute);
									roomClient._setNoiseThreshold(noiseThreshold);
									setSampleRate(sampleRate);
									setChannelCount(channelCount);
									setSampleSize(sampleSize);
									setOpusDtx(opusDtx);
									setOpusFec(opusFec);
									setOpusPtime(opusPtime);
									settingsActions.setOpusMaxPlaybackRate(opusMaxPlaybackRate);
								}

								roomClient.updateMic();
							}
						}}
						name='Audio preset'
						autoWidth
						className={classes.selectEmpty}
					>
						{
							Object.keys(settings.audioPresets).map((value) =>
							{
								return (
									<MenuItem key={value} value={value}>
										{settings.audioPresets[value].name}
									</MenuItem>
								);
							})
						}
					</Select>
					<FormHelperText>
						<FormattedMessage
							id='settings.audioPreset'
							defaultMessage='Select the audio preset'
						/>
					</FormHelperText>
				</FormControl>}

				<List className={classes.root} component='nav'>
					<ListItem button onClick={() => setAudioSettingsOpen(!audioSettingsOpen)}>
						<ListItemText primary={intl.formatMessage({
							id             : 'settings.showAdvancedAudio',
							defaultMessage : 'Advanced audio settings'
						})}
						/>
						{audioSettingsOpen ? <ExpandLess /> : <ExpandMore />}
					</ListItem>
					<Collapse in={audioSettingsOpen} timeout='auto'>
						<List component='div'>
							<ListItem className={classes.nested}>
								<FormControlLabel
									className={classnames(classes.setting, classes.switchLabel)}
									control={
										<Switch color='secondary'
											checked={settings.echoCancellation}
											onChange={
												(event) =>
												{
													setEchoCancellation(event.target.checked);
													roomClient.updateMic();
												}}
										/>}
									labelPlacement='start'
									label={intl.formatMessage({
										id             : 'settings.echoCancellation',
										defaultMessage : 'Echo cancellation'
									})}
								/>
							</ListItem>
							<ListItem className={classes.nested}>
								<FormControlLabel
									className={classnames(classes.setting, classes.switchLabel)}
									control={
										<Switch color='secondary'
											checked={settings.autoGainControl} onChange={
												(event) =>
												{
													setAutoGainControl(event.target.checked);
													roomClient.updateMic();
												}}
										/>}
									labelPlacement='start'
									label={intl.formatMessage({
										id             : 'settings.autoGainControl',
										defaultMessage : 'Auto gain control'
									})}
								/>
							</ListItem>
							<ListItem className={classes.nested}>
								<FormControlLabel
									className={classnames(classes.setting, classes.switchLabel)}
									control={
										<Switch color='secondary'
											checked={settings.noiseSuppression} onChange={
												(event) =>
												{
													setNoiseSuppression(event.target.checked);
													roomClient.updateMic();
												}}
										/>}
									labelPlacement='start'
									label={intl.formatMessage({
										id             : 'settings.noiseSuppression',
										defaultMessage : 'Noise suppression'
									})}
								/>
							</ListItem>
							<ListItem className={classes.nested}>
								<FormControlLabel
									className={classnames(classes.setting, classes.switchLabel)}
									control={
										<Switch color='secondary'
											checked={settings.voiceActivatedUnmute} onChange={
												(event) =>
												{
													setVoiceActivatedUnmute(event.target.checked);
												}}
										/>}
									labelPlacement='start'
									label={intl.formatMessage({
										id             : 'settings.voiceActivatedUnmute',
										defaultMessage : 'Voice activated unmute'
									})}
								/>
							</ListItem>
							<ListItem className={classes.nested}>
								<div className={classes.margin} />
								<Typography gutterBottom>
									{
										intl.formatMessage({
											id             : 'settings.noiseThreshold',
											defaultMessage : 'Noise threshold'
										})
									}:
								</Typography>
								<NoiseSlider className={classnames(classes.slider, classnames.setting)}
									key={'noise-threshold-slider'}
									min={-100}
									value={settings.noiseThreshold}
									max={0}
									valueLabelDisplay={'auto'}
									onChange={
										(event, value) =>
										{
											roomClient._setNoiseThreshold(value);
										}}
									marks={[ { value: volume, label: `${volume.toFixed(0)} dB` } ]}
								/>
							</ListItem>

							{/* advanced options */}

							<ListItem className={classes.nested}>
								<FormControl className={classes.formControl}>
									<Select
										value={settings.sampleRate || ''}
										onChange={(event) =>
										{
											if (event.target.value)
											{
												setSampleRate(event.target.value);
												roomClient.updateMic();
											}
										}}
										name='Sample rate'
										autoWidth
										className={classes.selectEmpty}
									>
										{ [ 8000, 16000, 24000, 44100, 48000 ].map((sampleRate) =>
										{
											return (
												<MenuItem key={sampleRate} value={sampleRate}>
													{sampleRate / 1000} kHz
												</MenuItem>
											);
										})}
									</Select>
									<FormHelperText>
										<FormattedMessage
											id='settings.sampleRate'
											defaultMessage='Select the audio sample rate'
										/>
									</FormHelperText>
								</FormControl>
							</ListItem>

							<ListItem className={classes.nested}>
								<FormControl className={classes.formControl}>
									<Select
										value={settings.channelCount || ''}
										onChange={(event) =>
										{
											if (event.target.value)
											{
												setChannelCount(event.target.value);
												roomClient.updateMic();
											}
										}}
										name='Channel count'
										autoWidth
										className={classes.selectEmpty}
									>
										{ [ 1, 2 ].map((channelCount) =>
										{
											return (
												<MenuItem key={channelCount} value={channelCount}>
													{channelCount} ({channelCount === 1 ? 'mono' : 'stereo'})
												</MenuItem>
											);
										})}
									</Select>
									<FormHelperText>
										<FormattedMessage
											id='settings.channelCount'
											defaultMessage='Select the audio channel count'
										/>
									</FormHelperText>
								</FormControl>
							</ListItem>

							<ListItem className={classes.nested}>
								<FormControl className={classes.formControl}>
									<Select
										value={settings.sampleSize || ''}
										onChange={(event) =>
										{
											if (event.target.value)
											{
												setSampleSize(event.target.value);
												roomClient.updateMic();
											}
										}}
										name='Sample size'
										autoWidth
										className={classes.selectEmpty}
									>
										{ [ 8, 16, 24, 32 ].map((sampleSize) =>
										{
											return (
												<MenuItem key={sampleSize} value={sampleSize}>
													{sampleSize} bit
												</MenuItem>
											);
										})}
									</Select>
									<FormHelperText>
										<FormattedMessage
											id='settings.sampleSize'
											defaultMessage='Select the audio sample size'
										/>
									</FormHelperText>
								</FormControl>
							</ListItem>

							<ListItem className={classes.nested}>
								<FormControlLabel
									className={classnames(classes.setting, classes.switchLabel)}
									control={
										<Switch color='secondary'
											checked={settings.opusDtx} onChange={
												(event) =>
												{
													setOpusDtx(Boolean(event.target.checked));
													roomClient.updateMic();
												}}
										/>}
									labelPlacement='start'
									label={intl.formatMessage({
										id             : 'settings.opusDtx',
										defaultMessage : 'Enable Opus Discontinuous Transmission (DTX)'
									})}
								/>
							</ListItem>

							<ListItem className={classes.nested}>
								<FormControlLabel
									className={classnames(classes.setting, classes.switchLabel)}
									control={
										<Switch color='secondary'
											checked={settings.opusFec} onChange={
												(event) =>
												{
													setOpusFec(event.target.checked);
													roomClient.updateMic();
												}}
										/>}
									labelPlacement='start'
									label={intl.formatMessage({
										id             : 'settings.opusFec',
										defaultMessage : 'Enable Opus Forward Error Correction (FEC)'
									})}
								/>
							</ListItem>

							<ListItem className={classes.nested}>
								<FormControl className={classes.formControl}>
									<Select
										value={settings.opusPtime || ''}
										onChange={(event) =>
										{
											if (event.target.value)
											{
												setOpusPtime(event.target.value);
												roomClient.updateMic();
											}
										}}
										name='Opus frame size'
										autoWidth
										className={classes.selectEmpty}
									>
										{ [ 3, 5, 10, 20, 30, 40, 50, 60 ].map((opusPtime) =>
										{
											return (
												<MenuItem key={opusPtime} value={opusPtime}>
													{opusPtime} ms
												</MenuItem>
											);
										})}
									</Select>
									<FormHelperText>
										<FormattedMessage
											id='settings.opusPtime'
											defaultMessage='Select the Opus frame size'
										/>
									</FormHelperText>
								</FormControl>
							</ListItem>

							{insertableStreamsSupported && <ListItem className={classes.nested}>
								<FormControlLabel
									className={classnames(classes.setting, classes.switchLabel)}
									control={
										<Switch color='secondary'
											checked={settings.enableOpusDetails} onChange={
												(event) =>
												{
													setEnableOpusDetails(event.target.checked);
												}}
										/>}
									labelPlacement='start'
									label={intl.formatMessage({
										id             : 'settings.enableOpusDetails',
										defaultMessage : 'Enable OPUS details (page reload required)'
									})}
								/>
							</ListItem>}

						</List>
					</Collapse>
				</List>
			</form>}

		</React.Fragment>
	);
};

MediaSettings.propTypes =
{
	roomClient              : PropTypes.any.isRequired,
	setAudioPreset          : PropTypes.func.isRequired,
	setEchoCancellation     : PropTypes.func.isRequired,
	setAutoGainControl      : PropTypes.func.isRequired,
	setNoiseSuppression     : PropTypes.func.isRequired,
	setVoiceActivatedUnmute : PropTypes.func.isRequired,
	setSampleRate           : PropTypes.func.isRequired,
	setChannelCount         : PropTypes.func.isRequired,
	setSampleSize           : PropTypes.func.isRequired,
	setOpusDtx              : PropTypes.func.isRequired,
	setOpusFec              : PropTypes.func.isRequired,
	setOpusPtime            : PropTypes.func.isRequired,
	setEnableOpusDetails    : PropTypes.func.isRequired,
	me                      : appPropTypes.Me.isRequired,
	volume                  : PropTypes.number,
	settings                : PropTypes.object.isRequired,
	classes                 : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		me       : state.me,
		volume   : state.peerVolumes[state.me.id],
		settings : state.settings
	};
};

const mapDispatchToProps = {
	setAudioPreset          : settingsActions.setAudioPreset,
	setEchoCancellation     : settingsActions.setEchoCancellation,
	setAutoGainControl      : settingsActions.setAutoGainControl,
	setNoiseSuppression     : settingsActions.setNoiseSuppression,
	setVoiceActivatedUnmute : settingsActions.setVoiceActivatedUnmute,
	setSampleRate           : settingsActions.setSampleRate,
	setChannelCount         : settingsActions.setChannelCount,
	setSampleSize           : settingsActions.setSampleSize,
	setOpusDtx              : settingsActions.setOpusDtx,
	setOpusFec              : settingsActions.setOpusFec,
	setOpusPtime            : settingsActions.setOpusPtime,
	setEnableOpusDetails    : settingsActions.setEnableOpusDetails
};

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.me === next.me &&
				prev.settings === next.settings &&
				prev.peerVolumes[prev.me.id] === next[next.me.id]
			);
		}
	}
)(withStyles(styles)(MediaSettings)));
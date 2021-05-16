import React, { Fragment, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRoomContext } from '../../../../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import { useIntl, FormattedTime, FormattedMessage } from 'react-intl';
import magnet from 'magnet-uri';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import DescriptionIcon from '@material-ui/icons/Description';
import Paper from '@material-ui/core/Paper';
import classnames from 'classnames';
import SaveIcon from '@material-ui/icons/Save';
import GetAppIcon from '@material-ui/icons/GetApp';
import * as fileActions from '../../../../../actions/fileActions';

const styles = (theme) =>
	({
		root :
		{
			display         : 'flex',
			flexShrink      : 0,
			backgroundColor : '#e0e0e085',
			boxShadow       : 'none',
			padding         : theme.spacing(0),
			wordWrap        : 'break-word',
			wordBreak       : 'break-all'
		},
		single :
		{
			marginTop    : theme.spacing(1),
			borderRadius : '10px 10px 10px 10px'
		},
		combinedBegin :
		{
			marginTop    : theme.spacing(1),
			borderRadius : '10px 10px 0px 0px'
		},

		combinedMiddle :
		{
			marginBottom : theme.spacing(0),
			borderRadius : '0px 0px 0px 0px'
		},
		combinedEnd :
		{
			marginBottom : theme.spacing(0),
			borderRadius : '0px 0px 10px 10px'
		},
		combinedTime :
		{
			alignSelf : 'center',
			fontSize  : '13px',
			color     : '#999999',
			margin    : theme.spacing(0.5),
			minWidth  : '35px'

		},
		sent :
		{
			alignSelf : 'flex-end'
		},
		received :
		{
			alignSelf : 'flex-start'
		},
		name : {

		},
		avatar :
		{
			borderRadius    : '50%',
			width           : '2rem',
			height          : '2rem',
			alignSelf       : 'center',
			objectFit       : 'cover',
			margin          : theme.spacing(0.5),
			backgroundColor : '#e0e0e085'
		},
		content :
		{
			margin : theme.spacing(1),
			'& p'  : {
				margin : '0'
			}
		},
		'@keyframes fadeIn' : {
			'from' : {
				backgroundColor : '#5f9b2d5c'
			},
			'to' : {
				backgroundColor : '#e0e0e085'
			}
		},
		isseen : {
			animation         : '$fadeIn 2s linear',
			animationFillMode : 'forwards'
		},

		text :
		{
			margin  : 0,
			padding : theme.spacing(1)
		},
		fileInfo :
		{
			display    : 'flex',
			alignItems : 'center',
			padding    : theme.spacing(0),
			cursor     : 'pointer'
		},
		progressBarShow : {
			display : 'block'
		},
		progressBarHide : {
			display : 'none'
		}

	});

const File = (props) =>
{

	const intl = useIntl();

	const refProgress = useRef();

	const [ progress, setProgress ] = useState();

	const {
		roomClient,
		name,
		canShareFiles,
		magnetUri,
		time,
		file,
		classes,
		sender,
		isseen,
		format,
		width,
		refMessage,
		avatar,
		setFileProgress,
		setFileDone,
		setFileActive

	} = props;

	const handleDownload = () =>
	{
		const handleTorrent = (torrent) =>
		{
			// Torrent already done, this can happen if the
			// same file was sent multiple times.
			if (torrent.progress === 1)
				setFileDone(torrent.magnetURI, torrent.files);
			else
			{
				torrent.on('download', () =>
				{
					setFileProgress(torrent.magnetURI, torrent.progress);

					refProgress.current.value = torrent.progress;
				});

				torrent.on('done', () =>
				{
					setFileDone(torrent.magnetURI, torrent.files);
				});
			}
		};

		setFileActive(magnetUri);

		setProgress(file.active);

		const existingTorrent = roomClient._webTorrent.get(magnetUri);

		if (existingTorrent)
		{
			// Never add duplicate torrents, use the existing one instead.
			handleTorrent(existingTorrent);
		}
		else
		{
			roomClient._webTorrent.add(magnetUri, handleTorrent);
		}
	};

	return (
		<Paper
			className={classnames(
				classes.root,
				sender === 'client' ? classes.sent : classes.received,
				isseen && sender === 'response' ? classes.isseen : null,
				classes[format]
			)}
			style={{ minWidth: width }}
			data-isseen={isseen}
			data-time={time}
			ref={refMessage}
		>
			{/* Avatar */}
			{(format === 'single' || format ==='combinedBegin') && 'hidden' ?
				<img
					className={classes.avatar}
					src={avatar}
					alt='Avatar'
				/>
				:
				<div className={classes.combinedTime}>
					<FormattedTime value={new Date(time)} />
				</div>
			}
			{/* /Avatar */}

			{/* Content */}
			<div className={classes.content}>

				{/* Name & Time */}
				{(format === 'single' || format ==='combinedBegin') &&
				<Typography variant='subtitle1'>
					<b>
						{ sender === 'client' ?
							`${name} (${intl.formatMessage({
								id             : 'room.me',
								defaultMessage : 'Me'
							}) })`
							:
							<b>{name}</b>
						} - <FormattedTime value={new Date(time)} />
					</b>
				</Typography>
				}
				{/* /Name & Time */}

				{/* Save File */}
				{ file.files &&
				<Fragment>
					{/*
					<Typography className={classes.text}>
						<FormattedMessage
							id='filesharing.finished'
							defaultMessage='File finished downloading'
						/>
					</Typography>
					*/}
					{ file.files.map((sharedFile, i) => (
						<div
							className={classes.fileInfo} key={i}
							onClick={() => roomClient.saveFile(sharedFile)}
						>
							<DescriptionIcon />
							<Typography className={classes.text}>
								{sharedFile.name}
							</Typography>
							<IconButton
								variant='contained'
								component='span'
								className={classes.button}
							>
								{/*
								<FormattedMessage
									id='filesharing.save'
									defaultMessage='Save'
								/>
								*/}
								<SaveIcon/>
							</IconButton>
						</div>
					))}
				</Fragment>
				}
				{/* /Save File */}

				{/* Text */}
				{/*
				<Typography className={classes.text}>
						<FormattedMessage
							id='filesharing.sharedFile'
							defaultMessage='{name} shared a file'
							values={{
								name
							}}
						/>
				</Typography>
				*/}
				{/* /Text */}

				{/* Download File */}
				{ (!file.files) &&
				<div
					className={classes.fileInfo}
					onClick={() => handleDownload()}
				>
					<DescriptionIcon />
					<Typography className={classes.text}>
						{ magnet.decode(magnetUri).dn }
					</Typography>
					{ canShareFiles ?
						<IconButton
							variant='contained'
							component='span'
							className={classes.button}
						>
							{/*
							<FormattedMessage
								id='filesharing.download'
								defaultMessage='Download'
							/>
							*/}
							<GetAppIcon/>
						</IconButton>
						:
						<Typography className={classes.text}>
							<FormattedMessage
								id='label.fileSharingUnsupported'
								defaultMessage='File sharing not supported'
							/>
						</Typography>
					}
				</div>
				}
				{/* /Download File */}

				{ file.timeout &&
				<Typography className={classes.text}>
					<FormattedMessage
						id='filesharing.missingSeeds'
						defaultMessage={
							`If this process takes a long time, there might not 
									be anyone seeding this torrent. Try asking someone to 
									reupload the file that you want.`
						}
					/>
				</Typography>
				}

				<progress
					className={progress === true && file.progress < 1 ?
						classes.progressBarShow :
						classes.progressBarHide
					}
					ref={refProgress} value={file.progress}
				/>
			</div>
			{/* /Content */}
		</Paper>
	);
};

File.propTypes = {
	roomClient      : PropTypes.object.isRequired,
	magnetUri       : PropTypes.string.isRequired,
	time            : PropTypes.string.isRequired,
	name            : PropTypes.string.isRequired,
	picture         : PropTypes.string,
	canShareFiles   : PropTypes.bool.isRequired,
	file            : PropTypes.object.isRequired,
	classes         : PropTypes.object.isRequired,
	isseen          : PropTypes.bool.isRequired,
	sender          : PropTypes.string.isRequired,
	refMessage      : PropTypes.object.isRequired,
	width           : PropTypes.number.isRequired,
	format          : PropTypes.string.isRequired,
	avatar          : PropTypes.string,
	setFileDone     : PropTypes.func.isRequired,
	setFileProgress : PropTypes.func.isRequired,
	setFileActive   : PropTypes.func.isRequired

};

const mapStateToProps = (state, { time }) =>
{
	return {
		file          : state.files.files.filter((item) => item.time === time)[0],
		canShareFiles : state.me.canShareFiles
	};
};

const mapDispatchToProps = (dispatch) =>
	({
		setFileDone : (magnetUri, files) =>
		{
			dispatch(
				fileActions.setFileDone(magnetUri, files)
			);
		},
		setFileProgress : (magnetURI, progress) =>
		{
			dispatch(
				fileActions.setFileProgress(magnetURI, progress)
			);
		},
		setFileActive : (magnetURI) =>
		{
			dispatch(
				fileActions.setFileActive(magnetURI)
			);
		}

	});

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.file === next.file &&
				prev.files === next.files &&
				prev.me.canShareFiles === next.me.canShareFiles
			);
		}
	}
)(withStyles(styles)(File)));
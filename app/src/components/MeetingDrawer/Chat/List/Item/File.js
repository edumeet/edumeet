import React, { Fragment } from 'react';
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
import Tooltip from '@material-ui/core/Tooltip';
import Alert from '@material-ui/lab/Alert';

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
			width          : '75px',
			alignSelf      : 'center',
			fontSize       : '13px',
			color          : '#999999',
			dispay         : 'flex',
			display        : 'flex',
			justifyContent : 'center'

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
		avatar : {
			dispay         : 'flex',
			width          : '75px',
			display        : 'flex',
			justifyContent : 'center',
			'& img'        : {
				borderRadius    : '50%',
				width           : '2rem',
				height          : '2rem',
				alignSelf       : 'center',
				objectFit       : 'cover',
				backgroundColor : '#e0e0e085'
			}
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
		}
	});

const File = (props) =>
{

	const intl = useIntl();

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
		refMessage,
		avatar
	} = props;

	return (
		<Paper
			className={classnames(
				classes.root,
				sender === 'client' ? classes.sent : classes.received,
				isseen && sender === 'response' ? classes.isseen : null,
				classes[format]
			)}
			data-name={name}
			data-isseen={isseen}
			data-time={time}
			ref={refMessage}
		>
			{/* Avatar */}
			<div className={classes.avatar}>
				{(format === 'single' || format ==='combinedBegin') && 'hidden' ?
					<img
						src={avatar}
						alt='Avatar'
					/>
					:
					<div className={classes.combinedTime}>
						<FormattedTime value={new Date(time)} />
					</div>
				}
			</div>
			{/* /Avatar */}

			{/* Content */}
			<div className={classes.content}>

				{/* Name & Time */}
				{(format === 'single' || format ==='combinedBegin') &&
				<Typography variant='subtitle1'>
					<b>
						{ sender === 'client' ?
							`${intl.formatMessage({
								id             : 'room.me',
								defaultMessage : 'Me'
							}) }`
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
					{ file.files.map((sharedFile, i) => (
						<div
							className={classes.fileInfo} key={i}
							onClick={() => roomClient.saveFile(sharedFile)}
						>
							<DescriptionIcon />

							<Typography className={classes.text}>
								{sharedFile.name}
							</Typography>

							<Tooltip
								title={intl.formatMessage({
									id             : 'filesharing.save',
									defaultMessage : 'Save'
								})}
								placement='top'
								enterDelay='700'
								enterNextDelay='700'
							>
								<IconButton
									variant='contained'
									component='span'
									className={classes.button}
									aria-label={intl.formatMessage({
										id             : 'filesharing.save',
										defaultMessage : 'Save'
									})}
								>
									<SaveIcon/>
								</IconButton>
							</Tooltip>
						</div>
					))}
				</Fragment>
				}
				{/* /Save File */}

				{/* Download File */}
				{/* { (!file.active && !file.files) && */}
				{ (!file.files) &&
				<Fragment>
					<div
						className={classes.fileInfo}
						onClick={
							!canShareFiles ?
								undefined :
								() => roomClient.handleDownload(magnetUri)
						}
					>
						<DescriptionIcon />
						<Typography className={classes.text}>
							{ magnet.decode(magnetUri).dn }
						</Typography>
						<Tooltip
							title={intl.formatMessage({
								id             : 'filesharing.download',
								defaultMessage : 'Download'
							})}
							placement='top'
							enterDelay='700'
							enterNextDelay='700'
						>
							<IconButton
								variant='contained'
								component='span'
								className={classes.button}
								disabled={!canShareFiles ? true : false}
								aria-label={intl.formatMessage({
									id             : 'filesharing.download',
									defaultMessage : 'Download'
								})}
							>
								<GetAppIcon/>
							</IconButton>
						</Tooltip>

					</div>
					<div>

						{ file.active &&
						<progress value={file.progress} />
						}
					</div>
					{ !canShareFiles &&
					<div>
						<Alert severity='error'>
							<FormattedMessage
								id='label.fileSharingUnsupported'
								defaultMessage='File sharing not supported'
							/>
						</Alert>
					</div>
					}
				</Fragment>
				}

				{ file.timeout &&
				<Alert severity='warning'>
					<FormattedMessage
						id='filesharing.missingSeeds'
						defaultMessage={
							`If this process takes a long time, there might not 
									be anyone seeding this torrent. Try asking someone to 
									reupload the file that you want.`
						}
					/>
				</Alert>
				}
				{/* /Download File */}
			</div>
			{/* /Content */}
		</Paper>
	);
};

File.propTypes = {
	roomClient    : PropTypes.object.isRequired,
	magnetUri     : PropTypes.string.isRequired,
	time          : PropTypes.string.isRequired,
	name          : PropTypes.string.isRequired,
	picture       : PropTypes.string,
	canShareFiles : PropTypes.bool.isRequired,
	file          : PropTypes.object.isRequired,
	classes       : PropTypes.object.isRequired,
	isseen        : PropTypes.bool.isRequired,
	sender        : PropTypes.string.isRequired,
	refMessage    : PropTypes.object.isRequired,
	width         : PropTypes.number.isRequired,
	format        : PropTypes.string.isRequired,
	avatar        : PropTypes.string

};

const mapStateToProps = (state, { time }) =>
{
	return {
		file          : state.files.files.filter((item) => item.time === time)[0],
		canShareFiles : state.me.canShareFiles
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.files === next.files &&
				prev.me.canShareFiles === next.me.canShareFiles
			);
		}
	}
)(withStyles(styles)(File)));
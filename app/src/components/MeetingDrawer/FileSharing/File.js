import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRoomContext } from '../../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import magnet from 'magnet-uri';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';

const styles = (theme) =>
	({
		root :
		{
			display        : 'flex',
			alignItems     : 'center',
			width          : '100%',
			padding        : theme.spacing.unit,
			boxShadow      : '0px 1px 5px 0px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 3px 1px -2px rgba(0, 0, 0, 0.12)',
			'&:not(:last-child)' :
			{
				marginBottom : theme.spacing.unit
			}
		},
		avatar :
		{
			borderRadius : '50%',
			height       : '2rem'
		},
		text :
		{
			margin  : 0,
			padding : theme.spacing.unit
		},
		fileContent :
		{
			display    : 'flex',
			alignItems : 'center'
		},
		fileInfo :
		{
			display    : 'flex',
			alignItems : 'center',
			padding    : theme.spacing.unit
		},
		button :
		{
			marginRight : 'auto'
		}
	});

class File extends Component
{
	render()
	{
		const {
			roomClient,
			torrentSupport,
			file,
			classes
		} = this.props;

		return (
			<div className={classes.root}>
				<img alt='Peer avatar' className={classes.avatar} src={file.picture || EmptyAvatar} />
	
				<div className={classes.fileContent}>
					{ file.files ?
						<Fragment>
							<Typography className={classes.text}>
								File finished downloading
							</Typography>

							{ file.files.map((sharedFile, i) => (
								<div className={classes.fileInfo} key={i}>
									<Typography className={classes.text}>
										{sharedFile.name}
									</Typography>
									<Button
										variant='contained'
										component='span'
										className={classes.button}
										onClick={() =>
										{
											roomClient.saveFile(sharedFile);
										}}
									>
										Save
									</Button>
								</div>
							))}
						</Fragment>
						:null
					}
					<Typography className={classes.text}>
						{ file.me ?
							'You shared a file'
							:
							`${file.displayName} shared a file`
						}
					</Typography>

					{ !file.active && !file.files ?
						<div className={classes.fileInfo}>
							<Typography className={classes.text}>
								{magnet.decode(file.magnetUri).dn}
							</Typography>
							{ torrentSupport ?
								<Button
									variant='contained'
									component='span'
									className={classes.button}
									onClick={() =>
									{
										roomClient.handleDownload(file.magnetUri);
									}}
								>
									Download
								</Button>
								:
								<Typography className={classes.text}>
									Your browser does not support downloading files using WebTorrent.
								</Typography>
							}
						</div>
						:null
					}

					{ file.timeout ?
						<Typography className={classes.text}>
							If this process takes a long time, there might not be anyone seeding
							this torrent. Try asking someone to reupload the file that you want.
						</Typography>
						:null
					}

					{ file.active ?
						<progress value={file.progress} />
						:null
					}
				</div>
			</div>
		);
	}
}

File.propTypes = {
	roomClient     : PropTypes.object.isRequired,
	torrentSupport : PropTypes.bool.isRequired,
	file           : PropTypes.object.isRequired,
	classes        : PropTypes.object.isRequired
};

const mapStateToProps = (state, { magnetUri }) =>
{
	return {
		file           : state.files[magnetUri],
		torrentSupport : state.room.torrentSupport
	};
};

export default withRoomContext(connect(
	mapStateToProps
)(withStyles(styles)(File)));
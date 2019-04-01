import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import classnames from 'classnames';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import Fab from '@material-ui/core/Fab';
import Avatar from '@material-ui/core/Avatar';
import ScreenIcon from '@material-ui/icons/ScreenShare';
import ScreenOffIcon from '@material-ui/icons/StopScreenShare';
import ExtensionIcon from '@material-ui/icons/Extension';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import HandOff from '../../images/icon-hand-black.svg';
import HandOn from '../../images/icon-hand-white.svg';
import LeaveIcon from '@material-ui/icons/Cancel';

const styles = (theme) =>
	({
		root :
		{
			position       : 'fixed',
			zIndex         : 500,
			top            : '50%',
			transform      : 'translate(0%, -50%)',
			display        : 'flex',
			flexDirection  : 'column',
			justifyContent : 'center',
			alignItems     : 'center',
			left           : '1.0em',
			width          : '2.6em'
		},
		fab :
		{
			margin : theme.spacing.unit
		},
		show :
		{
			opacity    : 1,
			transition : 'opacity .5s'
		},
		hide :
		{
			opacity    : 0,
			transition : 'opacity .5s'
		}
	});

class Sidebar extends React.PureComponent
{
	render()
	{
		const {
			roomClient,
			toolbarsVisible,
			me,
			screenProducer,
			locked,
			classes
		} = this.props;

		let screenState;

		if (me.needExtension)
		{
			screenState = 'need-extension';
		}
		else if (!me.canShareScreen)
		{
			screenState = 'unsupported';
		}
		else if (screenProducer)
		{
			screenState = 'on';
		}
		else
		{
			screenState = 'off';
		}

		return (
			<div
				className={
					classnames(classes.root, toolbarsVisible ? classes.show : classes.hide)
				}
			>
				<Fab
					aria-label='Share screen'
					className={classes.fab}
					disabled={!me.canShareScreen || me.screenShareInProgress}
					color={screenState === 'on' ? 'primary' : 'default'}
					
					onClick={() =>
					{
						switch (screenState)
						{
							case 'on':
							{
								roomClient.disableScreenSharing();
								break;
							}
							case 'off':
							{
								roomClient.enableScreenSharing();
								break;
							}
							case 'need-extension':
							{
								roomClient.installExtension();
								break;
							}
							default:
							{
								break;
							}
						}
					}}
				>
					{ screenState === 'on' || screenState === 'unsupported' ?
						<ScreenOffIcon/>
						:null
					}
					{ screenState === 'off' ?
						<ScreenIcon/>
						:null
					}
					{ screenState === 'need-extension' ?
						<ExtensionIcon/>
						:null
					}
				</Fab>

				<Fab
					aria-label='Room lock'
					className={classes.fab}
					color={locked ? 'primary' : 'default'}
					onClick={() =>
					{
						if (locked)
						{
							roomClient.unlockRoom();
						}
						else
						{
							roomClient.lockRoom();
						}
					}}
				>
					{ locked ?
						<LockIcon />
						:
						<LockOpenIcon />
					}
				</Fab>

				<Fab
					aria-label='Raise hand'
					className={classes.fab}
					disabled={me.raiseHandInProgress}
					color={me.raiseHand ? 'primary' : 'default'}
					onClick={() => roomClient.sendRaiseHandState(!me.raiseHand)}
				>
					<Avatar alt='Hand' src={me.raiseHand ? HandOn : HandOff} />
				</Fab>

				<Fab
					aria-label='Leave meeting'
					className={classes.fab}
					color='secondary'
					onClick={() => roomClient.close()}
				>
					<LeaveIcon />
				</Fab>
			</div>
		);
	}
}

Sidebar.propTypes =
{
	roomClient      : PropTypes.any.isRequired,
	toolbarsVisible : PropTypes.bool.isRequired,
	me              : appPropTypes.Me.isRequired,
	screenProducer  : appPropTypes.Producer,
	locked          : PropTypes.bool.isRequired,
	classes         : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		toolbarsVisible : state.room.toolbarsVisible,
		screenProducer  : Object.values(state.producers)
			.find((producer) => producer.source === 'screen'),
		me     : state.me,
		locked : state.room.locked
	});

export default withRoomContext(connect(
	mapStateToProps
)(withStyles(styles)(Sidebar)));

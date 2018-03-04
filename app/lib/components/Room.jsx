import React from 'react';
import { connect } from 'react-redux';
import ReactTooltip from 'react-tooltip';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClipboardButton from 'react-clipboard.js';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
import { Appear } from './transitions';
import Me from './Me';
import Peers from './Peers';
import Notifications from './Notifications';
import ChatWidget from './ChatWidget';

class Room extends React.Component
{
	render()
	{
		const {
			room,
			me,
			amActiveSpeaker,
			screenProducer,
			onRoomLinkCopy,
			onSetAudioMode,
			onRestartIce,
			onLeaveMeeting,
			onShareScreen,
			onUnShareScreen,
			onNeedExtension
		} = this.props;

		let screenState;
		let screenTip;

		if (me.needExtension)
		{
			screenState = 'need-extension';
			screenTip = 'Install screen sharing extension';
		}
		else if (!me.canShareScreen)
		{
			screenState = 'unsupported';
			screenTip = 'Screen sharing not supported';
		}
		else if (screenProducer)
		{
			screenState = 'on';
			screenTip = 'Stop screen sharing';
		}
		else
		{
			screenState = 'off';
			screenTip = 'Start screen sharing';
		}

		return (
			<Appear duration={300}>
				<div data-component='Room'>
					<Notifications />
					<ChatWidget />

					<div className='state' data-tip='Server status'>
						<div className={classnames('icon', room.state)} />
						<p className={classnames('text', room.state)}>{room.state}</p>
					</div>

					<div className='room-link-wrapper'>
						<div className='room-link'>
							<ClipboardButton
								component='a'
								className='link'
								button-href={room.url}
								button-target='_blank'
								data-tip='Click to copy room link'
								data-clipboard-text={room.url}
								onSuccess={onRoomLinkCopy}
								onClick={(event) =>
								{
									// If this is a 'Open in new window/tab' don't prevent
									// click default action.
									if (
										event.ctrlKey || event.shiftKey || event.metaKey ||
										// Middle click (IE > 9 and everyone else).
										(event.button && event.button === 1)
									)
									{
										return;
									}

									event.preventDefault();
								}}
							>
								invitation link
							</ClipboardButton>
						</div>
					</div>

					<Peers />

					<div
						className={classnames('me-container', {
							'active-speaker' : amActiveSpeaker
						})}
					>
						<Me />
					</div>

					<div className='sidebar'>
						<div
							className={classnames('button', 'screen', screenState)}
							data-tip={screenTip}
							data-type='dark'
							onClick={() =>
							{
								switch (screenState)
								{
									case 'on':
									{
										onUnShareScreen();
										break;
									}
									case 'off':
									{
										onShareScreen();
										break;
									}
									case 'need-extension':
									{
										onNeedExtension();
										break;
									}
									default:
									{
										break;
									}
								}
							}}
						/>

						<div
							className={classnames('button', 'audio-only', {
								on       : me.audioOnly,
								disabled : me.audioOnlyInProgress
							})}
							data-tip='Toggle audio only mode'
							data-type='dark'
							onClick={() => onSetAudioMode(!me.audioOnly)}
						/>

						<div
							className={classnames('button', 'restart-ice', {
								disabled : me.restartIceInProgress
							})}
							data-tip='Restart ICE'
							data-type='dark'
							onClick={() => onRestartIce()}
						/>

						<div
							className={classnames('button', 'leave-meeting')}
							data-tip='Leave meeting'
							data-type='dark'
							onClick={() => onLeaveMeeting()}
						/>
					</div>

					<ReactTooltip
						effect='solid'
						delayShow={100}
						delayHide={100}
					/>
				</div>
			</Appear>
		);
	}
}

Room.propTypes =
{
	room            : appPropTypes.Room.isRequired,
	me              : appPropTypes.Me.isRequired,
	amActiveSpeaker : PropTypes.bool.isRequired,
	screenProducer  : appPropTypes.Producer,
	onRoomLinkCopy  : PropTypes.func.isRequired,
	onSetAudioMode  : PropTypes.func.isRequired,
	onRestartIce    : PropTypes.func.isRequired,
	onLeaveMeeting  : PropTypes.func.isRequired,
	onShareScreen   : PropTypes.func.isRequired,
	onUnShareScreen : PropTypes.func.isRequired,
	onNeedExtension : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	const producersArray = Object.values(state.producers);
	const screenProducer =
		producersArray.find((producer) => producer.source === 'screen');

	return {
		room            : state.room,
		me              : state.me,
		amActiveSpeaker : state.me.name === state.room.activeSpeakerName,
		screenProducer  : screenProducer
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onRoomLinkCopy : () =>
		{
			dispatch(requestActions.notify(
				{
					text : 'Room link copied to the clipboard'
				}));
		},
		onSetAudioMode : (enable) =>
		{
			if (enable)
				dispatch(requestActions.enableAudioOnly());
			else
				dispatch(requestActions.disableAudioOnly());
		},
		onRestartIce : () =>
		{
			dispatch(requestActions.restartIce());
		},
		onLeaveMeeting : () =>
		{
			dispatch(requestActions.leaveRoom());
		},
		onShareScreen : () =>
		{
			dispatch(requestActions.enableScreenSharing());
		},
		onUnShareScreen : () =>
		{
			dispatch(requestActions.disableScreenSharing());
		},
		onNeedExtension : () =>
		{
			dispatch(requestActions.installExtension());
		}
	};
};

const RoomContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Room);

export default RoomContainer;

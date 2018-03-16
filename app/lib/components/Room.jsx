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
			onRoomLinkCopy,
			onSetAudioMode,
			onRestartIce,
			onToggleHand,
			onLeaveMeeting
		} = this.props;

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
							className={classnames('button', 'raise-hand', {
								on       : me.raiseHand,
								disabled : me.raiseHandInProgress
							})}
							data-tip='Raise hand'
							data-type='dark'
							onClick={() => onToggleHand(!me.raiseHand)}
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
	onRoomLinkCopy  : PropTypes.func.isRequired,
	onSetAudioMode  : PropTypes.func.isRequired,
	onRestartIce    : PropTypes.func.isRequired,
	onToggleHand 	  : PropTypes.func.isRequired,
	onLeaveMeeting  : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		room            : state.room,
		me              : state.me,
		amActiveSpeaker : state.me.name === state.room.activeSpeakerName
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
		onToggleHand : (enable) =>
		{
			if (enable)
				dispatch(requestActions.raiseHand());
			else
				dispatch(requestActions.lowerHand());
		},
		onLeaveMeeting : () =>
		{
			dispatch(requestActions.leaveRoom());
		}
	};
};

const RoomContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Room);

export default RoomContainer;

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
import ToolAreaButton from './ToolArea/ToolAreaButton';
import ToolArea from './ToolArea/ToolArea';

class Room extends React.Component
{
	render()
	{
		const {
			room,
			me,
			toolAreaOpen,
			amActiveSpeaker,
			screenProducer,
			onRoomLinkCopy,
			onLogin,
			onShareScreen,
			onUnShareScreen,
			onNeedExtension,
			onToggleHand,
			onLeaveMeeting
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
					<div
						className='room-wrapper'
						style={{
							width : toolAreaOpen ? '80%' : '100%'
						}}
					>
						<Notifications />
						<ToolAreaButton />

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

						<Peers
							advancedMode={room.advancedMode}
						/>

						<div
							className={classnames('me-container', {
								'active-speaker' : amActiveSpeaker
							})}
						>
							<Me
								advancedMode={room.advancedMode}
							/>
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
								className={classnames('button', 'login', 'off', {
									disabled : me.loginInProgress
								})}
								data-tip='Login'
								data-type='dark'
								onClick={() => onLogin()}
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
					<div
						className='toolarea-wrapper'
						style={{
							width : toolAreaOpen ? '20%' : '0%'
						}}
					>
						{toolAreaOpen ?
							<ToolArea
								advancedMode={room.advancedMode}
							/>
							:null
						}
					</div>
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
	toolAreaOpen    : PropTypes.bool.isRequired,
	screenProducer  : appPropTypes.Producer,
	onRoomLinkCopy  : PropTypes.func.isRequired,
	onShareScreen   : PropTypes.func.isRequired,
	onUnShareScreen : PropTypes.func.isRequired,
	onNeedExtension : PropTypes.func.isRequired,
	onToggleHand    : PropTypes.func.isRequired,
	onLeaveMeeting  : PropTypes.func.isRequired,
	onLogin         : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	const producersArray = Object.values(state.producers);
	const screenProducer =
		producersArray.find((producer) => producer.source === 'screen');

	return {
		room            : state.room,
		me              : state.me,
		toolAreaOpen    : state.toolarea.toolAreaOpen,
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
		},
		onLogin : () =>
		{
			dispatch(requestActions.userLogin());
		}
	};
};

const RoomContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Room);

export default RoomContainer;

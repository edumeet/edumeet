import React from 'react';
import { connect } from 'react-redux';
import ReactTooltip from 'react-tooltip';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClipboardButton from 'react-clipboard.js';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
import * as stateActions from '../redux/stateActions';
import { Appear } from './transitions';
import Me from './Me';
import Peers from './Peers';
import Notifications from './Notifications';
import ToolAreaButton from './ToolArea/ToolAreaButton';
import ToolArea from './ToolArea/ToolArea';
import FullScreenView from './FullScreenView';
import Draggable from 'react-draggable';
import { idle } from '../utils';
import Sidebar from './Sidebar';
import Filmstrip from './Filmstrip';

// Hide toolbars after 10 seconds of inactivity.
const TIMEOUT = 10 * 1000;

class Room extends React.Component
{
	/**
	 * Hides the different toolbars on the page after a
	 * given amount of time has passed since the
	 * last time the cursor was moved.
	 */
	waitForHide = idle(() => 
	{
		this.props.setToolbarsVisible(false);
	}, TIMEOUT);

	handleMouseMove = () => 
	{
		// If the toolbars were hidden, show them again when
		// the user moves their cursor.
		if (!this.props.room.toolbarsVisible) 
		{
			this.props.setToolbarsVisible(true);
		}

		this.waitForHide();
	}

	componentDidMount()
	{
		window.addEventListener('mousemove', this.handleMouseMove);
	}

	componentWillUnmount()
	{
		window.removeEventListener('mousemove', this.handleMouseMove);
	}

	render()
	{
		const {
			room,
			toolAreaOpen,
			amActiveSpeaker,
			onRoomLinkCopy
		} = this.props;

		return (
			<Appear duration={300}>
				<div data-component='Room'>
					<FullScreenView advancedMode={room.advancedMode} />
					<div
						className='room-wrapper'
						style={{
							width : toolAreaOpen ? '80%' : '100%'
						}}
					>
						<Notifications />

						<ToolAreaButton />

						{room.advancedMode ?
							<div className='state' data-tip='Server status'>
								<div className={classnames('icon', room.state)} />
								<p className={classnames('text', room.state)}>{room.state}</p>
							</div>
							:null
						}
									
						<div
							className={classnames('room-link-wrapper room-controls', {
								'visible' : this.props.room.toolbarsVisible
							})}
						>
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

						<Filmstrip advancedMode={room.advancedMode} />
						{false && (
							<Peers
								advancedMode={room.advancedMode}
							/>
						)}

						<Draggable handle='.me-container' bounds='body' cancel='.display-name'>
							<div
								className={classnames('me-container', {
									'active-speaker' : amActiveSpeaker
								})}
							>
								<Me
									advancedMode={room.advancedMode}
								/>
							</div>
						</Draggable>

						<Sidebar />

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
	room               : appPropTypes.Room.isRequired,
	me                 : appPropTypes.Me.isRequired,
	amActiveSpeaker    : PropTypes.bool.isRequired,
	toolAreaOpen       : PropTypes.bool.isRequired,
	screenProducer     : appPropTypes.Producer,
	onRoomLinkCopy     : PropTypes.func.isRequired,
	setToolbarsVisible : PropTypes.func.isRequired
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

		setToolbarsVisible : (visible) =>
		{
			dispatch(stateActions.setToolbarsVisible(visible));
		}
	};
};

const RoomContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Room);

export default RoomContainer;

import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import ReactTooltip from 'react-tooltip';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import CopyToClipboard from 'react-copy-to-clipboard';
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
import { configureDragDrop, HoldingOverlay } from './FileSharing/DragDropSharing';

configureDragDrop();

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

	handleMovement = () => 
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
		window.addEventListener('mousemove', this.handleMovement);
		window.addEventListener('touchstart', this.handleMovement);
	}

	componentWillUnmount()
	{
		window.removeEventListener('mousemove', this.handleMovement);
		window.removeEventListener('touchstart', this.handleMovement);
	}

	render()
	{
		const {
			room,
			toolAreaOpen,
			amActiveSpeaker,
			onRoomLinkCopy
		} = this.props;

		const View = {
			filmstrip  : Filmstrip,
			democratic : Peers
		}[room.mode];

		return (
			<Fragment>
				<HoldingOverlay />

				<Appear duration={300}>
					<div data-component='Room'>
						<FullScreenView advancedMode={room.advancedMode} />
						<div
							className='room-wrapper'
							style={{
								width : toolAreaOpen ? '75%' : '100%'
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
									<CopyToClipboard
										text={room.url}
										onCopy={onRoomLinkCopy}
									>
										<a
											className='link'
											href={room.url}
											target='_blank'
											data-tip='Click to copy room link'
											rel='noopener noreferrer'
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
										</a>
									</CopyToClipboard>
								</div>
							</div>

							<View advancedMode={room.advancedMode} />

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
								width : toolAreaOpen ? '25%' : '0%'
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
			</Fragment>
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

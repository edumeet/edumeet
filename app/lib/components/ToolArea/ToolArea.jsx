import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import * as stateActions from '../../redux/stateActions';
import ParticipantList from '../ParticipantList/ParticipantList';
import Chat from '../Chat/Chat';
import Settings from '../Settings';
import FileSharing from '../FileSharing/FileSharing';
import TabHeader from './TabHeader';

class ToolArea extends React.Component
{
	constructor(props)
	{
		super(props);
	}

	render()
	{
		const {
			currentToolTab,
			toolAreaOpen,
			unreadMessages,
			unreadFiles,
			toggleToolArea,
			unread
		} = this.props;

		const VisibleTab = {
			chat     : Chat,
			files    : FileSharing,
			users    : ParticipantList,
			settings : Settings
		}[currentToolTab];

		return (
			<Fragment>
				<div
					className={classNames('toolarea-shade', {
						open : toolAreaOpen
					})}
					onClick={toggleToolArea}
				/>

				<div
					data-component='ToolArea'
					className={classNames({
						open : toolAreaOpen
					})}
				>
					<div
						className='toolarea-button'
						onClick={toggleToolArea}
					>
						<span className='content'>
							<div
								className='toolarea-icon'
							/>
							<p>Toolbox</p>
						</span>
						{!toolAreaOpen && unread > 0 && (
							<span className={classNames('badge', { long: unread >= 10 })}>
								{unread}
							</span>
						)}
					</div>
					<div className='tab-headers'>
						<TabHeader
							id='chat'
							name='Chat'
							badge={unreadMessages}
						/>

						<TabHeader
							id='files'
							name='Files'
							badge={unreadFiles}
						/>

						<TabHeader
							id='users'
							name='Users'
						/>

						<TabHeader
							id='settings'
							name='Settings'
						/>
					</div>

					<div className='tab'>
						<VisibleTab />
					</div>
				</div>
			</Fragment>
		);
	}
}

ToolArea.propTypes =
{
	advancedMode   : PropTypes.bool,
	currentToolTab : PropTypes.string.isRequired,
	setToolTab     : PropTypes.func.isRequired,
	unreadMessages : PropTypes.number.isRequired,
	unreadFiles    : PropTypes.number.isRequired,
	toolAreaOpen   : PropTypes.bool,
	toggleToolArea : PropTypes.func.isRequired,
	closeToolArea  : PropTypes.func.isRequired,
	unread         : PropTypes.number.isRequired
};

const mapStateToProps = (state) => ({
	currentToolTab : state.toolarea.currentToolTab,
	unreadMessages : state.toolarea.unreadMessages,
	unreadFiles    : state.toolarea.unreadFiles,
	toolAreaOpen   : state.toolarea.toolAreaOpen,
	unread         : state.toolarea.unreadMessages +
		state.toolarea.unreadFiles
});

const mapDispatchToProps = {
	setToolTab     : stateActions.setToolTab,
	toggleToolArea : stateActions.toggleToolArea,
	closeToolArea  : stateActions.closeToolArea
};

const ToolAreaContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(ToolArea);

export default ToolAreaContainer;

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as toolTabActions from '../../redux/stateActions';
import ParticipantList from '../ParticipantList/ParticipantList';
import Chat from '../Chat/Chat';
import Settings from '../Settings';
import FileSharing from '../FileSharing';

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
			unreadMessages,
			unreadFiles,
			setToolTab
		} = this.props;

		return (
			<div data-component='ToolArea'>
				<div className='tabs'>
					<input
						type='radio'
						name='tabs'
						id='tab-chat'
						onChange={() =>
						{
							setToolTab('chat');
						}}
						checked={currentToolTab === 'chat'}
					/>
					<label htmlFor='tab-chat'>
						Chat
						
						{unreadMessages > 0 && (
							<span className='badge'>{unreadMessages}</span>
						)}
					</label>

					<div className='tab'>
						<Chat />
					</div>

					<input
						type='radio'
						name='tabs'
						id='tab-files'
						onChange={() => setToolTab('files')}
						checked={currentToolTab === 'files'}
					/>
					<label htmlFor='tab-files'>
						Files

						{unreadFiles > 0 && (
							<span className='badge'>{unreadFiles}</span>
						)}
					</label>

					<div className='tab'>
						<FileSharing />
					</div>

					<input
						type='radio'
						name='tabs'
						id='tab-users'
						onChange={() =>
						{
							setToolTab('users');
						}}
						checked={currentToolTab === 'users'}
					/>
					<label htmlFor='tab-users'>Users</label>

					<div className='tab'>
						<ParticipantList />
					</div>

					<input
						type='radio'
						name='tabs'
						id='tab-settings'
						onChange={() =>
						{
							setToolTab('settings');
						}}
						checked={currentToolTab === 'settings'}
					/>
					<label htmlFor='tab-settings'>Settings</label>

					<div className='tab'>
						<Settings />
					</div>
				</div>
			</div>
		);
	}
}

ToolArea.propTypes =
{
	advancedMode   : PropTypes.bool,
	currentToolTab : PropTypes.string.isRequired,
	setToolTab     : PropTypes.func.isRequired,
	unreadMessages : PropTypes.number.isRequired,
	unreadFiles    : PropTypes.number.isRequired
};

const mapStateToProps = (state) => ({
	currentToolTab : state.toolarea.currentToolTab,
	unreadMessages : state.toolarea.unreadMessages,
	unreadFiles    : state.toolarea.unreadFiles
});

const mapDispatchToProps = {
	setToolTab : toolTabActions.setToolTab
};

const ToolAreaContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(ToolArea);

export default ToolAreaContainer;

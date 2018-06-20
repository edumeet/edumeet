import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as stateActions from '../../redux/stateActions';
import ParticipantList from '../ParticipantList/ParticipantList';
import Chat from '../Chat/Chat';
import Settings from '../Settings';

class ToolArea extends React.Component
{
	constructor(props)
	{
		super(props);
	}

	render()
	{
		const {
			toolarea,
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
						checked={toolarea.currentToolTab === 'chat'}
					/>
					<label htmlFor='tab-chat'>Chat</label>

					<div className='tab'>
						<Chat />
					</div>

					<input
						type='radio'
						name='tabs'
						id='tab-users'
						onChange={() =>
						{
							setToolTab('users');
						}}
						checked={toolarea.currentToolTab === 'users'}
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
						checked={toolarea.currentToolTab === 'settings'}
					/>
					<label htmlFor='tab-settings'>Settings</label>

					<div className='tab'>
						<Settings />
					</div>

					<input
						type='radio'
						name='tabs'
						id='tab-layout'
						onChange={() =>
						{
							setToolTab('layout');
						}}
						checked={toolarea.currentToolTab === 'layout'}
					/>
					<label htmlFor='tab-layout'>Layout</label>

					<div className='tab'>
						<h1>Tab Three Content</h1>
						<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>
					</div>
				</div>
			</div>
		);
	}
}

ToolArea.propTypes =
{
	advancedMode : PropTypes.bool,
	toolarea     : PropTypes.object.isRequired,
	setToolTab   : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		toolarea : state.toolarea
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		setToolTab : (toolTab) =>
		{
			dispatch(stateActions.setToolTab(toolTab));
		}
	};
};

const ToolAreaContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(ToolArea);

export default ToolAreaContainer;

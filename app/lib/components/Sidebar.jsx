import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import * as requestActions from '../redux/requestActions';
import fscreen from 'fscreen';

class Sidebar extends Component
{
	state = {
		fullscreen : false
	};

	handleToggleFullscreen = () =>
	{
		if (fscreen.fullscreenElement) 
		{
			fscreen.exitFullscreen();
		}
		else 
		{
			fscreen.requestFullscreen(document.documentElement);
		}
	};

	handleFullscreenChange = () => 
	{
		this.setState({
			fullscreen : fscreen.fullscreenElement !== null
		});
	};

	componentDidMount()
	{
		if (fscreen.fullscreenEnabled)
		{
			fscreen.addEventListener('fullscreenchange', this.handleFullscreenChange);
		}
	}

	componentWillUnmount()
	{
		if (fscreen.fullscreenEnabled)
		{
			fscreen.removeEventListener('fullscreenchange', this.handleFullscreenChange);
		}
	}

	render() 
	{
		const {
			toolbarsVisible, me, screenProducer, onLogin, onShareScreen,
			onUnShareScreen, onNeedExtension, onLeaveMeeting, onLogout
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
			<div
				className={classnames('sidebar room-controls', {
					'visible' : toolbarsVisible
				})}
				data-component='Sidebar'
			>
				{fscreen.fullscreenEnabled && (
					<div
						className={classnames('button', 'fullscreen', {
							on : this.state.fullscreen
						})}
						onClick={this.handleToggleFullscreen}
						data-tip='Fullscreen'
						data-type='dark'
					/>
				)}

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
	
				{me.loginEnabled && (me.loggedIn ? (
					<div
						className='button logout'
						data-tip='Logout'
						data-type='dark'
						onClick={onLogout}
					>
						<img src={me.picture || 'resources/images/avatar-empty.jpeg'} />
					</div>
				) : (
					<div
						className='button login off'
						data-tip='Login'
						data-type='dark'
						onClick={onLogin}
					/>
				))}
			</div>
		);
	}
}

Sidebar.propTypes = {
	toolbarsVisible : PropTypes.bool.isRequired,
	me              : appPropTypes.Me.isRequired,
	onShareScreen   : PropTypes.func.isRequired,
	onUnShareScreen : PropTypes.func.isRequired,
	onNeedExtension : PropTypes.func.isRequired,
	onLeaveMeeting  : PropTypes.func.isRequired,
	onLogin         : PropTypes.func.isRequired,
	screenProducer  : appPropTypes.Producer
};

const mapStateToProps = (state) =>
	({
		toolbarsVisible : state.room.toolbarsVisible,
		screenProducer  : Object.values(state.producers)
			.find((producer) => producer.source === 'screen'),
		me : state.me
	});

const mapDispatchToProps = {
	onLeaveMeeting  : requestActions.leaveRoom,
	onShareScreen   : requestActions.enableScreenSharing,
	onUnShareScreen : requestActions.disableScreenSharing,
	onNeedExtension : requestActions.installExtension,
	onLogin         : requestActions.userLogin,
	onLogout        : requestActions.userLogout
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Sidebar);
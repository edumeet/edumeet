import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import { withRoomContext } from '../RoomContext';
import FullScreen from './FullScreen';

class Sidebar extends Component
{
	constructor(props)
	{
		super(props);

		this.fullscreen = new FullScreen(document);
		this.state = {
			fullscreen : false
		};
	}

	handleToggleFullscreen = () =>
	{
		if (this.fullscreen.fullscreenElement)
		{
			this.fullscreen.exitFullscreen();
		}
		else
		{
			this.fullscreen.requestFullscreen(document.documentElement);
		}
	};

	handleFullscreenChange = () =>
	{
		this.setState({
			fullscreen : this.fullscreen.fullscreenElement !== null
		});
	};

	componentDidMount()
	{
		if (this.fullscreen.fullscreenEnabled)
		{
			this.fullscreen.addEventListener('fullscreenchange', this.handleFullscreenChange);
		}
	}

	componentWillUnmount()
	{
		if (this.fullscreen.fullscreenEnabled)
		{
			this.fullscreen.removeEventListener('fullscreenchange', this.handleFullscreenChange);
		}
	}

	render()
	{
		const {
			roomClient,
			toolbarsVisible,
			me,
			screenProducer
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
				<If condition={this.fullscreen.fullscreenEnabled}>
					<div
						className={classnames('button', 'fullscreen', {
							on : this.state.fullscreen
						})}
						onClick={this.handleToggleFullscreen}
						data-tip='Fullscreen'
						data-place='right'
						data-type='dark'
					/>
				</If>

				<div
					className={classnames('button', 'screen', screenState)}
					data-tip={screenTip}
					data-place='right'
					data-type='dark'
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
				/>

				<If condition={me.loginEnabled}>
					<Choose>
						<When condition={me.loggedIn}>
							<div
								className='button logout'
								data-tip='Logout'
								data-place='right'
								data-type='dark'
								onClick={() => roomClient.logout()}
							>
								<img src={me.picture || 'resources/images/avatar-empty.jpeg'} />
							</div>
						</When>
						<Otherwise>
							<div
								className='button login off'
								data-tip='Login'
								data-place='right'
								data-type='dark'
								onClick={() => roomClient.login()}
							/>
						</Otherwise>
					</Choose>
				</If>
				<div
					className={classnames('button', 'raise-hand', {
						on       : me.raiseHand,
						disabled : me.raiseHandInProgress
					})}
					data-tip='Raise hand'
					data-place='right'
					data-type='dark'
					onClick={() => roomClient.sendRaiseHandState(!me.raiseHand)}
				/>

				<div
					className={classnames('button', 'leave-meeting')}
					data-tip='Leave meeting'
					data-place='right'
					data-type='dark'
					onClick={() => roomClient.close()}
				/>
			</div>
		);
	}
}

Sidebar.propTypes = {
	roomClient      : PropTypes.any.isRequired,
	toolbarsVisible : PropTypes.bool.isRequired,
	me              : appPropTypes.Me.isRequired,
	screenProducer  : appPropTypes.Producer
};

const mapStateToProps = (state) =>
	({
		toolbarsVisible : state.room.toolbarsVisible,
		screenProducer  : Object.values(state.producers)
			.find((producer) => producer.source === 'screen'),
		me : state.me
	});

export default withRoomContext(connect(
	mapStateToProps
)(Sidebar));

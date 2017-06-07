'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import Logger from '../Logger';
import muiTheme from './muiTheme';
import Notifier from './Notifier';
import Room from './Room';

const logger = new Logger('App'); // eslint-disable-line no-unused-vars

export default class App extends React.Component
{
	constructor()
	{
		super();

		this.state = {};
	}

	render()
	{
		let props = this.props;

		return (
			<MuiThemeProvider muiTheme={muiTheme}>
				<div data-component='App'>
					<Notifier ref='Notifier'/>

					<Room
						peerId={props.peerId}
						roomId={props.roomId}
						onNotify={this.handleNotify.bind(this)}
						onHideNotification={this.handleHideNotification.bind(this)}
					/>
				</div>
			</MuiThemeProvider>
		);
	}

	handleNotify(data)
	{
		this.refs.Notifier.notify(data);
	}

	handleHideNotification(uid)
	{
		this.refs.Notifier.hideNotification(uid);
	}
}

App.propTypes =
{
	peerId : PropTypes.string.isRequired,
	roomId : PropTypes.string.isRequired
};

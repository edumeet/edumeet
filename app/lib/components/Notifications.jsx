import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import * as appPropTypes from './appPropTypes';
import * as stateActions from '../redux/stateActions';
import { Appear } from './transitions';

const Notifications = ({ notifications, onClick, toolAreaOpen }) =>
{
	return (
		<div
			data-component='Notifications'
			className={classnames({
				'toolarea-open' : toolAreaOpen
			})}
		>
			{
				notifications.map((notification) =>
				{
					return (
						<Appear key={notification.id} duration={250}>
							<div
								className={classnames('notification', notification.type)}
								onClick={() => onClick(notification.id)}
							>
								<div className='icon' />
								<p className='text'>{notification.text}</p>
							</div>
						</Appear>
					);
				})
			}
		</div>
	);
};

Notifications.propTypes =
{
	notifications : PropTypes.arrayOf(appPropTypes.Notification).isRequired,
	onClick       : PropTypes.func.isRequired,
	toolAreaOpen  : PropTypes.bool
};

const mapStateToProps = (state) =>
{
	const { notifications } = state;

	return {
		notifications,
		toolAreaOpen : state.toolarea.toolAreaOpen
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onClick : (notificationId) =>
		{
			dispatch(stateActions.removeNotification(notificationId));
		}
	};
};

const NotificationsContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Notifications);

export default NotificationsContainer;

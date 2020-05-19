import { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withSnackbar } from 'notistack';
import * as notificationActions from '../../actions/notificationActions';

const notificationPosition = window.config.notificationPosition || 'right';

class Notifications extends Component
{
	displayed = [];

	storeDisplayed = (id) =>
	{
		this.displayed = [ ...this.displayed, id ];
	};

	shouldComponentUpdate({ notifications: newNotifications = [] })
	{
		const { notifications: currentNotifications } = this.props;

		let notExists = false;

		for (let i = 0; i < newNotifications.length; i += 1)
		{
			if (notExists) continue;

			notExists = notExists ||
				!currentNotifications.filter(({ id }) => newNotifications[i].id === id).length;
		}

		return notExists;
	}

	componentDidUpdate()
	{
		const { notifications = [] } = this.props;

		notifications.forEach((notification) =>
		{
			// Do nothing if snackbar is already displayed
			if (this.displayed.includes(notification.id)) return;
			// Display snackbar using notistack
			this.props.enqueueSnackbar(notification.text,
				{
					variant          : notification.type,
					autoHideDuration : notification.timeout,
					anchorOrigin     : {
						vertical   : 'bottom',
						horizontal : notificationPosition
					}
				}
			);
			// Keep track of snackbars that we've displayed
			this.storeDisplayed(notification.id);
			// Dispatch action to remove snackbar from redux store
			this.props.removeNotification(notification.id);
		});
	}

	render()
	{
		return null;
	}
}

Notifications.propTypes =
{
	notifications      : PropTypes.array.isRequired,
	enqueueSnackbar    : PropTypes.func.isRequired,
	removeNotification : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
	({
		notifications : state.notifications
	});

const mapDispatchToProps = (dispatch) =>
	({
		removeNotification : (notificationId) =>
			dispatch(notificationActions.removeNotification({ notificationId }))
	});

export default withSnackbar(
	connect(
		mapStateToProps,
		mapDispatchToProps,
		null,
		{
			areStatesEqual : (next, prev) =>
			{
				return (
					prev.notifications === next.notifications
				);
			}
		}
	)(Notifications)
);

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Room from './Room';
import JoinDialog from './JoinDialog';
import Lobby from './Lobby';

const App = (props) =>
{
	const {
		room
	} = props;

	if (room.lockedOut)
	{
		return (
			<Lobby />
		);
	}
	else if (!room.joined)
	{
		return (
			<JoinDialog />
		);
	}
	else
	{
		return (
			<Room />
		);
	}
}

App.propTypes =
{
	room : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		room : state.room
	});

export default connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room === next.room
			);
		}
	}
)(App);
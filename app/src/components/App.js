import React, { useEffect, Suspense } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import JoinDialog from './JoinDialog';
import LoadingView from './LoadingView';
import { ReactLazyPreload } from './ReactLazyPreload';

const Room = ReactLazyPreload(() => import(/* webpackChunkName: "room" */ './Room'));

const App = (props) =>
{
	const {
		room
	} = props;

	useEffect(() =>
	{
		Room.preload();

		return;
	}, []);

	if (!room.joined)
	{
		return (
			<JoinDialog />
		);
	}
	else
	{
		return (
			<Suspense fallback={<LoadingView />}>
				<Room />
			</Suspense>
		);
	}
};

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
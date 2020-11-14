import React, { useEffect, Suspense } from 'react';
import { useParams } from 'react-router';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import JoinDialog from './JoinDialog';
import LoadingView from './Loader/LoadingView';
import { LazyPreload } from './Loader/LazyPreload';

const Room = LazyPreload(() => import(/* webpackChunkName: "room" */ './Room'));

const App = (props) =>
{
	const {
		room
	} = props;

	const id = useParams().id.toLowerCase();

	useEffect(() =>
	{
		Room.preload();

		return;
	}, []);

	if (!room.joined)
	{
		return (
			<JoinDialog roomId={id} />
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
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as stateActions from '../redux/stateActions';

class HiddenPeers extends Component
{
	state = {
		controlsVisible : false
	};

	handleMouseOver = () =>
	{
		this.setState({
			controlsVisible : true
		});
	};

	handleMouseOut = () =>
	{
		this.setState({
			controlsVisible : false
		});
	};

	render()
	{
		const {
			hiddenPeersCount,
			openUsersTab
		} = this.props;

		return (
			<div
				data-component='HiddenPeers'
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>
				<div data-component='HiddenPeersView'>
					<div className='view-container' onClick={() => openUsersTab()}>
						<p>+{hiddenPeersCount} <br /> participant
							{(hiddenPeersCount === 1) ? null : 's'}
						</p>
					</div>
				</div>
			</div>
		);
	}
}

HiddenPeers.propTypes =
{
	hiddenPeersCount : PropTypes.number,
	openUsersTab     : PropTypes.func.isRequired
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		openUsersTab : () =>
		{
			dispatch(stateActions.openToolArea());
			dispatch(stateActions.setToolTab('users'));
		}
	};
};

const HiddenPeersContainer = connect(
	null,
	mapDispatchToProps
)(HiddenPeers);

export default HiddenPeersContainer;

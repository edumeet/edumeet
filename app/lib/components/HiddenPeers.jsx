import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as stateActions from '../redux/stateActions';

class HiddenPeers extends Component
{
	constructor(props)
	{
		super(props);
		this.state = { className: '' };
	}

	componentDidUpdate(prevProps)
	{
		const { hiddenPeersCount } = this.props;

		if (hiddenPeersCount !== prevProps.hiddenPeersCount)
		{
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ className: 'pulse' }, () =>
			{
				if (this.timeout)
				{
					clearTimeout(this.timeout);
				}

				this.timeout = setTimeout(() =>
				{
					this.setState({ className: '' });
				}, 2000);
			});
		}
	}

	render()
	{
		const {
			hiddenPeersCount,
			openUsersTab
		} = this.props;

		return (
			<div
				data-component='HiddenPeers'
				className={this.state.className}
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>
				<div data-component='HiddenPeersView'>
					<div className={classnames('view-container', this.state.className)} onClick={() => openUsersTab()}>
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

import React from 'react';
import { connect } from 'react-redux';
import * as appPropTypes from '../appPropTypes';
import * as requestActions from '../../redux/requestActions';
import * as stateActions from '../../redux/stateActions';
import PropTypes from 'prop-types';
import ListPeer from './ListPeer';

class ParticipantList extends React.Component
{
	constructor(props)
	{
		super(props);
	}

	render()
	{
		const {
			advancedMode,
			peers
		} = this.props;

		return (
			<div data-component='ParticipantList'>
				<ul className='list'>
					{
						peers.map((peer) =>
						{
							return (
								<li key={peer.name} className='list-item'>
									<ListPeer name={peer.name} advancedMode={advancedMode} />
								</li>
							);
						})
					}
				</ul>
			</div>
		);
	}
}

ParticipantList.propTypes =
{
	advancedMode : PropTypes.bool,
	peers        : PropTypes.arrayOf(appPropTypes.Peer).isRequired
};

const mapStateToProps = (state) =>
{
	const peersArray = Object.values(state.peers);

	return {
		peers : peersArray
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		handleChangeWebcam : (device) =>
		{
			dispatch(requestActions.changeWebcam(device.value));
		},
		handleChangeAudioDevice : (device) =>
		{
			dispatch(requestActions.changeAudioDevice(device.value));
		},
		onToggleAdvancedMode : () =>
		{
			dispatch(stateActions.toggleAdvancedMode());
		}
	};
};

const ParticipantListContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(ParticipantList);

export default ParticipantListContainer;

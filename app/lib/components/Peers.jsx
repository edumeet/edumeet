import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import * as stateActions from '../redux/stateActions';
import { Appear } from './transitions';
import Peer from './Peer';

class Peers extends React.Component
{
	constructor()
	{
		super();
		this.state = {
			ratio : 1.334
		};
	}
	updateDimensions()
	{
		const n = this.props.peers.length;

		if (n == 0)
		{
			return;
		}

		const width = this.refs.peers.clientWidth;
		const height = this.refs.peers.clientHeight;

		let x, y, space;

		for (let rows = 1; rows < 100; rows = rows + 1)
		{
			x = width / Math.ceil(n / rows);
			y = x / this.state.ratio;
			if (height < (y * rows))
			{
				y = height / rows;
				x = this.state.ratio * y;
				break;
			}
			space = height - (y * (rows));
			if (space < y)
			{
				break;
			}
		}
		if (Math.ceil(this.props.peerWidth) !== Math.ceil(0.9 * x))
		{
			this.props.onComponentResize(0.9 * x, 0.9 * y);
		}
	}

	componentDidMount()
	{
		window.addEventListener('resize', this.updateDimensions.bind(this));
	}

	componentWillUnmount()
	{
		window.removeEventListener('resize', this.updateDimensions.bind(this));
	}

	render()
	{
		const {
			activeSpeakerName,
			peers,
			peerWidth,
			peerHeight
		} = this.props;

		const style =
			{
				'width'  : peerWidth,
				'height' : peerHeight
			};

		this.updateDimensions();

		return (
			<div data-component='Peers' ref='peers'>
				{
					peers.map((peer) =>
					{
						return (
							<Appear key={peer.name} duration={1000}>
								<div
									className={classnames('peer-container', {
										'active-speaker' : peer.name === activeSpeakerName
									})} style={style}
								>
									<Peer name={peer.name} />
								</div>
							</Appear>
						);
					})
				}
			</div>
		);
	}
}

Peers.propTypes =
{
	peers             : PropTypes.arrayOf(appPropTypes.Peer).isRequired,
	activeSpeakerName : PropTypes.string,
	peerHeight        : PropTypes.number,
	peerWidth         : PropTypes.number,
	onComponentResize : PropTypes.func.isRequired
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onComponentResize : (peerWidth, peerHeight) =>
		{
			dispatch(stateActions.onComponentResize(peerWidth, peerHeight));
		}
	};
};

const mapStateToProps = (state) =>
{
	// TODO: This is not OK since it's creating a new array every time, so triggering a
	// component rendering.
	const peersArray = Object.values(state.peers);

	return {
		peers             : peersArray,
		activeSpeakerName : state.room.activeSpeakerName,
		peerHeight        : state.room.peerHeight,
		peerWidth         : state.room.peerWidth
	};
};

const PeersContainer = connect(
	mapStateToProps,
	mapDispatchToProps
)(Peers);

export default PeersContainer;

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import { Appear } from './transitions';
import Peer from './Peer';

class Peers extends React.Component
{
	constructor()
	{
		super();
		this.state = {
			peerWidth  : 400,
			peerHeight : 300,
			ratio      : 1.334
		};
	}

	resizeUpdate()
	{
		this.updateDimensions();
	}

	updateDimensions(props = this.props)
	{
		const n = props.peers ? props.peers.length : 0;

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
		if (Math.ceil(this.state.peerWidth) !== Math.ceil(0.9 * x))
		{
			this.setState({
				peerWidth  : 0.9 * x,
				peerHeight : 0.9 * y
			});
		}
	}

	componentDidMount()
	{
		window.addEventListener('resize', this.resizeUpdate.bind(this));
	}

	componentWillUnmount()
	{
		window.removeEventListener('resize', this.resizeUpdate.bind(this));
	}

	componentWillReceiveProps(nextProps)
	{
		if (nextProps.peers)
			this.updateDimensions(nextProps);
	}

	render()
	{
		const {
			activeSpeakerName,
			peers
		} = this.props;

		const style =
			{
				'width'  : this.state.peerWidth,
				'height' : this.state.peerHeight
			};

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
	activeSpeakerName : PropTypes.string
};

const mapStateToProps = (state) =>
{
	const peersArray = Object.values(state.peers);

	return {
		peers             : peersArray,
		activeSpeakerName : state.room.activeSpeakerName
	};
};

const PeersContainer = connect(
	mapStateToProps
)(Peers);

export default PeersContainer;

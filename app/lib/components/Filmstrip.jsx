import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ResizeObserver from 'resize-observer-polyfill';
import { connect } from 'react-redux';
import classnames from 'classnames';
import Peer from './Peer';

class Filmstrip extends Component
{
	constructor(props)
	{
		super(props);

		this.activePeerContainer = React.createRef();
	}

	state = {
		selectedPeerName : null,
		width            : 400
	};

	// Find the name of the peer which is currently speaking. This is either
	// the latest active speaker, or the manually selected peer.
	getActivePeerName = () =>
		this.state.selectedPeerName || this.props.activeSpeakerName;

	isSharingCamera = (peerName) => this.props.peers[peerName] &&
		this.props.peers[peerName].consumers.some((consumer) =>
			this.props.consumers[consumer].source === 'screen');

	getRatio = () =>
	{
		let ratio = 4 / 3;

		if (this.isSharingCamera(this.getActivePeerName())) 
		{
			ratio *= 2;
		}

		return ratio;
	};

	updateDimensions = () =>
	{
		const container = this.activePeerContainer.current;

		if (container)
		{
			const ratio = this.getRatio();

			let width = container.clientWidth;

			if (width / ratio > container.clientHeight) 
			{
				width = container.clientHeight * ratio;
			}
			
			this.setState({
				width
			});
		}
	};

	componentDidMount()
	{
		this.updateDimensions();
	}

	componentDidMount()
	{
		window.addEventListener('resize', this.updateDimensions);
		const observer = new ResizeObserver(this.updateDimensions);

		observer.observe(this.activePeerContainer.current);
	}

	componentWillUnmount()
	{
		window.removeEventListener('resize', this.updateDimensions);
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps !== this.props)
		{
			this.updateDimensions();
		}
	}

	handleSelectPeer = (selectedPeerName) =>
	{
		this.setState((oldState) => ({
			selectedPeerName : oldState.selectedPeerName === selectedPeerName ?
				null : selectedPeerName
		}));
	};

	render()
	{
		const { activeSpeakerName, peers, advancedMode } = this.props;

		const activePeerName = this.getActivePeerName();

		return (
			<div data-component='Filmstrip'>
				<div className='active-peer-container' ref={this.activePeerContainer}>
					{peers[activePeerName] && (
						<div
							className='active-peer'
							style={{ width: this.state.width, height: this.state.width / this.getRatio() }}
						>
							<Peer
								advancedMode={advancedMode}
								name={activePeerName}
							/>
						</div>
					)}
				</div>

				<div className='filmstrip'>
					<div className='filmstrip-content'>
						{Object.keys(peers).map((peerName) => (
							<div
								key={peerName}
								onClick={() => this.handleSelectPeer(peerName)}
								className={classnames('film', {
									selected : this.state.selectedPeerName === peerName,
									active   : activeSpeakerName === peerName
								})}
							>
								<div className='film-content'>
									<Peer
										advancedMode={advancedMode}
										name={peerName}
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}
}

Filmstrip.propTypes = {
	activeSpeakerName : PropTypes.string,
	advancedMode      : PropTypes.bool,
	peers             : PropTypes.object.isRequired,
	consumers         : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
	({
		activeSpeakerName : state.room.activeSpeakerName,
		peers             : state.peers,
		consumers         : state.consumers
	});

export default connect(
	mapStateToProps
)(Filmstrip);

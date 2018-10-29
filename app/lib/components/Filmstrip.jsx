import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ResizeObserver from 'resize-observer-polyfill';
import { connect } from 'react-redux';
import debounce from 'lodash/debounce';
import classnames from 'classnames';
import * as stateActions from '../redux/stateActions';
import Peer from './Peer';
import HiddenPeers from './HiddenPeers';

class Filmstrip extends Component
{
	constructor(props)
	{
		super(props);

		this.activePeerContainer = React.createRef();
	}

	state = {
		lastSpeaker : null,
		width       : 400
	};

	// Find the name of the peer which is currently speaking. This is either
	// the latest active speaker, or the manually selected peer, or, if no
	// person has spoken yet, the first peer in the list of peers.
	getActivePeerName = () =>
	{
		if (this.props.selectedPeerName)
		{
			return this.props.selectedPeerName;
		}

		if (this.state.lastSpeaker)
		{
			return this.state.lastSpeaker;
		}

		const peerNames = Object.keys(this.props.peers);

		if (peerNames.length > 0)
		{
			return peerNames[0];
		}
	};

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

	updateDimensions = debounce(() =>
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
	}, 200);

	componentDidMount()
	{
		window.addEventListener('resize', this.updateDimensions);
		const observer = new ResizeObserver(this.updateDimensions);

		observer.observe(this.activePeerContainer.current);
		this.updateDimensions();
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

			if (this.props.activeSpeakerName !== this.props.myName)
			{
				// eslint-disable-next-line react/no-did-update-set-state
				this.setState({
					lastSpeaker : this.props.activeSpeakerName
				});
			}
		}
	}

	render()
	{
		const { peers, advancedMode, lastN, lastNLength } = this.props;

		const activePeerName = this.getActivePeerName();

		return (
			<div data-component='Filmstrip'>
				<div className='active-peer-container' ref={this.activePeerContainer}>
					{peers[activePeerName] && (
						<div
							className='active-peer'
							style={{
								width  : this.state.width,
								height : this.state.width / this.getRatio()
							}}
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
						{
							Object.keys(peers).map((peerName) =>
							{
								return (
									lastN.find((lastNElement) => lastNElement === peerName)?
										<div
											key={peerName}
											onClick={() => this.props.setSelectedPeer(peerName)}
											className={classnames('film', {
												selected : this.props.selectedPeerName === peerName,
												active   : this.state.lastSpeaker === peerName
											})}
										>
											<div className='film-content'>
												<Peer
													advancedMode={advancedMode}
													name={peerName}
												/>
											</div>
										</div>
										:null
								);
							})
						}
					</div>
				</div>
				<div className='hidden-peer-container'>
					{ (lastNLength<Object.keys(peers).length)?
						<HiddenPeers
							lastNLength={Object.keys(peers).length-lastNLength}
						/>:null
					}
				</div>

			</div>
		);
	}
}

Filmstrip.propTypes = {
	activeSpeakerName : PropTypes.string,
	advancedMode      : PropTypes.bool,
	peers             : PropTypes.object.isRequired,
	consumers         : PropTypes.object.isRequired,
	myName            : PropTypes.string.isRequired,
	selectedPeerName  : PropTypes.string,
	setSelectedPeer   : PropTypes.func.isRequired,
	lastNLength       : PropTypes.number,
	lastN             : PropTypes.array.isRequired
};

const mapStateToProps = (state) =>
{
	const lastNLength = state.room.lastN ? state.room.lastN.length : 0;

	return {
		activeSpeakerName : state.room.activeSpeakerName,
		selectedPeerName  : state.room.selectedPeerName,
		peers             : state.peers,
		consumers         : state.consumers,
		myName            : state.me.name,
		lastN             : state.room.lastN,
		lastNLength
	};
};

const mapDispatchToProps = {
	setSelectedPeer : stateActions.setSelectedPeer
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Filmstrip);

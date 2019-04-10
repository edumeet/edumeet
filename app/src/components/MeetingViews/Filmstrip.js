import React from 'react';
import PropTypes from 'prop-types';
import ResizeObserver from 'resize-observer-polyfill';
import { connect } from 'react-redux';
import debounce from 'lodash/debounce';
import { withStyles } from '@material-ui/core/styles';
import classnames from 'classnames';
import { withRoomContext } from '../../RoomContext';
import Peer from '../Containers/Peer';
import HiddenPeers from '../Containers/HiddenPeers';

const styles = () =>
	({
		root :
		{
			display       : 'flex',
			flexDirection : 'column',
			alignItems    : 'center',
			height        : '100%',
			width         : '100%'
		},
		activePeerContainer :
		{
			width          : '100%',
			height         : '80vh',
			display        : 'flex',
			justifyContent : 'center',
			alignItems     : 'center'
		},
		activePeer :
		{
			width     : '100%',
			border    : '5px solid rgba(255, 255, 255, 0.15)',
			boxShadow : '0px 5px 12px 2px rgba(17, 17, 17, 0.5)',
			marginTop : 60
		},
		filmStrip :
		{
			display    : 'flex',
			background : 'rgba(0, 0, 0 , 0.5)',
			width      : '100%',
			overflowX  : 'auto',
			height     : '20vh',
			alignItems : 'center'
		},
		filmStripContent :
		{
			margin     : '0 auto',
			display    : 'flex',
			height     : '100%',
			alignItems : 'center'
		},
		film :
		{
			height      : '18vh',
			flexShrink  : 0,
			paddingLeft : '1vh',
			'& .active' :
			{
				borderColor : 'var(--active-speaker-border-color)'
			},
			'&.selected' :
			{
				borderColor : 'var(--selected-peer-border-color)'
			},
			'&:last-child' :
			{
				paddingRight : '1vh'
			}
		},
		filmContent :
		{
			height      : '100%',
			width       : '100%',
			border      : '1px solid rgba(255,255,255,0.15)',
			maxWidth    : 'calc(18vh * (4 / 3))',
			cursor      : 'pointer',
			'& .screen' :
			{
				maxWidth : 'calc(18vh * (2 * 4 / 3))',
				border   : 0
			}
		},
		hiddenPeers :
		{

		}
	});

class Filmstrip extends React.PureComponent
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

			if (width / ratio > (container.clientHeight - 100))
			{
				width = (container.clientHeight - 100) * ratio;
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
		const {
			roomClient,
			peers,
			advancedMode,
			spotlights,
			spotlightsLength,
			classes
		} = this.props;

		const activePeerName = this.getActivePeerName();

		return (
			<div className={classes.root}>
				<div className={classes.activePeerContainer} ref={this.activePeerContainer}>
					{ peers[activePeerName] ?
						<div
							className={classes.activePeer}
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
						:null
					}
				</div>

				<div className={classes.filmStrip}>
					<div className={classes.filmStripContent}>
						{ Object.keys(peers).map((peerName) =>
						{
							if (spotlights.find((spotlightsElement) => spotlightsElement === peerName))
							{
								return (
									<div
										key={peerName}
										onClick={() => roomClient.setSelectedPeer(peerName)}
										className={classnames(classes.film, {
											selected : this.props.selectedPeerName === peerName,
											active   : this.state.lastSpeaker === peerName
										})}
									>
										<div className={classes.filmContent}>
											<Peer
												advancedMode={advancedMode}
												name={peerName}
											/>
										</div>
									</div>
								);
							}
							else
							{
								return ('');
							}
						})}
					</div>
				</div>
				{/* <div className={classes.hiddenPeers}>
					{ spotlightsLength<Object.keys(peers).length ?
						<HiddenPeers
							hiddenPeersCount={Object.keys(peers).length-spotlightsLength}
						/>
						:null
					}
				</div> */}

			</div>
		);
	}
}

Filmstrip.propTypes = {
	roomClient        : PropTypes.any.isRequired,
	activeSpeakerName : PropTypes.string,
	advancedMode      : PropTypes.bool,
	peers             : PropTypes.object.isRequired,
	consumers         : PropTypes.object.isRequired,
	myName            : PropTypes.string.isRequired,
	selectedPeerName  : PropTypes.string,
	spotlightsLength  : PropTypes.number,
	spotlights        : PropTypes.array.isRequired,
	classes           : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	const spotlightsLength = state.room.spotlights ? state.room.spotlights.length : 0;

	return {
		activeSpeakerName : state.room.activeSpeakerName,
		selectedPeerName  : state.room.selectedPeerName,
		peers             : state.peers,
		consumers         : state.consumers,
		myName            : state.me.name,
		spotlights        : state.room.spotlights,
		spotlightsLength
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	undefined
)(withStyles(styles)(Filmstrip)));
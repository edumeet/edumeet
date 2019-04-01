import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import debounce from 'lodash/debounce';
import { withStyles } from '@material-ui/core/styles';
import Peer from '../Containers/Peer';
import Me from '../Containers/Me';
import HiddenPeers from '../Containers/HiddenPeers';
import ResizeObserver from 'resize-observer-polyfill';

const RATIO = 1.334;
const PADDING = 60;

const styles = () =>
	({
		root :
		{
			width          : '100%',
			height         : '100%',
			display        : 'flex',
			flexDirection  : 'row',
			flexWrap       : 'wrap',
			justifyContent : 'center',
			alignItems     : 'center',
			alignContent   : 'center',
			paddingTop     : 30,
			paddingBottom  : 30
		},
		peerContainer :
		{
			overflow           : 'hidden',
			flex               : '0 0 auto',
			margin             : 6,
			boxShadow          : 'var(--peer-shadow)',
			border             : 'var(--peer-border)',
			transitionProperty : 'border-color',
			'&.active-speaker' :
			{
				borderColor : 'var(--active-speaker-border-color)'
			},
			'&.selected' :
			{
				borderColor : 'var(--selected-peer-border-color)'
			}
		}
	});

class Democratic extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this.state = {
			peerWidth  : 400,
			peerHeight : 300
		};

		this.peersRef = React.createRef();
	}

	updateDimensions = debounce(() =>
	{
		if (!this.peersRef.current)
		{
			return;
		}

		const n = this.props.boxes;

		if (n === 0)
		{
			return;
		}

		const width = this.peersRef.current.clientWidth;
		const height = this.peersRef.current.clientHeight - PADDING;

		let x, y, space;

		for (let rows = 1; rows < 100; rows = rows + 1)
		{
			x = width / Math.ceil(n / rows);
			y = x / RATIO;
			if (height < (y * rows))
			{
				y = height / rows;
				x = RATIO * y;
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
	}, 200);

	componentDidMount()
	{
		window.addEventListener('resize', this.updateDimensions);
		const observer = new ResizeObserver(this.updateDimensions);

		observer.observe(this.peersRef.current);
	}

	componentWillUnmount()
	{
		window.removeEventListener('resize', this.updateDimensions);
	}

	componentDidUpdate()
	{
		this.updateDimensions();
	}

	render()
	{
		const {
			advancedMode,
			activeSpeakerName,
			amActiveSpeaker,
			peers,
			spotlights,
			spotlightsLength,
			classes
		} = this.props;

		const style =
		{
			'width'  : this.state.peerWidth,
			'height' : this.state.peerHeight
		};

		return (
			<div className={classes.root} ref={this.peersRef}>
				<div
					className={classnames(classes.peerContainer, 'me-handle', {
						'active-speaker' : amActiveSpeaker
					})}
				>
					<Me
						advancedMode={advancedMode}
						style={style}
					/>
				</div>
				{ Object.keys(peers).map((peerName) =>
				{
					if (spotlights.find((spotlightsElement) => spotlightsElement === peerName))
					{
						return (
							<div
								key={peerName}
								className={classnames(classes.peerContainer, {
									'selected'       : this.props.selectedPeerName === peerName,
									'active-speaker' : peerName === activeSpeakerName
								})}
							>
								<Peer
									advancedMode={advancedMode}
									name={peerName}
									style={style}
								/>
							</div>
						);
					}
					else
					{
						return ('');
					}
				})}
				{ spotlightsLength < Object.keys(peers).length ?
					<HiddenPeers
						hiddenPeersCount={Object.keys(peers).length - spotlightsLength}
					/>
					:null
				}
			</div>
		);
	}
}

Democratic.propTypes =
	{
		advancedMode      : PropTypes.bool,
		peers             : PropTypes.object.isRequired,
		boxes             : PropTypes.number,
		amActiveSpeaker   : PropTypes.bool.isRequired,
		activeSpeakerName : PropTypes.string,
		selectedPeerName  : PropTypes.string,
		spotlightsLength  : PropTypes.number,
		spotlights        : PropTypes.array.isRequired,
		classes           : PropTypes.object.isRequired
	};

const mapStateToProps = (state) =>
{
	const spotlights = state.room.spotlights;
	const spotlightsLength = spotlights ? state.room.spotlights.length : 0;
	const boxes = spotlightsLength + Object.values(state.consumers)
		.filter((consumer) => consumer.source === 'screen').length + Object.values(state.producers)
		.filter((producer) => producer.source === 'screen').length + 1;

	return {
		peers             : state.peers,
		boxes,
		activeSpeakerName : state.room.activeSpeakerName,
		selectedPeerName  : state.room.selectedPeerName,
		amActiveSpeaker   : state.me.name === state.room.activeSpeakerName,
		spotlights,
		spotlightsLength
	};
};

export default connect(
	mapStateToProps
)(withStyles(styles)(Democratic));

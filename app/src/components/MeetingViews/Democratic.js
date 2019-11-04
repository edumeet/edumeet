import React from 'react';
import { connect } from 'react-redux';
import {
	spotlightPeersSelector,
	peersLengthSelector,
	videoBoxesSelector,
	spotlightsLengthSelector
} from '../Selectors';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Peer from '../Containers/Peer';
import Me from '../Containers/Me';
import HiddenPeers from '../Containers/HiddenPeers';

const RATIO = 1.334;
const PADDING_V = 50;
const PADDING_H = 0;

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
			alignContent   : 'center'
		},
		hiddenToolBar :
		{
			paddingTop : 0,
			transition : 'padding .5s'
		},
		showingToolBar :
		{
			paddingTop : 60,
			transition : 'padding .5s'
		}
	});

class Democratic extends React.PureComponent
{
	constructor(props)
	{
		super(props);

		this.state = {};

		this.resizeTimeout = null;

		this.peersRef = React.createRef();
	}

	updateDimensions = () =>
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

		const width = this.peersRef.current.clientWidth - PADDING_H;
		const height = this.peersRef.current.clientHeight -
			(this.props.toolbarsVisible ? PADDING_V : PADDING_H);

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
				peerWidth  : 0.95 * x,
				peerHeight : 0.95 * y
			});
		}
	};

	componentDidMount()
	{
		// window.resize event listener
		window.addEventListener('resize', () =>
		{
			// clear the timeout
			clearTimeout(this.resizeTimeout);

			// start timing for event "completion"
			this.resizeTimeout = setTimeout(() => this.updateDimensions(), 250);
		});

		this.updateDimensions();
	}

	componentWillUnmount()
	{
		window.removeEventListener('resize', this.updateDimensions);
	}

	componentDidUpdate(prevProps)
	{
		if (prevProps !== this.props)
			this.updateDimensions();
	}

	render()
	{
		const {
			advancedMode,
			peersLength,
			spotlightsPeers,
			spotlightsLength,
			toolbarsVisible,
			classes
		} = this.props;

		const style =
		{
			'width'  : this.state.peerWidth ? this.state.peerWidth : 0,
			'height' : this.state.peerHeight ? this.state.peerHeight : 0
		};

		return (
			<div
				className={classnames(
					classes.root,
					toolbarsVisible ? classes.showingToolBar : classes.hiddenToolBar
				)}
				ref={this.peersRef}
			>
				<Me
					advancedMode={advancedMode}
					spacing={6}
					style={style}
				/>
				{ spotlightsPeers.map((peer) =>
				{
					return (
						<Peer
							key={peer.id}
							advancedMode={advancedMode}
							id={peer.id}
							spacing={6}
							style={style}
						/>
					);
				})}
				{ spotlightsLength < peersLength &&
					<HiddenPeers
						hiddenPeersCount={peersLength - spotlightsLength}
					/>
				}
			</div>
		);
	}
}

Democratic.propTypes =
{
	advancedMode     : PropTypes.bool,
	peersLength      : PropTypes.number,
	boxes            : PropTypes.number,
	spotlightsLength : PropTypes.number,
	spotlightsPeers  : PropTypes.array.isRequired,
	toolbarsVisible  : PropTypes.bool.isRequired,
	classes          : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		peersLength      : peersLengthSelector(state),
		boxes            : videoBoxesSelector(state),
		spotlightsPeers  : spotlightPeersSelector(state),
		spotlightsLength : spotlightsLengthSelector(state),
		toolbarsVisible  : state.room.toolbarsVisible
	};
};

export default connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.peers === next.peers &&
				prev.producers === next.producers &&
				prev.consumers === next.consumers &&
				prev.room.spotlights === next.room.spotlights &&
				prev.room.toolbarsVisible === next.room.toolbarsVisible
			);
		}
	}
)(withStyles(styles)(Democratic));

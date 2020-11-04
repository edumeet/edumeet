import React from 'react';
import { connect } from 'react-redux';
import {
	spotlightPeersSelector,
	videoBoxesSelector
} from '../Selectors';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Peer from '../Containers/Peer';
import Me from '../Containers/Me';

const PADDING_V = 64;
const PADDING_H = 50;

const FILL_RATE = 0.95;

const styles = (theme) =>
	({
		root :
		{
			width          : '100%',
			height         : '100%',
			display        : 'flex',
			flexDirection  : 'row',
			flexWrap       : 'wrap',
			overflow       : 'hidden',
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
			paddingTop : PADDING_V,
			transition : 'padding .5s'
		},
		buttonControlBar :
		{
			paddingLeft                    : PADDING_H,
			[theme.breakpoints.down('sm')] :
			{
				paddingLeft : 0
			}
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
		const {
			boxes,
			aspectRatio,
			buttonControlBar,
			permanentTopBar,
			toolbarsVisible
		} = this.props;

		const {
			current
		} = this.peersRef;

		if (!current)
			return;

		if (boxes === 0)
			return;

		const n = boxes;

		const width =
			current.clientWidth - (buttonControlBar ? PADDING_H : 0);
		const height =
			current.clientHeight - (toolbarsVisible || permanentTopBar ? PADDING_V : 0);

		let x, y, space;

		for (let rows = 1; rows <= boxes; rows = rows + 1)
		{
			x = width / Math.ceil(n / rows);
			y = x / aspectRatio;

			if (height < (y * rows))
			{
				y = height / rows;
				x = aspectRatio * y;

				break;
			}

			space = height - (y * (rows));

			if (space < y)
				break;
		}

		if (
			Math.ceil(this.state.peerWidth) !== Math.ceil(FILL_RATE * x) ||
			Math.ceil(this.state.peerHeight) !== Math.ceil(FILL_RATE * y)
		)
		{
			this.setState({
				peerWidth  : FILL_RATE * x,
				peerHeight : FILL_RATE * y
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
			spotlightsPeers,
			toolbarsVisible,
			permanentTopBar,
			buttonControlBar,
			hideSelfView,
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
					toolbarsVisible || permanentTopBar ?
						classes.showingToolBar : classes.hiddenToolBar,
					buttonControlBar ? classes.buttonControlBar : null
				)}
				ref={this.peersRef}
			>
				{ !hideSelfView &&
				<Me
					advancedMode={advancedMode}
					spacing={6}
					style={style}
				/>
				}
				{ spotlightsPeers.map((peer) =>
				{
					return (
						<Peer
							key={peer}
							advancedMode={advancedMode}
							id={peer}
							spacing={6}
							style={style}
						/>
					);
				})}
			</div>
		);
	}
}

Democratic.propTypes =
{
	advancedMode     : PropTypes.bool,
	boxes            : PropTypes.number,
	spotlightsPeers  : PropTypes.array.isRequired,
	toolbarsVisible  : PropTypes.bool.isRequired,
	hideSelfView     : PropTypes.bool.isRequired,
	permanentTopBar  : PropTypes.bool.isRequired,
	buttonControlBar : PropTypes.bool.isRequired,
	toolAreaOpen     : PropTypes.bool.isRequired,
	aspectRatio      : PropTypes.number.isRequired,
	classes          : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		boxes            : videoBoxesSelector(state),
		spotlightsPeers  : spotlightPeersSelector(state),
		toolbarsVisible  : state.room.toolbarsVisible,
		hideSelfView     : state.room.hideSelfView,
		permanentTopBar  : state.settings.permanentTopBar,
		buttonControlBar : state.settings.buttonControlBar,
		toolAreaOpen     : state.toolarea.toolAreaOpen,
		aspectRatio      : state.settings.aspectRatio
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
				prev.room.toolbarsVisible === next.room.toolbarsVisible &&
				prev.room.hideSelfView === next.room.hideSelfView &&
				prev.settings.permanentTopBar === next.settings.permanentTopBar &&
				prev.settings.buttonControlBar === next.settings.buttonControlBar &&
				prev.settings.aspectRatio === next.settings.aspectRatio &&
				prev.toolarea.toolAreaOpen === next.toolarea.toolAreaOpen
			);
		}
	}
)(withStyles(styles, { withTheme: true })(Democratic));

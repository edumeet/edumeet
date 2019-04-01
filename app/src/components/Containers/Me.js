import React from 'react';
import { connect } from 'react-redux';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import ReactTooltip from 'react-tooltip';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getDeviceInfo } from 'mediasoup-client';
import * as appPropTypes from '../appPropTypes';
import PeerView from '../VideoContainers/PeerView';
import ScreenView from '../VideoContainers/ScreenView';

const styles = () =>
	({
		root :
		{
			display       : 'flex',
			flexDirection : 'row',
			flex          : '100 100 auto',
			position      : 'relative'
		},
		viewContainer :
		{
			position   : 'relative',
			width      : 'var(--me-width)',
			height     : 'var(--me-height)',
			'&.webcam' :
			{
				order : 2
			},
			'&.screen' :
			{
				order : 1
			}
		}
	});

class Me extends React.PureComponent
{
	state = {
		controlsVisible : false
	};

	handleMouseOver = () =>
	{
		this.setState({
			controlsVisible : true
		});
	};

	handleMouseOut = () =>
	{
		this.setState({
			controlsVisible : false
		});
	};

	constructor(props)
	{
		super(props);

		this._mounted = false;
		this._rootNode = null;
		this._tooltip = true;

		// TODO: Issue when using react-tooltip in Edge:
		//   https://github.com/wwayne/react-tooltip/issues/328
		if (getDeviceInfo().flag === 'msedge')
			this._tooltip = false;
	}

	render()
	{
		const {
			roomClient,
			me,
			style,
			advancedMode,
			micProducer,
			webcamProducer,
			screenProducer,
			classes
		} = this.props;

		const videoVisible = (
			Boolean(webcamProducer) &&
			!webcamProducer.locallyPaused &&
			!webcamProducer.remotelyPaused
		);

		const screenVisible = (
			Boolean(screenProducer) &&
			!screenProducer.locallyPaused &&
			!screenProducer.remotelyPaused
		);

		let tip;

		if (!me.displayNameSet)
			tip = 'Click on your name to change it';

		return (
			<div
				className={classes.root}
				ref={(node) => (this._rootNode = node)}
				data-tip={tip}
				data-tip-disable={!tip}
				data-type='dark'
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>
				<div className={classnames(classes.viewContainer, 'webcam')} style={style}>
					<PeerView
						isMe
						advancedMode={advancedMode}
						peer={me}
						audioTrack={micProducer ? micProducer.track : null}
						volume={micProducer ? micProducer.volume : null}
						videoTrack={webcamProducer ? webcamProducer.track : null}
						videoVisible={videoVisible}
						audioCodec={micProducer ? micProducer.codec : null}
						videoCodec={webcamProducer ? webcamProducer.codec : null}
						onChangeDisplayName={(displayName) =>
						{
							roomClient.changeDisplayName(displayName);
						}}
					/>
				</div>

				{ screenProducer ?
					<div className={classnames(classes.viewContainer, 'screen')} style={style}>
						<ScreenView
							isMe
							advancedMode={advancedMode}
							screenTrack={screenProducer ? screenProducer.track : null}
							screenVisible={screenVisible}
							screenCodec={screenProducer ? screenProducer.codec : null}
						/>
					</div>
					:null
				}
			</div>
		);
	}

	componentDidMount()
	{
		this._mounted = true;

		if (this._tooltip)
		{
			setTimeout(() =>
			{
				if (!this._mounted || this.props.me.displayNameSet)
					return;

				ReactTooltip.show(this._rootNode);
			}, 4000);
		}
	}

	componentWillUnmount()
	{
		this._mounted = false;
	}

	componentWillReceiveProps(nextProps)
	{
		if (this._tooltip)
		{
			if (nextProps.me.displayNameSet)
				ReactTooltip.hide(this._rootNode);
		}
	}
}

Me.propTypes =
{
	roomClient     : PropTypes.any.isRequired,
	connected      : PropTypes.bool.isRequired,
	advancedMode   : PropTypes.bool,
	me             : appPropTypes.Me.isRequired,
	micProducer    : appPropTypes.Producer,
	webcamProducer : appPropTypes.Producer,
	screenProducer : appPropTypes.Producer,
	style          : PropTypes.object,
	classes        : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	const producersArray = Object.values(state.producers);
	const micProducer =
		producersArray.find((producer) => producer.source === 'mic');
	const webcamProducer =
		producersArray.find((producer) => producer.source === 'webcam');
	const screenProducer =
		producersArray.find((producer) => producer.source === 'screen');

	return {
		connected      : state.room.state === 'connected',
		me             : state.me,
		micProducer    : micProducer,
		webcamProducer : webcamProducer,
		screenProducer : screenProducer
	};
};

export default withRoomContext(connect(
	mapStateToProps,
	null
)(withStyles(styles)(Me)));

import React from 'react';
import { connect } from 'react-redux';
import ReactTooltip from 'react-tooltip';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getDeviceInfo } from 'mediasoup-client';
import * as appPropTypes from './appPropTypes';
import { withRoomContext } from '../RoomContext';
import PeerView from './PeerView';
import ScreenView from './ScreenView';

class Me extends React.Component
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
			connected,
			me,
			advancedMode,
			micProducer,
			webcamProducer,
			screenProducer
		} = this.props;

		let micState;

		if (!me.canSendMic)
			micState = 'unsupported';
		else if (!micProducer)
			micState = 'unsupported';
		else if (!micProducer.locallyPaused && !micProducer.remotelyPaused)
			micState = 'on';
		else
			micState = 'off';

		let webcamState;

		if (!me.canSendWebcam)
			webcamState = 'unsupported';
		else if (webcamProducer)
			webcamState = 'on';
		else
			webcamState = 'off';

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
				data-component='Me'
				ref={(node) => (this._rootNode = node)}
				data-tip={tip}
				data-tip-disable={!tip}
				data-type='dark'
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>
				<div className={classnames('view-container', 'webcam')}>
					<If condition={connected}>
						<div className={classnames('controls', 'visible')}>
							<div
								data-tip='keyboard shortcut: &lsquo;m&lsquo;'
								data-type='dark'
								data-place='bottom'
								data-for='me'
								className={classnames('button', 'mic', micState, {
									disabled : me.audioInProgress,
									visible  : micState == 'off' || this.state.controlsVisible
								})}
								onClick={() =>
								{
									micState === 'on' ?
										roomClient.muteMic() :
										roomClient.unmuteMic();
								}}
							/>
							<ReactTooltip
								id='me'
								effect='solid'
							/>
							<div
								className={classnames('button', 'webcam', webcamState, {
									disabled : me.webcamInProgress,
									visible  : webcamState == 'off' || this.state.controlsVisible
								})}
								onClick={() =>
								{
									webcamState === 'on' ?
										roomClient.disableWebcam() :
										roomClient.enableWebcam();
								}}
							/>
						</div>
					</If>

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

				<If condition={screenProducer}>
					<div className={classnames('view-container', 'screen')}>
						<ScreenView
							isMe
							advancedMode={advancedMode}
							screenTrack={screenProducer ? screenProducer.track : null}
							screenVisible={screenVisible}
							screenCodec={screenProducer ? screenProducer.codec : null}
						/>
					</div>
				</If>
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
	screenProducer : appPropTypes.Producer
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

const MeContainer = withRoomContext(connect(
	mapStateToProps
)(Me));

export default MeContainer;

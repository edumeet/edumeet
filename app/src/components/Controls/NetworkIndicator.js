import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	peersLengthSelector
} from '../Selectors';
import * as appPropTypes from '../appPropTypes';
import { withRoomContext } from '../../RoomContext';
import { withStyles } from '@material-ui/core/styles';
import WifiIndicator from 'react-wifi-indicator';
import Logger from '../../Logger';

const logger = new Logger('NetworkIndicator');

const styles = () =>
	({
		root : {
			verticalAlign : 'middle',
			'& img'       : {
				display : 'inline',
				width   : '1.7em',
				height  : '1.7em',
				margin  : '10px'
			}
		},

		label : {
			color : 'white'
		},

		strength :
		{
			margin  : 0,
			padding : 0
		}

	});

class NetworkIndicator extends React.Component 
{
	constructor(props) 
	{
		super(props);

		this.state = {
			strengthScale : {
				1 : 'EXCELLENT',
				2 : 'GREAT',
				3 : 'OKAY',
				4 : 'WEAK',
				5 : 'UNUSABLE',
				6 : 'DISCONNECTED'
			},
			strength    : 6,
			bitrate     : null,
			recv        : {},
			send        : {},
			probe       : [],
			currBitrate : 0,
			maxBitrate  : 0,
			avgBitrate  : 0,
			medBitrate  : 0,
			probeCount  : 0,
			probeLimit  : 3,
			highestBitrate: 0
		};
	}

	// const intl = useIntl();
	async handleUpdateStrength() 
	{
		// if (this.props.peersLength == 0) 
		// {

		const percent = this.state.percent;

		logger.warn('[percent: "%s"]', percent);
		
		switch (true)
		{
			case (percent <= 20):

				await this.setState({ strength: 5 });
				break;

			case (percent <= 40):

				await this.setState({ strength: 4 });
				break;

			case (percent <= 60):

				await this.setState({ strength: 3 });
				break;

			case (percent <= 80):

				await this.setState({ strength: 2 });
				break;

			case (percent <= 100):

				await this.setState({ strength: 1 });
				break;

			default:
				break;
		}

		// }
		// else 
		// { 
		// this.setState({ strength: 6 });
		// }
	}

	async handleGetData() 
	{
		const rc = this.props.roomClient;

		var probe = [ ...this.state.probe ]; // clone
		
		var probeCount = this.state.probeCount

		var probeLimit  = this.state.probeLimit

		var currBitrate = this.state.currBitrate

		var highestBitrate = this.state.highestBitrate

		var recv = this.state.recv

		var send = this.state.send

		probe[probeCount] = currBitrate; // add/update next element

		// median
		const med = (arr) =>
		{
			const mid = Math.floor(arr.length / 2);
			const nums = [ ...arr ].sort((a, b) => a - b);
            
			return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
		};

		const medBitrate = med([ ...probe ]);
		
		// maximum
		let maxBitrate = Math.max(...probe);

		highestBitrate = (currBitrate > highestBitrate) ? currBitrate : highestBitrate;

		maxBitrate = (currBitrate > maxBitrate) ? currBitrate : maxBitrate; 

		// average
		const avgBitrate = [ ...probe ]
			.map((x, i, avgBitrate) => x/avgBitrate.length)
			.reduce((a, b) => a + b);

		const percent = 
			await Math.round(currBitrate / medBitrate * 100); 

		var x = (rc._recvTransport) ? (await rc.getTransportStats(rc._recvTransport.id)) : null

		var y = (rc._sendTransport) ? (await rc.getTransportStats(rc._sendTransport.id)) : null

		if(x && y ) 
		{

			this.setState({ 
				recv : x[0],
				send : y[0]
			});
		}

		this.setState({ 
			probe,
			probeCount: (probeCount < probeLimit - 1) ? probeCount + 1 : 0 ,
			currBitrate : (send) ? Math.round(send.recvBitrate / 1024 / 8) : 0,
			maxBitrate,
			avgBitrate,
			medBitrate,
			percent,
			highestBitrate
		});

		logger.warn('[currBitrate: "%s"]', currBitrate);
		logger.warn('[maxBitrate: "%s"]', maxBitrate);
		logger.warn('[medBitrate: "%s"]', medBitrate);
		logger.warn('[avgBitrate: "%s"]', avgBitrate);
		logger.warn('[probeCount: "%s"]', this.state.probeCount);
	}

	componentDidMount()
	{
		this.update = setInterval(async () => 
		{
			await this.handleGetData();
			await this.handleUpdateStrength();
		}, 1000);
	}

	componentWillUnmount() 
	{
		clearInterval(this.update);
	}

	render() 
	{
		const {
			classes,
			advancedMode
		} = this.props;

		return ( 
			<React.Fragment>
				<span className={classes.root}>
					<WifiIndicator 
						strength={this.state.strengthScale[this.state.strength]} 
					/>
				</span>

				{advancedMode &&
					<span className={classes.label}>
						{/* rr:{ Math.round(this.state.recv.recvBitrate / 1024 /8) || 0}, */}
						{ Math.round(this.state.recv.sendBitrate / 1024 /8) || 0}kb ⇙ |&nbsp;  
						{ Math.round(this.state.send.recvBitrate / 1024 /8) || 0}kb ⇗
						{/*	ss:{ Math.round(this.state.send.sendBitrate / 1024) /8 || 0} */}
					</span>
				}
			</React.Fragment>
		);
	}
}

NetworkIndicator.propTypes =
	{
		roomClient   : PropTypes.object.isRequired,
		room         : appPropTypes.Room.isRequired,
		peersLength  : PropTypes.number,
		theme        : PropTypes.object.isRequired,
		classes      : PropTypes.object.isRequired,
		me    				   : PropTypes.object.isRequired,
		advancedMode : PropTypes.bool.isRequired
	};

const mapStateToProps = (state) =>
	({
		room         : state.room,
		advancedMode : state.settings.advancedMode,
		peersLength  : peersLengthSelector(state),
		me       				: state.me
	});

const mapDispatchToProps = (dispatch) =>
	({
		// toggleToolArea : () =>
		// {
		// dispatch(toolareaActions.toggleToolArea());
		// }
	});

export default withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.room === next.room &&
				prev.peers === next.peers &&
				prev.settings.advancedMode === next.settings.advancedMode
			);
		}
	}
)(withStyles(styles, { withTheme: true })(NetworkIndicator)));

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

const styles = () =>
	({
		volumeLarge :
		{
			position       : 'absolute',
			top            : 0,
			bottom         : 0,
			right          : 2,
			width          : 10,
			display        : 'flex',
			flexDirection  : 'column',
			justifyContent : 'center',
			alignItems     : 'center'
		},
		largeBar :
		{
			width              : 6,
			borderRadius       : 6,
			background         : 'rgba(yellow, 0.65)',
			transitionProperty : 'height background-color',
			transitionDuration : '0.25s',
			'&.level0'         :
			{
				height          : 0,
				backgroundColor : 'rgba(255, 255, 0, 0.65)'
			},
			'&.level1' :
			{
				height          : '10%',
				backgroundColor : 'rgba(255, 255, 0, 0.65)'
			},
			'&.level2' :
			{
				height          : '20%',
				backgroundColor : 'rgba(255, 255, 0, 0.65)'
			},
			'&.level3' :
			{
				height          : '30%',
				backgroundColor : 'rgba(255, 255, 0, 0.65)'
			},
			'&.level4' :
			{
				height          : '40%',
				backgroundColor : 'rgba(255, 165, 0, 0.65)'
			},
			'&.level5' :
			{
				height          : '50%',
				backgroundColor : 'rgba(255, 165, 0, 0.65)'
			},
			'&.level6' :
			{
				height          : '60%',
				backgroundColor : 'rgba(255, 165, 0, 0.65)'
			},
			'&.level7' :
			{
				height          : '70%',
				backgroundColor : 'rgba(255, 100, 0, 0.65)'
			},
			'&.level8' :
			{
				height          : '80%',
				backgroundColor : 'rgba(255, 60, 0, 0.65)'
			},
			'&.level9' :
			{
				height          : '90%',
				backgroundColor : 'rgba(255, 30, 0, 0.65)'
			},
			'&.level10' :
			{
				height          : '100%',
				backgroundColor : 'rgba(255, 0, 0, 0.65)'
			}
		},
		volumeSmall :
		{
			float          : 'right',
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			width          : '1vmin',
			position       : 'relative',
			backgroundSize : '75%'
		},
		smallBar :
		{
			flex               : '0 0 auto',
			backgroundSize     : '75%',
			backgroundRepeat   : 'no-repeat',
			backgroundColor    : 'rgba(0, 0, 0, 1)',
			cursor             : 'pointer',
			transitionProperty : 'opacity, background-color',
			width              : 3,
			borderRadius       : 2,
			transitionDuration : '0.25s',
			position           : 'absolute',
			top                : '50%',
			transform          : 'translateY(-50%)',
			'&.level0'         : { height: 0 },
			'&.level1'         : { height: '0.2vh' },
			'&.level2'         : { height: '0.4vh' },
			'&.level3'         : { height: '0.6vh' },
			'&.level4'         : { height: '0.8vh' },
			'&.level5'         : { height: '1.0vh' },
			'&.level6'         : { height: '1.2vh' },
			'&.level7'         : { height: '1.4vh' },
			'&.level8'         : { height: '1.6vh' },
			'&.level9'         : { height: '1.8vh' },
			'&.level10'        : { height: '2.0vh' }
		}
	});

const Volume = (props) =>
{
	const {
		small,
		volume,
		classes
	} = props;

	return (
		<div className={small ? classes.volumeSmall : classes.volumeLarge}>
			<div
				className={classnames(
					small ? classes.smallBar : classes.largeBar, `level${volume}`
				)}
			/>
		</div>
	);
};

Volume.propTypes =
{
	small   : PropTypes.bool,
	volume  : PropTypes.number,
	classes : PropTypes.object.isRequired
};

const makeMapStateToProps = (initialState, props) =>
{
	const mapStateToProps = (state) =>
	{
		if (state.peerVolumes[props.id]>state.settings.noiseThreshold)
		{
			return {
				// scale volume (noiseThreshold...0db) -> (0...10)
				// this is looks only better but is not correct
				volume : Math.round(
					(state.peerVolumes[props.id] - state.settings.noiseThreshold) *
					-100/(state.settings.noiseThreshold) / 10)
			};
		}
		else
		{
			return { volume: 0 };
		}
	};

	return mapStateToProps;
};

export default connect(
	makeMapStateToProps
)(withStyles(styles)(Volume));

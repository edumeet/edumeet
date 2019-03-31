import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import * as appPropTypes from '../../appPropTypes';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';
import HandIcon from '../../../images/icon-hand-white.svg';

const styles = () =>
	({
		root :
		{
			padding  : '0.5rem',
			width    : '100%',
			overflow : 'hidden',
			cursor   : 'auto',
			display  : 'flex'
		},
		listPeer :
		{
			display : 'flex'
		},
		avatar :
		{
			borderRadius : '50%',
			height       : '2rem'
		},
		peerInfo :
		{
			fontSize    : '1rem',
			border      : 'none',
			display     : 'flex',
			paddingLeft : '0.5rem',
			flexGrow    : 1,
			alignItems  : 'center'
		},
		indicators :
		{
			left           : 0,
			top            : 0,
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			alignItems     : 'center',
			transition     : 'opacity 0.3s'
		},
		icon :
		{
			flex               : '0 0 auto',
			margin             : '0.3rem',
			borderRadius       : 2,
			backgroundPosition : 'center',
			backgroundSize     : '75%',
			backgroundRepeat   : 'no-repeat',
			backgroundColor    : 'rgba(0, 0, 0, 0.5)',
			transitionProperty : 'opacity, background-color',
			transitionDuration : '0.15s',
			width              : 'var(--media-control-button-size)',
			height             : 'var(--media-control-button-size)',
			opacity            : 0.85,
			'&:hover'          :
			{
				opacity : 1
			},
			'&.raise-hand' :
			{
				backgroundImage : `url(${HandIcon})`,
				opacity         : 1
			}
		}
	});

const ListMe = (props) =>
{
	const {
		me,
		classes
	} = props;

	const picture = me.picture || EmptyAvatar;

	return (
		<li className={classes.root}>
			<div className={classes.listPeer}>
				<img alt='My avatar' className={classes.avatar} src={picture} />

				<div className={classes.peerInfo}>
					{me.displayName}
				</div>

				<div className={classes.indicators}>
					{ me.raisedHand ?
						<div className={classnames(classes.icon, 'raise-hand')} />
						:null
					}
				</div>
			</div>
		</li>
	);
};

ListMe.propTypes =
{
	me      : appPropTypes.Me.isRequired,
	classes : PropTypes.object.isRequired
};

const mapStateToProps = (state) => ({
	me : state.me
});

export default connect(
	mapStateToProps
)(withStyles(styles)(ListMe));

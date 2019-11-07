import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { FormattedMessage } from 'react-intl';
import * as toolareaActions from '../../actions/toolareaActions';
import BuddyImage from '../../images/buddy.svg';

const styles = () =>
	({
		root :
		{
			width              : '12vmin',
			height             : '9vmin',
			position           : 'absolute',
			bottom             : '3%',
			right              : '3%',
			color              : 'rgba(170, 170, 170, 1)',
			cursor             : 'pointer',
			backgroundImage    : `url(${BuddyImage})`,
			backgroundColor    : 'rgba(42, 75, 88, 1)',
			backgroundPosition : 'bottom',
			backgroundSize     : 'auto 85%',
			backgroundRepeat   : 'no-repeat',
			border             : 'var(--peer-border)',
			boxShadow          : 'var(--peer-shadow)',
			textAlign          : 'center',
			verticalAlign      : 'middle',
			lineHeight         : '1.8vmin',
			fontSize           : '1.7vmin',
			fontWeight         : 'bolder',
			animation          : 'none',
			'&.pulse'          :
			{
				animation : 'pulse 0.5s'
			}
		},
		'@keyframes pulse' :
		{
			'0%' :
			{
				transform : 'scale3d(1, 1, 1)'
			},
			'50%' :
			{
				transform : 'scale3d(1.2, 1.2, 1.2)'
			},
			'100%' :
			{
				transform : 'scale3d(1, 1, 1)'
			}
		}
	});

class HiddenPeers extends React.PureComponent
{
	constructor(props)
	{
		super(props);
		this.state = { className: '' };
	}

	componentDidUpdate(prevProps)
	{
		const { hiddenPeersCount } = this.props;

		if (hiddenPeersCount !== prevProps.hiddenPeersCount)
		{
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ className: 'pulse' }, () =>
			{
				if (this.timeout)
				{
					clearTimeout(this.timeout);
				}

				this.timeout = setTimeout(() =>
				{
					this.setState({ className: '' });
				}, 500);
			});
		}
	}

	render()
	{
		const {
			hiddenPeersCount,
			openUsersTab,
			classes
		} = this.props;

		return (
			<div
				className={classnames(classes.root, this.state.className)}
				onClick={() => openUsersTab()}
			>
				<p>
					+{hiddenPeersCount} <br />
					<FormattedMessage
						id='room.hiddenPeers'
						defaultMessage={
							`{hiddenPeersCount, plural,
							one {participant}
							other {participants}}`
						}
						values={{
							hiddenPeersCount
						}}
					/>
				</p>
			</div>
		);
	}
}

HiddenPeers.propTypes =
{
	hiddenPeersCount : PropTypes.number,
	openUsersTab     : PropTypes.func.isRequired,
	classes          : PropTypes.object.isRequired
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		openUsersTab : () =>
		{
			dispatch(toolareaActions.openToolArea());
			dispatch(toolareaActions.setToolTab('users'));
		}
	};
};

export default connect(
	null,
	mapDispatchToProps
)(withStyles(styles)(HiddenPeers));

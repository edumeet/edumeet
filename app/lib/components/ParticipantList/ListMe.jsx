import React from 'react';
import { connect } from 'react-redux';
import { Me } from '../appPropTypes';

const ListMe = ({ me }) =>
{
	const picture = me.picture || 'resources/images/avatar-empty.jpeg';

	return (
		<li className='list-item me'>
			<div data-component='ListPeer'>
				<img className='avatar' src={picture} />

				<div className='peer-info'>
					{me.displayName}
				</div>

				<div className='indicators'>
					{me.raisedHand && (
						<div className='icon raise-hand on' />
					)}
				</div>
			</div>
		</li>
	);
};

ListMe.propTypes = {
	me : Me.isRequired
};

const mapStateToProps = (state) => ({
	me : state.me
});

export default connect(
	mapStateToProps
)(ListMe);
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import * as stateActions from '../../redux/stateActions';

const TabHeader = ({ currentToolTab, setToolTab, id, name, badge }) => (
	<div
		className={classNames('tab-header', {
			checked : currentToolTab === id
		})}
		onClick={() => setToolTab(id)}
	>
		{name}

		<If condition={badge > 0}>
			<span className='badge'>{badge}</span>
		</If>
	</div>
);

TabHeader.propTypes = {
	currentToolTab : PropTypes.string.isRequired,
	setToolTab     : PropTypes.func.isRequired,
	id             : PropTypes.string.isRequired,
	name           : PropTypes.string.isRequired,
	badge          : PropTypes.number
};

const mapStateToProps = (state) => ({
	currentToolTab : state.toolarea.currentToolTab
});

const mapDispatchToProps = {
	setToolTab : stateActions.setToolTab
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TabHeader);
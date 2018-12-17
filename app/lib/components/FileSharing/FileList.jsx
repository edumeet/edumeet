import React, { Component } from 'react';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import scrollToBottom from '../Chat/scrollToBottom';
import File from './File';

class FileList extends Component
{
	render()
	{
		const {
			files
		} = this.props;

		return (
			<div className='shared-files'>
				{ Object.keys(files).map((magnetUri) =>
					<File key={magnetUri} magnetUri={magnetUri} />
				)}
			</div>
		);
	}
}

FileList.propTypes = {
	files : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		files : state.files
	};
};

export default compose(
	connect(mapStateToProps),
	scrollToBottom()
)(FileList);

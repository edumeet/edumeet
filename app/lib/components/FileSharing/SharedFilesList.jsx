import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import FileEntry, { FileEntryProps } from './FileEntry';
import scrollToBottom from '../Chat/scrollToBottom';

/**
 * This component cannot be pure, as we need to use
 * refs to scroll to the bottom when new files arrive.
 */
class SharedFilesList extends Component
{
	render()
	{
		return (
			<div className='shared-files'>
				{this.props.sharing.map((entry, i) => (
					<FileEntry
						data={entry}
						key={i}
					/>
				))}
			</div>
		);
	}
}

SharedFilesList.propTypes = {
	sharing : PropTypes.arrayOf(FileEntryProps.data).isRequired
};

const mapStateToProps = (state) =>
	({
		sharing : state.sharing,
	
		// Included to scroll to the bottom when the user
		// actually opens the tab. When the component first
		// mounts, the component is not visible and so the
		// component has no height which can be used for scrolling.
		tabOpen : state.toolarea.currentToolTab === 'files'
	});

export default compose(
	connect(mapStateToProps),
	scrollToBottom()
)(SharedFilesList);

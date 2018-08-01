import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import FileEntry, { FileEntryProps } from './FileEntry';

class SharedFilesList extends PureComponent
{
	constructor(props)
	{
		super(props);

		this.listRef = React.createRef();
	}

	scrollToBottom = () =>
	{
		const elem = this.listRef.current;

		elem.scrollTop = elem.scrollHeight;
	};

	componentDidUpdate()
	{
		this.scrollToBottom();
	}

	render()
	{
		return (
			<div className='shared-files' ref={this.listRef}>
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

export default connect(
	mapStateToProps
)(SharedFilesList);
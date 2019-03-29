import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import File from './File';

const styles = (theme) =>
	({
		root :
		{
			height        : '100%',
			display       : 'flex',
			flexDirection : 'column',
			alignItems    : 'center',
			overflowY     : 'auto',
			padding       : theme.spacing.unit
		}
	});

class FileList extends React.PureComponent
{
	componentDidMount()
	{
		this.node.scrollTop = this.node.scrollHeight;
	}

	getSnapshotBeforeUpdate()
	{
		return this.node.scrollTop
			+ this.node.offsetHeight === this.node.scrollHeight;
	}

	componentDidUpdate(prevProps, prevState, shouldScroll)
	{
		if (shouldScroll)
		{
			this.node.scrollTop = this.node.scrollHeight;
		}
	}

	render()
	{
		const {
			files,
			classes
		} = this.props;

		return (
			<div className={classes.root} ref={(node) => { this.node = node; }}>
				{ Object.keys(files).map((magnetUri) =>
					<File key={magnetUri} magnetUri={magnetUri} />
				)}
			</div>
		);
	}
}

FileList.propTypes =
{
	files   : PropTypes.object.isRequired,
	classes : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		files : state.files
	};
};

export default connect(mapStateToProps)(withStyles(styles)(FileList));

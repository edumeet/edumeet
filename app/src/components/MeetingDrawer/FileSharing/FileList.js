import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as appPropTypes from '../../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import File from './File';
import EmptyAvatar from '../../../images/avatar-empty.jpeg';

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
			me,
			picture,
			peers,
			classes
		} = this.props;

		return (
			<div className={classes.root} ref={(node) => { this.node = node; }}>
				{ Object.entries(files).map(([ magnetUri, file ]) =>
				{
					let displayName;

					let filePicture;

					if (me.id === file.peerId)
					{
						displayName = 'You';
						filePicture = picture;
					}
					else if (peers[file.peerId])
					{
						displayName = peers[file.peerId].displayName;
						filePicture = peers[file.peerId].picture;
					}
					else
					{
						displayName = 'Unknown';
					}

					return (
						<File
							key={magnetUri}
							magnetUri={magnetUri}
							displayName={displayName}
							picture={filePicture || EmptyAvatar}
						/>
					);
				})}
			</div>
		);
	}
}

FileList.propTypes =
{
	files   : PropTypes.object.isRequired,
	me      : appPropTypes.Me.isRequired,
	picture : PropTypes.string,
	peers   : PropTypes.object.isRequired,
	classes : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		files   : state.files,
		me      : state.me,
		picture : state.settings.picture,
		peers   : state.peers
	};
};

export default connect(
	mapStateToProps,
	null,
	null,
	{
		areStatesEqual : (next, prev) =>
		{
			return (
				prev.files === next.files &&
				prev.me === next.me &&
				prev.settings.picture === next.settings.picture &&
				prev.peers === next.peers
			);
		}
	}
)(withStyles(styles)(FileList));

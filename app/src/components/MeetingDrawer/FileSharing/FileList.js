import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as appPropTypes from '../../appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import { injectIntl } from 'react-intl';
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
			padding       : theme.spacing(1)
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
			peers,
			intl,
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
						displayName = intl.formatMessage({
							id             : 'room.me',
							defaultMessage : 'Me'
						});
						filePicture = me.picture;
					}
					else if (peers[file.peerId])
					{
						displayName = peers[file.peerId].displayName;
						filePicture = peers[file.peerId].picture;
					}
					else
					{
						displayName = intl.formatMessage({
							id             : 'label.unknown',
							defaultMessage : 'Unknown'
						});
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
	peers   : PropTypes.object.isRequired,
	intl    : PropTypes.object.isRequired,
	classes : PropTypes.object.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		files : state.files,
		me    : state.me,
		peers : state.peers
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
				prev.peers === next.peers
			);
		}
	}
)(withStyles(styles)(injectIntl(FileList)));

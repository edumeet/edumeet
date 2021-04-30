import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import WebAssetIcon from '@material-ui/icons/WebAsset';
import ErrorIcon from '@material-ui/icons/Error';
import Hidden from '@material-ui/core/Hidden';

const styles = (theme: any) =>
	({
		dialogPaper :
		{
			width                          : '40vw',
			[theme.breakpoints.down('lg')] :
			{
				width : '40vw'
			},
			[theme.breakpoints.down('md')] :
			{
				width : '50vw'
			},
			[theme.breakpoints.down('sm')] :
			{
				width : '70vw'
			},
			[theme.breakpoints.down('xs')] :
			{
				width : '90vw'
			}
			// display       : 'flex',
			// flexDirection : 'column'
		},
		list : {
			backgroundColor : theme.palette.background.paper
		},
		errorAvatar : {
			width  : theme.spacing(20),
			height : theme.spacing(20)
		}
	});

let dense = false;

const ConfigDocumentation = ({
	platform,
	classes
}) =>
{
	if (platform !== 'desktop')
		dense = true;

	return (
		<Dialog
			open
			scroll={'body'}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>
				<FormattedMessage
					id='configDocumentation.title'
					defaultMessage='Configuration documentation'
				/>
			</DialogTitle>
			<DialogContent dividers>
				<FormattedMessage
					id='configDocumentation.bodyText'
					defaultMessage=''
				/>
				<Grid container spacing={2} justify='center' alignItems='center'>
					<Grid item xs={12} md={7}>

						<div className={classes.list}>
							<List dense={dense}>

							</List>
						</div>
					</Grid>
				</Grid>
			</DialogContent>
		</Dialog>
	);
};

ConfigDocumentation.propTypes =
{
	platform          : PropTypes.string.isRequired,
	classes           : PropTypes.object.isRequired
};

export default withStyles(styles)(ConfigDocumentation);

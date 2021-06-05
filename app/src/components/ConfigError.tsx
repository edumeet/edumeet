import React from 'react'; // eslint-disable-line no-use-before-define
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import Grid from '@material-ui/core/Grid';
import ErrorIcon from '@material-ui/icons/Error';
import Button from '@material-ui/core/Button';

const styles = () =>
	({
		error : {
			color : 'red'
		}
	});

const ConfigError = ({
	classes,
	configError
}: {
	classes : any;
	configError : string;
}) =>
{
	return (
		<Dialog
			open
			scroll={'body'}
			classes={{
				paper : classes.dialogPaper
			}}
		>
			<DialogTitle id='form-dialog-title'>
				<ErrorIcon className={classes.errorAvatar} color='error'/>
				<FormattedMessage
					id='configError.title'
					defaultMessage='Configuration error'
				/>
			</DialogTitle>
			<DialogContent dividers>
				<FormattedMessage
					id='configError.bodyText'
					defaultMessage='The Edumeet configuration contains errors:'
				/>
				<Grid container spacing={2} alignItems='center'>
					<Grid item>
						<p className={classes.error}>{configError}</p>
					</Grid>
					<Button size='small' onClick={(e) =>
					{
						e.preventDefault();
						window.location.href = '/?config=true';
					}}
					>
						<FormattedMessage
							id='configError.link'
							defaultMessage='See the configuration documentation'
						/>
					</Button>
				</Grid>
			</DialogContent>
		</Dialog>
	);
};

ConfigError.propTypes =
{
	classes     : PropTypes.object.isRequired,
	configError : PropTypes.string.isRequired
};

export default withStyles(styles)(ConfigError);

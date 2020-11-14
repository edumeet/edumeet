import React from 'react';
import { withStyles } from '@material-ui/core/styles';

import './LoadingView.css';

const styles = (theme) =>
	({
		root :
		{
			display              : 'flex',
			width                : '100%',
			height               : '100%',
			backgroundColor      : 'var(--background-color)',
			backgroundImage      : `url(${window.config ? window.config.background : null})`,
			backgroundAttachment : 'fixed',
			backgroundPosition   : 'center',
			backgroundSize       : 'cover',
			backgroundRepeat     : 'no-repeat'
		},
		loadingView :
		{
			height          : '100%',
			width           : '100%',
			backgroundColor : 'red'
		}
	});

const LoadingView = ({
	classes
}) =>
{
	return (
		<div className='LoadingView'
			classes={{
				paper : classes.loadingView
			}}

		/>
	);
};

export default withStyles(styles)(LoadingView);

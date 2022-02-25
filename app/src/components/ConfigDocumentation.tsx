import React from 'react'; // eslint-disable-line no-use-before-define
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';

import { formatDocs } from '../config';

const configDocs = formatDocs();

const styles = () =>
	({
		table : {
			minWidth : 700
		},
		pre : {
			fontSize : '0.8rem'
		},
		cell : {
			maxWidth : '25vw',
			overflow : 'auto'
		}
	});

const ConfigDocumentation = ({
	classes
}: {
	classes : any;
}) =>
{
	return (
		<Card className={classes.root}>
			<CardContent>
				<Typography className={classes.title} variant='h5' component='h2'>
					<FormattedMessage
						id='configDocumentation.title'
						defaultMessage='Edumeet configuration'
					/>
				</Typography>
				<Typography variant='body2' component='div'>
					<TableContainer component={Paper}>
						<Table className={classes.table} size='small' aria-label='Configuration'>
							<TableHead>
								<TableRow>
									<TableCell>Property</TableCell>
									<TableCell align='left'>Description</TableCell>
									<TableCell align='left'>Format</TableCell>
									<TableCell align='left'>Default value</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{Object.entries(configDocs).map(([ name, value ] : [ string, any ]) =>
								{
									return (
										<TableRow key={name}>
											<TableCell component='th' scope='row' className={classes.cell}>{name}</TableCell>
											<TableCell className={classes.cell}>{value.doc}</TableCell>
											<TableCell className={classes.cell}>
												<pre>{value.format}</pre>
											</TableCell>
											<TableCell className={classes.cell}>
												<pre className={classes.pre}>{value.default}</pre>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				</Typography>
			</CardContent>
			<CardActions>
				<Button size='small' onClick={(e) =>
				{
					e.preventDefault();
					window.location.href = '/';
				}}
				>Home</Button>
			</CardActions>
		</Card>
	);
};

ConfigDocumentation.propTypes =
{
	classes : PropTypes.object.isRequired
};

export default withStyles(styles)(ConfigDocumentation);

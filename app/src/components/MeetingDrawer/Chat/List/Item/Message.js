import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import DOMPurify from 'dompurify';
import marked from 'marked';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { useIntl } from 'react-intl';

const linkRenderer = new marked.Renderer();

linkRenderer.link = (href, title, text) =>
{
	title = title ? title : href;
	text = text ? text : href;

	return `<a target='_blank' href='${ href }' title='${ title }'>${ text }</a>`;
};

const styles = (theme) =>
	({
		root :
		{
			display      : 'flex',
			marginBottom : theme.spacing(1),
			padding      : theme.spacing(1),
			flexShrink   : 0
		},
		selfMessage :
		{
			marginLeft : 'auto'
		},
		remoteMessage :
		{
			marginRight : 'auto'
		},
		text :
		{
			'& p' :
			{
				margin : 0
			}
		},
		content :
		{
			marginLeft : theme.spacing(1)
		},
		avatar :
		{
			borderRadius : '50%',
			height       : '2rem',
			alignSelf    : 'center'
		},
		'@keyframes fadeIn' : {
			'0%' : {
				backgroundColor : 'yellow'
			},
			'100%' : {
				backgroundColor : 'none'
			}
		},
		'isseen' : {
			animation : '$fadeIn 3s ease-in-out'
		},
		'isunseen' : {
			backgroundColor : 'yellow'
		}

	});

const Message = (props) =>
{
	const intl = useIntl();

	const {
		self,
		picture,
		text,
		time,
		name,
		classes,
		time2,
		isseen,
		sender
	} = props;

	return (
		<Paper
			className={classnames(
				classes.root,
				self ? classes.selfMessage : classes.remoteMessage,
				isseen && sender === 'response' ? classes.isseen : null
			)}
			data-isseen={isseen}
			data-time={time2}
		>
			<img alt='Avatar' className={classes.avatar} src={picture} />
			<div className={classnames(classes.content)}>
				<Typography
					className={classes.text}
					variant='subtitle1'
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{ __html : DOMPurify.sanitize(
						marked.parse(
							text,
							{ renderer: linkRenderer }
						),
						{
							ALLOWED_TAGS : [
								'a', 'b', 'strong', 'i',
								'em', 'u', 'strike', 'p',
								'br'
							],
							ALLOWED_ATTR : [ 'href', 'target', 'title' ]
						}
					) }}
				/>
				<Typography variant='caption'>
					{ self ?
						intl.formatMessage({
							id             : 'room.me',
							defaultMessage : 'Me'
						})
						:
						name
					} - {time}
				</Typography>
			</div>
		</Paper>
	);
};

Message.propTypes =
{
	self    : PropTypes.bool,
	picture : PropTypes.string,
	text    : PropTypes.string,
	time    : PropTypes.object,
	time2   : PropTypes.string,
	name    : PropTypes.string,
	classes : PropTypes.object.isRequired,
	isseen  : PropTypes.bool.isRequired,
	sender  : PropTypes.string.isRequired

};

export default withStyles(styles)(Message);
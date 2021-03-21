import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import DOMPurify from 'dompurify';
import marked from 'marked';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { useIntl, FormattedTime } from 'react-intl';

const styles = (theme) =>
	({
		root :
		{
			display         : 'flex',
			flexShrink      : 0,
			borderRadius    : '10px',
			backgroundColor : '#e0e0e085',
			boxShadow       : 'none',
			padding         : theme.spacing(0),
			wordWrap        : 'break-word',
			wordBreak       : 'break-all'
		},
		independent :
		{
			marginTop : theme.spacing(1)
		},
		continuationStart :
		{
			marginBottom : theme.spacing(0),
			borderRadius : '0px 0px 0px 0px'
		},

		continuationMiddle :
		{
			marginBottom : theme.spacing(0),
			borderRadius : '0px 0px 0px 0px'
		},
		continuationEnd :
		{
			marginBottom : theme.spacing(0),
			borderRadius : '0px 0px 0px 0px'
		},
		continuationTime :
		{
			alignSelf   : 'center',
			fontSize    : '13px',
			paddingLeft : '11px',
			color       : '#999999'
		},
		sent :
		{
			alignSelf : 'flex-end'
		},
		received :
		{
			alignSelf : 'flex-start'
		},
		name : {

		},
		avatar :
		{
			borderRadius    : '50%',
			width           : '2rem',
			height          : '2rem',
			alignSelf       : 'center',
			margin          : theme.spacing(0.5),
			backgroundColor : '#e0e0e085'
		},
		content :
		{
			margin : theme.spacing(1),
			'& p'  : {
				margin : '0'
			}
		},
		'@keyframes fadeIn' : {
			'from' : {
				backgroundColor : '#5f9b2d5c'
			},
			'to' : {
				backgroundColor : '#e0e0e085'
			}
		},
		isseen : {
			animation         : '$fadeIn 2s linear',
			animationFillMode : 'forwards'
		}
	});

const Message = (props) =>
{
	const intl = useIntl();

	const linkRenderer = new marked.Renderer();

	linkRenderer.link = (href, title, text) =>
	{
		title = title ? title : href;
		text = text ? text : href;

		return `<a target='_blank' href='${ href }' title='${ title }'>${ text }</a>`;
	};

	const allowedHTMLNodes = {
		ALLOWED_TAGS : [
			'a', 'b', 'strong', 'i',
			'em', 'u', 'strike', 'p',
			'br'
		],
		ALLOWED_ATTR : [ 'href', 'target', 'title' ]
	};

	const {
		avatar,
		text,
		time,
		name,
		classes,
		isseen,
		sender,
		sameName,
		refMessage,
		width
	} = props;

	return (
		<Paper
			className={classnames(
				classes.root,
				sender === 'client' ? classes.sent : classes.received,
				isseen && sender === 'response' ? classes.isseen : null,
				sameName ? classes.continuationMiddle : classes.independent
			)}
			style={{
				minWidth : width
				// width    : width
			}}
			data-isseen={isseen}
			data-time={time}
			ref={refMessage}
		>
			{/* Avatar */}
			{!sameName && 'hidden' ?
				<img
					className={classes.avatar}
					src={avatar}
					alt='Avatar'
				/>
				:
				<div className={classes.continuationTime}>
					<FormattedTime value={new Date(time)} />
				</div>
			}
			{/* /Avatar */}

			{/* Content */}
			<div className={classes.content}>
				{/* Name & Time */}
				{(!sameName) &&
				<Typography variant='subtitle1'>
					<b>
						{ sender === 'client' ?
							`${name} (${intl.formatMessage({
								id             : 'room.me',
								defaultMessage : 'Me'
							}) })`
							:
							<b>{name}</b>
						} - <FormattedTime value={new Date(time)} />
					</b>
				</Typography>
				}
				{/* /Name & Time */}

				{/* Text */}
				<Typography
					variant='subtitle1'
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{ __html : DOMPurify.sanitize(
						marked.parse(text, { renderer: linkRenderer }),
						allowedHTMLNodes
					) }}
				/>
				{/* /Text */}
			</div>
			{/* Content */}
		</Paper>
	);
};

Message.propTypes =
{
	avatar     : PropTypes.string,
	text       : PropTypes.string,
	time       : PropTypes.string,
	name       : PropTypes.string,
	classes    : PropTypes.object.isRequired,
	isseen     : PropTypes.bool.isRequired,
	sender     : PropTypes.string.isRequired,
	sameName   : PropTypes.object.isRequired,
	refMessage : PropTypes.object.isRequired,
	onClick    : PropTypes.object.isRequired,
	width      : PropTypes.number.isRequired
};

export default withStyles(styles)(Message);
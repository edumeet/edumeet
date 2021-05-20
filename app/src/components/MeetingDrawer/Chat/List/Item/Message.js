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
			backgroundColor : '#5f9b2d5c',
			boxShadow       : 'none',
			padding         : theme.spacing(0),
			wordWrap        : 'break-word',
			wordBreak       : 'break-all'
		},
		single :
		{
			marginTop    : theme.spacing(1),
			borderRadius : '10px 10px 10px 10px'
		},
		combinedBegin :
		{
			marginTop    : theme.spacing(1),
			borderRadius : '10px 10px 0px 0px'
		},

		combinedMiddle :
		{
			marginBottom : theme.spacing(0),
			borderRadius : '0px 0px 0px 0px'
		},
		combinedEnd :
		{
			marginBottom : theme.spacing(0),
			borderRadius : '0px 0px 10px 10px'
		},
		combinedTime :
		{
			width          : '75px',
			alignSelf      : 'center',
			fontSize       : '13px',
			color          : '#999999',
			dispay         : 'flex',
			display        : 'flex',
			justifyContent : 'center'
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
		avatar : {
			dispay         : 'flex',
			width          : '75px',
			display        : 'flex',
			justifyContent : 'center',
			'& img'        : {
				borderRadius    : '50%',
				width           : '2rem',
				height          : '2rem',
				alignSelf       : 'center',
				objectFit       : 'cover',
				backgroundColor : '#e0e0e085'
			}
		},
		content :
		{
			margin : theme.spacing(1),
			'& p'  : {
				margin : '0'
			}
		},
		isSeen : {
			backgroundColor : '#e0e0e085',
			transition      : 'background-color 1s'
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
		refMessage,
		format
	} = props;

	return (
		<Paper
			className={classnames(
				classes.root,
				sender === 'client' ? classes.sent : classes.received,
				isseen ? classes.isSeen : null,
				classes[format]
			)}
			data-name={name}
			data-isseen={isseen}
			data-time={time}
			ref={refMessage}
		>
			{/* Avatar */}

			<div className={classes.avatar}>
				{(format === 'single' || format ==='combinedBegin') && 'hidden' ?
					<img
						src={avatar}
						alt='Avatar'
					/>
					:
					<div className={classes.combinedTime}>
						<FormattedTime value={new Date(time)} />
					</div>
				}
			</div>
			{/* /Avatar */}

			{/* Content */}
			<div className={classes.content}>
				{/* Name & Time */}
				{(format === 'single' || format ==='combinedBegin') &&
				<Typography variant='subtitle1'>
					<b>
						{ sender === 'client' ?
							`${intl.formatMessage({
								id             : 'room.me',
								defaultMessage : 'Me'
							}) }`
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
	refMessage : PropTypes.object.isRequired,
	width      : PropTypes.number.isRequired,
	format     : PropTypes.string.isRequired
};

export default withStyles(styles)(Message);

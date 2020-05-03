import PropTypes from 'prop-types';

export const Room = PropTypes.shape(
	{
		state : PropTypes.oneOf(
			[ 'new', 'connecting', 'connected', 'closed' ]).isRequired,
		activeSpeakerId : PropTypes.string
	});

export const Me = PropTypes.shape(
	{
		id               : PropTypes.string.isRequired,
		canSendMic       : PropTypes.bool.isRequired,
		canSendWebcam    : PropTypes.bool.isRequired,
		webcamInProgress : PropTypes.bool.isRequired
	});

export const Producer = PropTypes.shape(
	{
		id          : PropTypes.string.isRequired,
		source      : PropTypes.oneOf([ 'mic', 'webcam', 'screen', 'extravideo' ]).isRequired,
		deviceLabel : PropTypes.string,
		type        : PropTypes.oneOf([ 'front', 'back', 'screen', 'extravideo' ]),
		paused      : PropTypes.bool.isRequired,
		track       : PropTypes.any,
		codec       : PropTypes.string.isRequired
	});

export const Peer = PropTypes.shape(
	{
		id          : PropTypes.string.isRequired,
		displayName : PropTypes.string,
		consumers   : PropTypes.arrayOf(PropTypes.string).isRequired
	});

export const Consumer = PropTypes.shape(
	{
		id             : PropTypes.string.isRequired,
		peerId         : PropTypes.string.isRequired,
		source         : PropTypes.oneOf([ 'mic', 'webcam', 'screen', 'extravideo' ]).isRequired,
		locallyPaused  : PropTypes.bool.isRequired,
		remotelyPaused : PropTypes.bool.isRequired,
		profile        : PropTypes.oneOf([ 'none', 'default', 'low', 'medium', 'high' ]),
		track          : PropTypes.any,
		codec          : PropTypes.string
	});

export const Notification = PropTypes.shape(
	{
		id      : PropTypes.string.isRequired,
		type    : PropTypes.oneOf([ 'info', 'error' ]).isRequired,
		timeout : PropTypes.number
	});

export const Message = PropTypes.shape(
	{
		type      : PropTypes.string,
		component : PropTypes.string,
		text      : PropTypes.string,
		sender    : PropTypes.string
	});

export const FileEntryProps = PropTypes.shape(
	{
		data : PropTypes.shape({
			id      : PropTypes.string.isRequired,
			picture : PropTypes.string,
			file    : PropTypes.shape({
				magnet : PropTypes.string.isRequired
			}).isRequired,
			me : PropTypes.bool
		}).isRequired,
		notify : PropTypes.func.isRequired
	});
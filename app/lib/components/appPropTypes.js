import PropTypes from 'prop-types';

export const Room = PropTypes.shape(
	{
		url   : PropTypes.string.isRequired,
		state : PropTypes.oneOf(
			[ 'new', 'connecting', 'connected', 'closed' ]).isRequired,
		activeSpeakerName : PropTypes.string
	});

export const Device = PropTypes.shape(
	{
		flag    : PropTypes.string.isRequired,
		name    : PropTypes.string.isRequired,
		version : PropTypes.string
	});

export const Me = PropTypes.shape(
	{
		name                 : PropTypes.string.isRequired,
		displayName          : PropTypes.string,
		displayNameSet       : PropTypes.bool.isRequired,
		device               : Device.isRequired,
		canSendMic           : PropTypes.bool.isRequired,
		canSendWebcam        : PropTypes.bool.isRequired,
		canChangeWebcam      : PropTypes.bool.isRequired,
		webcamInProgress     : PropTypes.bool.isRequired,
		audioOnly            : PropTypes.bool.isRequired,
		audioOnlyInProgress  : PropTypes.bool.isRequired,
		restartIceInProgress : PropTypes.bool.isRequired
	});

export const Producer = PropTypes.shape(
	{
		id             : PropTypes.number.isRequired,
		source         : PropTypes.oneOf([ 'mic', 'webcam' ]).isRequired,
		deviceLabel    : PropTypes.string,
		type           : PropTypes.oneOf([ 'front', 'back' ]),
		locallyPaused  : PropTypes.bool.isRequired,
		remotelyPaused : PropTypes.bool.isRequired,
		track          : PropTypes.any,
		codec          : PropTypes.string.isRequired
	});

export const Peer = PropTypes.shape(
	{
		name        : PropTypes.string.isRequired,
		displayName : PropTypes.string,
		device      : Device.isRequired,
		consumers   : PropTypes.arrayOf(PropTypes.number).isRequired
	});

export const Consumer = PropTypes.shape(
	{
		id             : PropTypes.number.isRequired,
		peerName       : PropTypes.string.isRequired,
		source         : PropTypes.oneOf([ 'mic', 'webcam' ]).isRequired,
		supported      : PropTypes.bool.isRequired,
		locallyPaused  : PropTypes.bool.isRequired,
		remotelyPaused : PropTypes.bool.isRequired,
		profile        : PropTypes.oneOf([ 'none', 'low', 'medium', 'high' ]),
		track          : PropTypes.any,
		codec          : PropTypes.string
	});

export const Notification = PropTypes.shape(
	{
		id      : PropTypes.string.isRequired,
		type    : PropTypes.oneOf([ 'info', 'error' ]).isRequired,
		timeout : PropTypes.number
	});

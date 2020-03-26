module.exports = {
	// Allowed to enter locked rooms + all other priveleges
	ADMIN         : 'admin',
	// Allowed to enter restricted rooms if configured.
	// Allowed to moderate users in a room (mute all,
	// spotlight video, kick users)
	MODERATOR     : 'moderator',
	// Same as MODERATOR, but can't moderate users
	AUTHENTICATED : 'authenticated',
	// No priveleges
	ALL           : 'normal'
};
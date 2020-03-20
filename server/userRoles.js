module.exports = {
	// Allowed to enter locked rooms + all other priveleges
	ADMIN         : 0,
	// Allowed to enter restricted rooms if configured.
	// Allowed to moderate users in a room (mute all,
	// spotlight video, kick users)
	MODERATOR     : 1,
	// Same as MODERATOR, but can't moderate users
	AUTHENTICATED : 2,
	// No priveleges
	ALL           : 3
};
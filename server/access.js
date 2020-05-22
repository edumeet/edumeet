module.exports = {
	// The role(s) will gain access to the room
	// even if it is locked (!)
	BYPASS_ROOM_LOCK : 'BYPASS_ROOM_LOCK',
	// The role(s) will gain access to the room without
	// going into the lobby. If you want to restrict access to your
	// server to only directly allow authenticated users, you could
	// add the userRoles.AUTHENTICATED to the user in the userMapping
	// function, and change to BYPASS_LOBBY : [ userRoles.AUTHENTICATED ]
	BYPASS_LOBBY     : 'BYPASS_LOBBY'
};
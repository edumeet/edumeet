module.exports = {
	// These can be changed, id must be unique.

	// A person can give other peers any role that is promotable: true
	// with a level up to and including their own highest role.
	// Example: A MODERATOR can give other peers PRESENTER and MODERATOR
	// roles (all peers always have NORMAL)
	ADMIN         : { id: 2529, label: 'admin', level: 50, promotable: true },
	MODERATOR     : { id: 5337, label: 'moderator', level: 40, promotable: true },
	PRESENTER     : { id: 9583, label: 'presenter', level: 30, promotable: true },
	AUTHENTICATED : { id: 5714, label: 'authenticated', level: 20, promotable: false },
	// Don't change anything after this point

	// All users have this role by default, do not change or remove this role
	NORMAL : { id: 4261, label: 'normal', level: 10, promotable: false }
};
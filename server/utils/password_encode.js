const bcrypt = require('bcrypt');
const saltRounds=10;

if (process.argv.length == 3)
{
	const cleartextPassword = process.argv[2];

	// eslint-disable-next-line no-console
	console.log(bcrypt.hashSync(cleartextPassword, saltRounds));
}

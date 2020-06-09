const list = [
	{ name: 'English',				file: 'en', locale: [ 'en' ] },
	{ name: 'Chech',					file: 'cs', locale: [ 'cs' ] },
	{ name: 'Chinese (Simplified)',	file: 'cn', locale: [ 'zn', 'zn-cn' ] }, // hans
	{ name: 'Chinese (Traditional)',	file: 'tw', locale: [ 'zn-tw', 'zn-hk', 'zn-sg' ] }, // hant
	{ name: 'Croatian',				file: 'hr', locale: [ 'hr' ] },
	{ name: 'Danish',				file: 'dk', locale: [ 'dk' ] },
	{ name: 'French',				file: 'fr', locale: [ 'fr' ] },
	{ name: 'German',				file: 'de', locale: [ 'de' ] },
	{ name: 'Greek',					file: 'el', locale: [ 'el' ] },
	{ name: 'Hindi',					file: 'hi', locale: [ 'hi' ] },
	{ name: 'Hungarian',				file: 'hu', locale: [ 'hu' ] },
	{ name: 'Italian',				file: 'it', locale: [ 'it' ] },
	{ name: 'Latvian',				file: 'lv', locale: [ 'lv' ] },
	{ name: 'Norwegian',				file: 'nb', locale: [ 'nb' ] },
	{ name: 'Polish',				file: 'pl', locale: [ 'pl' ] },
	{ name: 'Portuguese',			file: 'pt', locale: [ 'pt' ] },
	{ name: 'Romanian',				file: 'ro', locale: [ 'ro' ] },
	{ name: 'Spanish',				file: 'es', locale: [ 'es' ] },
	{ name: 'Turkish',				file: 'tr', locale: [ 'tr' ] },
	{ name: 'Ukrainian',				file: 'uk', locale: [ 'uk' ] }
];

export const detect = () =>
{
	const localeFull = (navigator.language || navigator.browserLanguage).toLowerCase();

	// const localeCountry = localeFull.split(/[-_]/)[0];

	// const localeRegion = localeFull.split(/[-_]/)[1] || null;

	return localeFull;
};

export const getList = () => list;

export const loadOne = (locale) =>
{
	let res = {};

	try
	{
		res = list.filter((item) =>
			item.locale.includes(locale) || item.locale.includes(locale.split(/[-_]/)[0])
		)[0];

		res.messages = require(`./${res.file}`);
	}

	catch
	{

		res = list.filter((item) => item.locale.includes('en'))[0];

		res.messages = require(`./${res.file}`);
	}

	return res;

};

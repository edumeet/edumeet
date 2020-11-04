const list = [
	{
		name   : 'English',
		file   : 'en',
		locale : [ 'en', 'en-en' ]
	},
	{
		name   : 'Czech',
		file   : 'cs',
		locale : [ 'cs', 'cs-cs' ]
	},
	{
		name   : 'Chinese (Simplified)',
		file   : 'cn',
		locale : [ 'zn', 'zn-zn', 'zn-cn' ]
	}, // hans
	{
		name   : 'Chinese (Traditional)',
		file   : 'tw',
		locale : [ 'zn-tw', 'zn-hk', 'zn-sg' ]
	}, // hant
	{
		name   : 'Croatian',
		file   : 'hr',
		locale : [ 'hr', 'hr-hr' ]
	},
	{
		name   : 'Danish',
		file   : 'dk',
		locale : [ 'dk', 'dk-dk' ]
	},
	{
		name   : 'French',
		file   : 'fr',
		locale : [ 'fr', 'fr-fr' ]
	},
	{
		name   : 'German',
		file   : 'de',
		locale : [ 'de', 'de-de' ]
	},
	{
		name   : 'Greek',
		file   : 'el',
		locale : [ 'el', 'el-el' ]
	},
	{
		name   : 'Hindi',
		file   : 'hi',
		locale : [ 'hi', 'hi-hi' ]
	},
	{
		name   : 'Hungarian',
		file   : 'hu',
		locale : [ 'hu', 'hu-hu' ]
	},
	{
		name   : 'Italian',
		file   : 'it',
		locale : [ 'it', 'it-it' ]
	},
	{
		name   : 'Kazakh',
		file   : 'kk',
		locale : [ 'kk', 'kk-kz	' ]
	},
	{
		name   : 'Latvian',
		file   : 'lv',
		locale : [ 'lv', 'lv-lv' ]
	},
	{
		name   : 'Norwegian',
		file   : 'nb',
		locale : [ 'nb', 'nb-no' ]
	},
	{
		name   : 'Polish',
		file   : 'pl',
		locale : [ 'pl', 'pl-pl' ]
	},
	{
		name   : 'Portuguese',
		file   : 'pt',
		locale : [ 'pt', 'pt-pt' ]
	},
	{
		name   : 'Romanian',
		file   : 'ro',
		locale : [ 'ro', 'ro-ro' ]
	},
	{
		name   : 'Russian',
		file   : 'ru',
		locale : [ 'ru', 'ru-ru' ]
	},
	{
		name   : 'Spanish',
		file   : 'es',
		locale : [ 'es', 'es-es' ]
	},
	{
		name   : 'Turkish',
		file   : 'tr',
		locale : [ 'tr', 'tr-tr' ]
	},
	{
		name   : 'Ukrainian',
		file   : 'uk',
		locale : [ 'uk', 'uk-uk' ]
	}
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

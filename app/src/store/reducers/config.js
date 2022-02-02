import { config as defaultConfig } from '../../config';

const initialState =
{
	...defaultConfig
};

const config = (state = initialState, action) =>
{
	switch (action.type)
	{
		case 'CONFIG_SET':
		{
			return { ...action.payload };
		}

		default:
			return state;
	}
};

export default config;

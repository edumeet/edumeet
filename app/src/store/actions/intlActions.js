import { UPDATE } from 'react-intl-redux';

export const updateIntl = ({ locale, formats, messages, list }) =>
	({
		type    : UPDATE,
		payload : { locale, formats, messages, list }
	});

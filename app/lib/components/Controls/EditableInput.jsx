import React from 'react';
import PropTypes from 'prop-types';
import { RIEInput } from 'riek';

export default class EditableInput extends React.Component
{
	render()
	{
		const {
			value,
			propName,
			className,
			classLoading,
			classInvalid,
			editProps,
			onChange
		} = this.props;

		return (
			<RIEInput
				value={value}
				propName={propName}
				className={className}
				classLoading={classLoading}
				classInvalid={classInvalid}
				shouldBlockWhileLoading
				editProps={editProps}
				change={(data) => onChange(data)}
			/>
		);
	}

	shouldComponentUpdate(nextProps)
	{
		if (nextProps.value === this.props.value)
			return false;

		return true;
	}
}

EditableInput.propTypes =
{
	value        : PropTypes.string,
	propName     : PropTypes.string.isRequired,
	className    : PropTypes.string,
	classLoading : PropTypes.string,
	classInvalid : PropTypes.string,
	editProps    : PropTypes.any,
	onChange     : PropTypes.func.isRequired
};

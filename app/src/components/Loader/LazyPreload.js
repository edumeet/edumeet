import React from 'react';

export const LazyPreload = (importStatement) =>
{
	const Component = React.lazy(importStatement);

	Component.preload = importStatement;

	return Component;
};
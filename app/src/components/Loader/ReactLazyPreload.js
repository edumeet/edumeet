import React from 'react';

export const ReactLazyPreload = (importStatement) =>
{
	const Component = React.lazy(importStatement);

	Component.preload = importStatement;

	return Component;
};
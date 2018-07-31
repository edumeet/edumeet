import React from 'react';
import dragDrop from 'drag-drop';
import { shareFiles } from './index';

export const configureDragDrop = () =>
{
	dragDrop('body', async(files) => await shareFiles(files));
};

export const HoldingOverlay = () => (
	<div id='holding-overlay'>
    Drop files here to share them
	</div>
);
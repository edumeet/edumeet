import React from 'react';
import WebTorrent from 'webtorrent';
import dragDrop from 'drag-drop';
import { shareFiles } from './index';

export const configureDragDrop = () =>
{
	if (WebTorrent.WEBRTC_SUPPORT)
	{
		dragDrop('body', async (files) => await shareFiles(files));
	}
};

export const HoldingOverlay = () => (
	<div id='holding-overlay'>
		Drop files here to share them
	</div>
);
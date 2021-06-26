import type Room from 'lib-edumeet/src/Room';
import type { Store } from 'redux';
import type { IntlShape } from 'react-intl';

import * as requestActions from './actions/requestActions';
import * as roomActions from './actions/roomActions';
import * as settingsActions from './actions/settingsActions';
import Logger from './Logger';
const logger = new Logger('keyBindings');

let keyDownListener: (event: KeyboardEvent) => void;
let keyUpListener: (event: KeyboardEvent) => void;

export function startKeyListener(room: Room, store: Store, intl: IntlShape)
{
	keyDownListener = async (event: KeyboardEvent) =>
	{
		if (event.repeat) return;
		const key = String.fromCharCode(event.which);

		const source = event.target as any;

		const exclude = [ 'input', 'textarea', 'div' ];

		if (source.tagName && exclude.includes(source.tagName.toLowerCase()))
		{
			return;
		}

		logger.debug('keyDown() [key:"%s"]', key);

		switch (key)
		{
			case 'A': {
				// Activate advanced mode
				store.dispatch(settingsActions.toggleAdvancedMode());
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'room.toggleAdvancedMode',
							defaultMessage : 'Toggled advanced mode'
						})
					})
				);
				break;
			}

			case '1': {
				// Set democratic view
				store.dispatch(roomActions.setDisplayMode('democratic'));
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'room.setDemocraticView',
							defaultMessage : 'Changed layout to democratic view'
						})
					})
				);
				break;
			}

			case '2': {
				// Set filmstrip view
				store.dispatch(roomActions.setDisplayMode('filmstrip'));
				store.dispatch(
					requestActions.notify({
						text : intl.formatMessage({
							id             : 'room.setFilmStripView',
							defaultMessage : 'Changed layout to filmstrip view'
						})
					})
				);
				break;
			}

			case ' ': {
				// Push To Talk start
				room.producers.unmuteMicrophone();

				break;
			}
			case 'M': {
				// Toggle microphone
				if (room.producers.isMicrophoneStarted())
				{
					if (room.producers.isMicrophoneActive())
					{
						await room.producers.muteMicrophone();

						store.dispatch(
							requestActions.notify({
								text : intl.formatMessage({
									id             : 'devices.microphoneMute',
									defaultMessage : 'Muted your microphone'
								})
							})
						);
					}
					else
					{
						await room.producers.unmuteMicrophone();

						store.dispatch(
							requestActions.notify({
								text : intl.formatMessage({
									id             : 'devices.microphoneUnMute',
									defaultMessage : 'Unmuted your microphone'
								})
							})
						);
					}
				}
				else
				{
					await room.producers.startMicrophone();

					store.dispatch(
						requestActions.notify({
							text : intl.formatMessage({
								id             : 'devices.microphoneEnable',
								defaultMessage : 'Enabled your microphone'
							})
						})
					);
				}

				break;
			}

			case 'V': {
				// Toggle video
				if (room.producers.isWebcamActive())
				{
					room.producers.stopWebcam();
				}
				else
				{
					room.producers.startWebcam();
				}
				break;
			}

			case 'H': {
				// Open help dialog
				store.dispatch(roomActions.setHelpOpen(true));

				break;
			}

			default: {
				break;
			}
		}
	};

	keyUpListener = async (event: KeyboardEvent) =>
	{
		const key = String.fromCharCode(event.which);
		const source = event.target as any;
		const exclude = [ 'input', 'textarea', 'div' ];

		if (source.tagName && exclude.includes(source.tagName.toLowerCase()))
		{
			return;
		}
		logger.debug('keyUp() [key:"%s"]', key);
		switch (key)
		{
			case ' ': {
				// Push To Talk stop
				if (room.producers.isMicrophoneActive())
				{
					await room.producers.muteMicrophone();
				}
				break;
			}
			default: {
				break;
			}
		}
		event.preventDefault();
	};

	// Add keydown event listener on document
	document.addEventListener('keydown', keyDownListener);
	document.addEventListener('keyup', keyUpListener, true);
}

export function stopKeyListener()
{
	document.removeEventListener('keydown', keyDownListener);
	document.removeEventListener('keyup', keyUpListener);
}

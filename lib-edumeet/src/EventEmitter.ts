import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

export type IEventsDescriptor = {[eventName: string]: (payload: any) => void}

export class EventEmitterTyped<T extends IEventsDescriptor> extends (EventEmitter as { new<T>(): TypedEmitter<T> })<T> {
	pipeEvents(target: EventEmitterTyped<any>, events: string[]) {
		for (const eventName of events) {
			// @ts-ignore
			this.on(eventName, (...args) => {
				target.emit(eventName, ...args);
			});
		}

	}
}

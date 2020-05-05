import RoomClient from '../RoomClient';

describe('new RoomClient() without parameters throws Error', () =>
{
	test('Matches the snapshot', () =>
	{
		expect(() => new RoomClient()).toThrow(Error);
	});
});
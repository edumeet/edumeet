import RoomAdapter from '../RoomAdapter';

describe('new RoomAdapter() without parameters throws Error', () =>
{
	test('Matches the snapshot', () =>
	{
		expect(() => new RoomAdapter()).toThrow(Error);
	});
});
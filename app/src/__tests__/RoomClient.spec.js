import RoomClient from '../RoomClient';

describe('new RoomClient() without paramaters throws Error', () =>
{
	test('Matches the snapshot', () =>
	{
		expect(() => new RoomClient()).toThrow(Error);
	});
});
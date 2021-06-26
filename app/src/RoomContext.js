import React from 'react';

const RoomContext = React.createContext();

export default RoomContext;

export function withRoomContext(Component)
{
	return (props) => ( // eslint-disable-line react/display-name
		<RoomContext.Consumer>
			{(roomAdapter) => (
				<Component {...props}
					roomClient={roomAdapter}
					edumeetRoom={roomAdapter.room}
				/>
			)}
		</RoomContext.Consumer>
	);
}
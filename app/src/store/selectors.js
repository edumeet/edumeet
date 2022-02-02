import { createSelector } from 'reselect';

const meRolesSelect = (state) => state.me.roles;
const userRolesSelect = (state) => state.room.userRoles;
const roomPermissionsSelect = (state) => state.room.roomPermissions;
const roomAllowWhenRoleMissing = (state) => state.room.allowWhenRoleMissing;
const producersSelect = (state) => state.producers;
const consumersSelect = (state) => state.consumers;
const spotlightsSelector = (state) => state.room.spotlights;
const peersSelector = (state) => state.peers;
const meSelector = (state) => state.me;
const recorderSelect = (state) => state.recorder;
const lobbyPeersSelector = (state) => state.lobbyPeers;
const getPeerConsumers = (state, id) =>
	(state.peers[id] ? state.peers[id].consumers : null);
const isHiddenSelect = (state) => state.room.hideSelfView;
const getAllConsumers = (state) => state.consumers;
const peersKeySelector = createSelector(
	peersSelector,
	(peers) => Object.keys(peers)
);

export const peersValueSelector = createSelector(
	peersSelector,
	(peers) => Object.values(peers)
);

export const lobbyPeersKeySelector = createSelector(
	lobbyPeersSelector,
	(lobbyPeers) => Object.keys(lobbyPeers)
);

export const micProducersSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).filter((producer) => producer.source === 'mic')
);

export const webcamProducersSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).filter((producer) => producer.source === 'webcam')
);

export const screenProducersSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).filter((producer) => producer.source === 'screen')
);

export const extraVideoProducersSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).filter((producer) => producer.source === 'extravideo')
);

export const micProducerSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).find((producer) => producer.source === 'mic')
);

export const webcamProducerSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).find((producer) => producer.source === 'webcam')
);

export const screenProducerSelector = createSelector(
	producersSelect,
	(producers) => Object.values(producers).find((producer) => producer.source === 'screen')
);

export const micConsumerSelector = createSelector(
	consumersSelect,
	(consumers) => Object.values(consumers).filter((consumer) => consumer.source === 'mic')
);

export const webcamConsumerSelector = createSelector(
	consumersSelect,
	(consumers) => Object.values(consumers).filter((consumer) => consumer.source === 'webcam')
);

export const screenConsumerSelector = createSelector(
	consumersSelect,
	(consumers) => Object.values(consumers).filter((consumer) => consumer.source === 'screen')
);

export const spotlightScreenConsumerSelector = createSelector(
	spotlightsSelector,
	consumersSelect,
	(spotlights, consumers) =>
		Object.values(consumers).filter(
			(consumer) => consumer.source === 'screen' && spotlights.includes(consumer.peerId)
		)
);

export const spotlightExtraVideoConsumerSelector = createSelector(
	spotlightsSelector,
	consumersSelect,
	(spotlights, consumers) =>
		Object.values(consumers).filter(
			(consumer) => consumer.source === 'extravideo' && spotlights.includes(consumer.peerId)
		)
);

export const passiveMicConsumerSelector = createSelector(
	spotlightsSelector,
	consumersSelect,
	(spotlights, consumers) =>
		Object.values(consumers).filter(
			(consumer) => consumer.source === 'mic' && !spotlights.includes(consumer.peerId)
		)
);

export const highestRoleLevelSelector = createSelector(
	meRolesSelect,
	userRolesSelect,
	(roles, userRoles) =>
	{
		let level = 0;

		for (const role of roles)
		{
			const tmpLevel = userRoles.get(role).level;

			if (tmpLevel > level)
				level = tmpLevel;
		}

		return level;
	}
);

export const spotlightsLengthSelector = createSelector(
	spotlightsSelector,
	(spotlights) => spotlights.length
);

export const spotlightPeersSelector = createSelector(
	spotlightsSelector,
	peersKeySelector,
	(spotlights, peers) => peers.filter((peerId) => spotlights.includes(peerId))
);

export const spotlightSortedPeersSelector = createSelector(
	spotlightsSelector,
	peersValueSelector,
	(spotlights, peers) =>
		peers.filter((peer) => spotlights.includes(peer.id) && !peer.raisedHand)
			.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
);

const raisedHandSortedPeers = createSelector(
	peersValueSelector,
	(peers) => peers.filter((peer) => peer.raisedHand)
		.sort((a, b) => a.raisedHandTimestamp - b.raisedHandTimestamp)
);

const peersSortedSelector = createSelector(
	spotlightsSelector,
	peersValueSelector,
	(spotlights, peers) =>
		peers.filter((peer) => !spotlights.includes(peer.id) && !peer.raisedHand)
			.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
);

export const participantListSelector = createSelector(
	raisedHandSortedPeers,
	spotlightSortedPeersSelector,
	peersSortedSelector,
	(raisedHands, spotlights, peers) =>
		[ ...raisedHands, ...spotlights, ...peers ]
);

export const peersLengthSelector = createSelector(
	peersSelector,
	(peers) => Object.values(peers).length
);

export const passivePeersSelector = createSelector(
	peersValueSelector,
	spotlightsSelector,
	(peers, spotlights) => peers.filter((peer) => !spotlights.includes(peer.id))
		.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
);

export const raisedHandsSelector = createSelector(
	peersValueSelector,
	(peers) => peers.reduce((a, b) => (a + (b.raisedHand ? 1 : 0)), 0)
);

export const videoBoxesSelector = createSelector(
	isHiddenSelect,
	spotlightsLengthSelector,
	screenProducersSelector,
	spotlightScreenConsumerSelector,
	extraVideoProducersSelector,
	spotlightExtraVideoConsumerSelector,
	(
		isHidden,
		spotlightsLength,
		screenProducers,
		screenConsumers,
		extraVideoProducers,
		extraVideoConsumers
	) =>
	{
		return spotlightsLength + (isHidden ? 0 : 1) +
			(isHidden ? 0 : screenProducers.length) + screenConsumers.length +
			(isHidden ? 0 : extraVideoProducers.length) + extraVideoConsumers.length;
	}
);

export const meProducersSelector = createSelector(
	micProducerSelector,
	webcamProducerSelector,
	screenProducerSelector,
	extraVideoProducersSelector,
	(micProducer, webcamProducer, screenProducer, extraVideoProducers) =>
	{
		return {
			micProducer,
			webcamProducer,
			screenProducer,
			extraVideoProducers
		};
	}
);

export const makePeerConsumerSelector = () =>
{
	return createSelector(
		getPeerConsumers,
		getAllConsumers,
		(consumers, allConsumers) =>
		{
			if (!consumers)
				return null;

			const consumersArray = consumers
				.map((consumerId) => allConsumers[consumerId]);
			const micConsumer =
				consumersArray.find((consumer) => consumer.source === 'mic');
			const webcamConsumer =
				consumersArray.find((consumer) => consumer.source === 'webcam');
			const screenConsumer =
				consumersArray.find((consumer) => consumer.source === 'screen');
			const extraVideoConsumers =
				consumersArray.filter((consumer) => consumer.source === 'extravideo');

			return { micConsumer, webcamConsumer, screenConsumer, extraVideoConsumers };
		}
	);
};

// Very important that the Components that use this
// selector need to check at least these state changes:
//
// areStatesEqual : (next, prev) =>
// {
// 		return (
// 			prev.room.roomPermissions === next.room.roomPermissions &&
// 			prev.room.allowWhenRoleMissing === next.room.allowWhenRoleMissing &&
// 			prev.peers === next.peers &&
// 			prev.me.roles === next.me.roles
// 		);
// }
export const makePermissionSelector = (permission) =>
{
	return createSelector(
		meRolesSelect,
		roomPermissionsSelect,
		roomAllowWhenRoleMissing,
		peersValueSelector,
		(roles, roomPermissions, allowWhenRoleMissing, peers) =>
		{
			if (!roomPermissions)
				return false;

			const permitted = roles.some((roleId) =>
				roomPermissions[permission].some((permissionRole) =>
					roleId === permissionRole.id
				)
			);

			if (permitted)
				return true;

			if (!allowWhenRoleMissing)
				return false;

			// Allow if config is set, and no one is present
			if (allowWhenRoleMissing.includes(permission) &&
				peers.filter(
					(peer) =>
						peer.roles.some(
							(roleId) => roomPermissions[permission].some((permissionRole) =>
								roleId === permissionRole.id
							)
						)
				).length === 0
			)
				return true;

			return false;
		}
	);
};

export const recordingInProgressSelector = createSelector(
	peersValueSelector,
	recorderSelect,
	(peers, recorder) =>
	{
		if (
			recorder.localRecordingState.status === 'start' ||
			recorder.localRecordingState.status === 'resume' ||
			peers.findIndex((e) =>
				e.localRecordingState !== undefined &&
				(
					e.localRecordingState === 'start' ||
					e.localRecordingState === 'resume'
				)
			) !== -1
		)
		{
			return true;
		}
		else if (
			recorder.localRecordingState.status === 'init' ||
			recorder.localRecordingState.status === 'stop' ||
			recorder.localRecordingState.status === 'pause' ||
			peers.findIndex((e) =>
				e.localRecordingState !== undefined &&
				(
					e.localRecordingState === 'start' ||
					e.localRecordingState === 'resume'
				)
			) === -1

		)
			return false;
	}
);

export const recordingConsentsPeersSelector = createSelector(
	peersValueSelector,
	(peers) =>
	{
		const recordingconsents = [];

		peers.forEach((e) =>
		{
			if (
				e.localRecordingConsent !== undefined &&
				e.localRecordingConsent === 'agreed'
			)
			{
				recordingconsents.push(e.id);
			}
		});

		return recordingconsents;
	}
);

export const recordingInProgressPeersSelector = createSelector(
	peersValueSelector,
	meSelector,
	recorderSelect,
	(peers, me, recorder) =>
	{
		const recordingpeers = [];

		if (
			recorder !== undefined &&
			(
				recorder.localRecordingState.status === 'start' ||
				recorder.localRecordingState.status === 'resume'
			)
		)
		{
			recordingpeers.push(me.id);
		}
		peers.forEach((e) =>
		{
			if (
				e.recorder !== undefined &&
				(
					e.recorder.localRecordingState.status === 'start' ||
					e.recorder.localRecordingState.status === 'resume'
				)
			)
			{
				recordingpeers.push(e.id);
			}
		});

		return recordingpeers;
	}
);

# Webinars in eduMEET

## Acknowledgement

This work was funded through the **NGI0 Core Fund**, a fund established by **NLnet** with financial support
from the **European Commission's Next Generation Internet** programme, under the aegis of DG Communications
Networks, Content and Technology under grant agreement **No 101092990**. It corresponds to NLnet project
**2024-10-244 - "Federated webinars for eduMEET"**.

We gratefully acknowledge NLnet and the EC NGI Zero Core fund for their support.
More at [nlnet.nl/project/eduMEET-webinars](https://nlnet.nl/project/) and [nlnet.nl](https://nlnet.nl/).

---

## Introduction

eduMEET is a free/open-source (MIT-licensed) WebRTC conferencing platform built for the research and
education community, designed to run on-premises with strong privacy and sovereignty guarantees. This
document describes the **webinar** capability of eduMEET: support for large-scale, presenter-led online
events delivered on the same infrastructure as ordinary meetings.

**What a "webinar" means here.** A webinar is a session with a **small number of speakers and a large,
mostly view-only audience** - a lecture, a town-hall, a public broadcast. The technical requirements that
follow from this are: (1) the media infrastructure must scale a single event to a very large audience;
(2) the audience must be view-only by default while designated people may present; (3) hosts must be able
to promote/demote speakers, including live during the event; and (4) organizers must be able to create,
schedule and operate such events.

**Design philosophy - webinars without a separate product.** Rather than building a parallel "webinar
server" or a one-way streaming product, eduMEET delivers webinars as a **configuration of the existing,
well-tested meeting platform**. A webinar is an ordinary room running on the standard multi-media-node
infrastructure, where the audience is given a view-only default role and only organizers/presenters may
speak and present. This means **any room can be a webinar room**, there is one codebase to maintain, and
every capability described below is already part of the shipping product.

**What was delivered.** The four requirements above map directly onto eduMEET components:

| Webinar requirement | How eduMEET delivers it | See |
| --- | --- | --- |
| Scale one event to thousands | Distributed media-node pool with geo/load routing and inter-node media bridging | §1 |
| View-only audience, designated presenters | Role/permission model + a view-only default role | §2, §3 |
| Promote/demote speakers, incl. live | Pre-assigned roles + on-the-fly permission changes + lobby admission | §4 |
| Speaker-focused experience | Active-speaker spotlight & presentation layout | §5 |
| Create / schedule / operate webinars | Management server: rooms, roles, scheduled meetings, calendar invites | §6 |

**Validation.** The webinar scenario has been **load-tested with 512 headless browser clients distributed
across a pool of 6 media nodes**, exercising exactly the few-senders/many-receivers traffic shape that a
webinar produces (see §7). This validates the horizontal-scaling design in §1 at the multi-node, multi-
hundred-client scale.

This document maps each proposed element to its concrete implementation. File links point to the public
repositories under [github.com/edumeet](https://github.com/edumeet) on branch `main`.

---

## 1. Architecture - multi-node media for thousands of users

### 1.1 Topology

A deployment is composed of:

| Component | Role |
| --- | --- |
| **edumeet-room-server** | Session orchestrator. Owns room state, peers, roles/permissions, and decides which media node serves each participant. One room-server runs a whole deployment. |
| **edumeet-media-node** (pool) | The SFU workers (mediasoup). Each node runs multiple workers/routers and does the actual RTP forwarding. Capacity is increased simply by adding nodes to the pool. |
| **edumeet-client** | Browser app (React/Redux). Produces/consumes media and renders the speaker-oriented layout. |
| **edumeet-management-server** | Admin/REST layer for tenants, rooms, roles, permissions, scheduled meetings and invites. |

A room is **not** pinned to one server. The room-server holds **one mediasoup Router per media node** that
the room uses, and assigns each joining participant to the most suitable node. The official project site
describes this as a *"shared media node pool"* with *"routing by geography and load"*
([edumeet.eu](https://edumeet.eu/)).

### 1.2 How a participant is placed on a node

When a peer needs media, the room-server selects a media node from the pool:

- **Sticky**: prefer a node the room already uses, if it is within load/geo limits.
- **Geographic**: nearest node by great-circle distance using a KD-tree nearest-neighbour search
  (with a same-country preference and a distance breakpoint), so users connect to a close node.
- **Load-aware**: nodes above a load threshold are skipped, spreading participants across the pool.
- **Region policy**: per-tenant region restrictions can constrain which nodes are eligible.

Implementation:
[`MediaService.ts` - `getRouter`/`getCandidates`](https://github.com/edumeet/edumeet-room-server/blob/main/src/MediaService.ts),
KD-tree in [`edumeet-common`](https://github.com/edumeet/edumeet-common),
peer→router assignment in [`Room.ts` - `doAssignRouter`](https://github.com/edumeet/edumeet-room-server/blob/main/src/Room.ts).

### 1.3 Bridging media between nodes (the key to scale)

When a room spans several media nodes, the routers on those nodes are connected with **mediasoup pipe
transports**. A producer (e.g. a presenter's camera) is piped **once** from its origin node to each other
node that has viewers, and each node then fans the stream out locally to all of its consumers.

Implementation:
[`Router.ts` - `pipeToRouter` / `addPipeTransportPair`](https://github.com/edumeet/edumeet-room-server/blob/main/src/media/Router.ts),
lazy creation + caching of pipes in
[`consuming.ts` - `checkPipe`/`createConsumers`](https://github.com/edumeet/edumeet-room-server/blob/main/src/common/consuming.ts).

### 1.4 Why this scales a webinar to thousands

A webinar has the ideal traffic shape for this design: **few senders, many receivers**.

- A presenter publishes **one** upstream. The room-server pipes it once per media node (not once per
  viewer). Each node then serves its **local** viewers independently.
- Viewer capacity therefore grows **horizontally**: add media nodes and the same event serves more
  viewers, because inter-node traffic stays proportional to the (small) number of presenters and nodes,
  not to the audience size.
- Because participants are auto-distributed by geography and load (§1.2), a large audience is spread over
  the whole pool instead of overloading a single server.

This is what makes an eduMEET webinar able to support thousands of concurrent viewers: the audience is
partitioned across the media-node pool, and presenter media is bridged node-to-node a small, bounded
number of times. This behaviour has been validated under load with **512 headless browser clients spread
across 6 media nodes** (see §7).

### 1.5 Operating considerations

- Media nodes are health-checked and can flap/recover without taking the room down; the room-server
  re-assigns and re-pipes as needed.
- `maxActiveVideos` (room-level) bounds how many video streams a client renders at once - important for
  large rooms where only the active speaker(s)/presenter(s) need full video.

---

## 2. Roles and permissions

### 2.1 The permission catalogue

Permissions are defined once on the server and mirrored on the client. There are 16:

| Permission | Meaning |
| --- | --- |
| `BYPASS_ROOM_LOCK` | Enter the room even when it is locked (skip the lobby). |
| `CHANGE_ROOM_LOCK` | Lock/unlock the room. |
| `PROMOTE_PEER` | Admit a peer waiting in the lobby. |
| `MODIFY_ROLE` | Give/remove roles to/from other peers. |
| `SEND_CHAT` | Send chat messages. |
| `MODERATE_CHAT` | Clear/moderate chat. |
| `SHARE_AUDIO` | Publish microphone (and screen-audio). |
| `SHARE_VIDEO` | Publish webcam. |
| `SHARE_SCREEN` | Publish a screen share. |
| `SHARE_EXTRA_VIDEO` | Publish an additional video/audio source (e.g. slides, second camera). |
| `SHARE_FILE` | Share files. |
| `MODERATE_FILES` | Moderate shared files. |
| `MODERATE_ROOM` | Moderator powers: mute/stop others, kick, close meeting, lower hands, set permissions live. |
| `LOCAL_RECORD_ROOM` | Locally record the room. |
| `CREATE_ROOM` | Create rooms. |
| `CHANGE_ROOM` | Join/leave rooms. |

Source of truth:
[`authorization.ts` - `enum Permission`](https://github.com/edumeet/edumeet-room-server/blob/main/src/common/authorization.ts);
client mirror in
[`roles.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/utils/roles.tsx).

### 2.2 What "may I present?" actually checks

Publishing any media is gated by `permittedProducer()`, which maps each media source to the permission it
requires:

| Media source (`MediaSourceType`) | Required permission |
| --- | --- |
| `mic`, `screenaudio` | `SHARE_AUDIO` |
| `webcam` | `SHARE_VIDEO` |
| `screen` | `SHARE_SCREEN` |
| `extravideo`, `extraaudio` | `SHARE_EXTRA_VIDEO` |

This check runs on every `produce` request, and also on the peer-to-peer publish path (`peerProduce`), so a
view-only participant **cannot** publish audio, video, screen or extra video by any route.

Source:
[`authorization.ts` - `permittedProducer`](https://github.com/edumeet/edumeet-room-server/blob/main/src/common/authorization.ts),
enforced in
[`mediaMiddleware.ts` - `produce`/`peerProduce`](https://github.com/edumeet/edumeet-room-server/blob/main/src/middlewares/mediaMiddleware.ts).

### 2.3 How a peer's permissions are computed

When a peer joins (or whenever roles change), `updatePeerPermissions()` computes the effective permission
set:

- **Room owner → all permissions.** Owners always receive the full set (`allPermissions`).
- **Everyone else → the union of:** the permissions of their per-user room roles, the permissions of any
  group roles they inherit, and the room's **default role**.
- The set is recomputed live on any role/permission/ownership/group change, and the peer is notified - this
  is what makes "promote during the call" work without a rejoin (see §4).

Source:
[`authorization.ts` - `updatePeerPermissions` and the `add*/remove*` handlers](https://github.com/edumeet/edumeet-room-server/blob/main/src/common/authorization.ts).

### 2.4 The three webinar roles to create in the management UI

eduMEET ships the **mechanism** (roles + permissions + default role); a webinar is produced by creating
three roles in the management UI and assigning them. Create these once per tenant in
**Management → Roles** ([Role admin UI](https://github.com/edumeet/edumeet-client/blob/main/src/components/managementservice/role/Role.tsx)):

#### a) Webinar Organizer - *modelled as the room owner*

Do **not** create a role for this; the organizer is the **room Owner**. Owners automatically get every
permission (§2.3), including `MODERATE_ROOM`, `PROMOTE_PEER`, `MODIFY_ROLE`, `CHANGE_ROOM_LOCK` and all
`SHARE_*`. Assign organizers as owners of the room in
**Management → Rooms → Owners**
([room owners model](https://github.com/edumeet/edumeet-room-server/blob/main/src/common/types.ts);
owner ⇒ all permissions in `updatePeerPermissions`).

#### b) Presenter - *the role that may present*

A role granting exactly the permissions needed to present:

| Presenter permission | Why |
| --- | --- |
| `SHARE_AUDIO` | speak |
| `SHARE_VIDEO` | show camera |
| `SHARE_SCREEN` | present screen |
| `SHARE_EXTRA_VIDEO` | slides / secondary source |
| `SEND_CHAT` | participate in chat |
| `BYPASS_ROOM_LOCK` | enter directly even when the webinar room is locked |

(Optionally add `LOCAL_RECORD_ROOM`. Do **not** add `MODERATE_ROOM` unless the presenter should also
moderate.)

#### c) Webinar Participant - *view-only audience; the room default role*

A deliberately minimal role with **no** `SHARE_*` permissions, so the holder can watch and listen but
cannot publish:

| Webinar Participant permission | Notes |
| --- | --- |
| `SEND_CHAT` | optional - allow audience chat / Q&A in text |
| *(nothing else)* | **no** `SHARE_AUDIO`, `SHARE_VIDEO`, `SHARE_SCREEN`, `SHARE_EXTRA_VIDEO` |

Because none of the `SHARE_*` permissions are present, `permittedProducer()` (§2.2) rejects any attempt by
a participant to send microphone, camera, screen or extra video. Raise-hand and reactions are room-level
features (toggles), not permissions, so the audience can still raise a hand to ask to speak (see §4).

---

## 3. Making any room a webinar room (the "flexible webinar" model)

There is intentionally **no separate "webinar mode" button**. The capability is implemented as a flexible
configuration so that **any room on the multi-media-node deployment can act as a webinar room**. The
organizer turns a room into a webinar by setting its **default role to "Webinar Participant"**:

1. In **Management → Rooms**, edit the room and set **Default role = Webinar Participant**
   ([room `defaultRole`/`defaultRoleId`](https://github.com/edumeet/edumeet-management-server/blob/main/src/services/rooms/rooms.schema.ts);
   stored as a `defaultRoleId` FK to `roles`,
   [migration](https://github.com/edumeet/edumeet-management-server/blob/main/migrations/20230118072156_initial.ts)).
   Now everyone who joins without another role is view-only by default.
2. **Pre-assign Presenters**: in **Management → Rooms → User roles**, assign the **Presenter** role to the
   speakers
   ([user-role assignment UI](https://github.com/edumeet/edumeet-client/blob/main/src/components/managementservice/rooms/roomUserRole.tsx)).
   You can also assign Presenter to an entire **group**
   ([group-role assignment UI](https://github.com/edumeet/edumeet-client/blob/main/src/components/managementservice/groups/GroupRole.tsx)).
3. **Pre-assign Organizers**: add the hosts as room **Owners** (they get full moderator powers).
4. Optionally **lock** the room so the audience lands in the lobby until admitted (Organizers/Presenters
   carry `BYPASS_ROOM_LOCK` and enter directly).

Because role resolution is the union of user role + group roles + default role (§2.3), the same room serves
all three audiences correctly at once: owners moderate, presenters speak, everyone else watches.

This design is strictly more flexible than a fixed "webinar/meeting" switch: the same room can be a normal
meeting (no view-only default role) or a webinar (Webinar Participant default role) just by changing the
default role, with no separate room type, schema, or server.

---

## 4. Promotion - turning an attendee into a presenter

Two complementary mechanisms exist, both already implemented.

### 4.1 Pre-assignment (before/independent of the call)

Assign the Presenter role (or Owner) to users or groups in the management UI (§3). The room-server applies
it the moment the user is present - `addRoomUserRole`/`addRoomGroupRole`/`addRoomOwner` call
`updatePeerPermissions` immediately, so a pre-assigned presenter is a presenter from the moment they join.
Source: [`authorization.ts` handlers](https://github.com/edumeet/edumeet-room-server/blob/main/src/common/authorization.ts).

### 4.2 Live promotion during the call (dynamic permissions)

An organizer/moderator can promote an attendee to presenter **in the running webinar**, without a rejoin,
using the on-the-fly permission controls:

- `moderator:getPermissions` returns every peer and its current permissions.
- `moderator:setPermissions` applies per-peer permission add/remove updates.

Safeguards in the implementation:
- The caller must hold `MODERATE_ROOM`.
- A caller can only grant or revoke permissions **they themselves possess** (you cannot mint permissions
  you don't have).
- Changes take effect immediately and the affected peer is re-evaluated.

So to promote an audience member to presenter mid-event, the host grants them
`SHARE_AUDIO`/`SHARE_VIDEO`/`SHARE_SCREEN`/`SHARE_EXTRA_VIDEO` - and can demote them again the same way.

Source:
[`moderatorMiddleware.ts` - `getPermissions`/`setPermissions`](https://github.com/edumeet/edumeet-room-server/blob/main/src/middlewares/moderatorMiddleware.ts);
client UI
[`PermissionsDialog.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/components/permissionsdialog/PermissionsDialog.tsx),
exposed from the participant list
[`ListModerator.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/components/participantlist/ListModerator.tsx).

### 4.3 Lobby promotion (gated entry)

For locked webinars, attendees wait in the lobby and a host with `PROMOTE_PEER` admits them (individually
or all at once). A peer that gains `BYPASS_ROOM_LOCK` while waiting is auto-admitted.
Source:
[`lobbyMiddleware.ts`](https://github.com/edumeet/edumeet-room-server/blob/main/src/middlewares/lobbyMiddleware.ts),
auto-promote logic in `updatePeerPermissions`.

### 4.4 Moderator controls during a webinar

Holders of `MODERATE_ROOM` can mute a peer or everyone, stop a peer's/everyone's video or screen share,
lower raised hands, kick a peer, and close the meeting - exactly the controls a webinar host needs.
Source:
[`moderatorMiddleware.ts`](https://github.com/edumeet/edumeet-room-server/blob/main/src/middlewares/moderatorMiddleware.ts).

---

## 5. Speaker-oriented interface

The client renders a speaker-focused layout suited to webinars:

- **Active-speaker spotlight**: the server's active-speaker signal is applied on the client, which moves the
  current speaker to the front of the spotlight set; the active speaker's tile is visually highlighted.
  Sources:
  [`roomMiddleware.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/store/middlewares/roomMiddleware.tsx),
  [`roomSessionsSlice.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/store/slices/roomSessionsSlice.tsx),
  [`VideoBox.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/components/videobox/VideoBox.tsx).
- **Presentation view**: screen shares and extra-video (slides) are rendered in a dedicated spotlight area,
  fit-to-screen.
  Source: [`Spotlights.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/components/spotlights/Spotlights.tsx).
- **Grid vs spotlight orchestration** and **hide-self-view** (presenters needn't see themselves), with
  **pin/select** of specific peers.
  Sources:
  [`MainContent.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/components/maincontent/MainContent.tsx),
  [`Democratic.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/components/democratic/Democratic.tsx).
- **`maxActiveVideos`** bounds rendered video tiles, so an audience member's client stays light even in a
  very large webinar.

---

## 6. Webinar management and scheduling

The management server provides the create/operate surface for webinar rooms:

- **Rooms** - CRUD, ownership, default-role, per-room media/recording settings:
  [`rooms.ts`](https://github.com/edumeet/edumeet-management-server/blob/main/src/services/rooms/rooms.ts),
  [`rooms.schema.ts`](https://github.com/edumeet/edumeet-management-server/blob/main/src/services/rooms/rooms.schema.ts).
- **Scheduled meetings** (one-off and recurring via RRULE), attendees and RSVP:
  [`meetings.ts`](https://github.com/edumeet/edumeet-management-server/blob/main/src/services/meetings/meetings.ts),
  [`meetingAttendees`](https://github.com/edumeet/edumeet-management-server/blob/main/src/services/meetingAttendees/).
- **Calendar invitations** (standards-based iCalendar / iTIP, SMTP send + IMAP RSVP polling), so a webinar
  can be announced to its audience by email:
  [`invites/`](https://github.com/edumeet/edumeet-management-server/blob/main/src/invites/).
- **Roles, permissions, groups, tenants** services back the role model in §2:
  [`services/`](https://github.com/edumeet/edumeet-management-server/blob/main/src/services/).
- **Client management UI**:
  [`managementservice/`](https://github.com/edumeet/edumeet-client/blob/main/src/components/managementservice/) and the
  [meetings dialog](https://github.com/edumeet/edumeet-client/blob/main/src/components/meetingsdialog/MeetingsDialog.tsx).

---

## 7. Testing, documentation and releases

- **Load / scale test (webinar scenario).** The webinar traffic shape was exercised end-to-end with
  **512 headless browser clients across 6 geographically-distributed media nodes** (Poland ×2, Finland,
  Portugal, Germany, Denmark), with a 10-person panel (1 presenter + 9 panelists) and a ~502 view-only
  audience. Clients were spread by geo/load routing (§1.2), presenter/panel media was bridged between
  nodes via pipe transports (§1.3), and the audience consumed it locally on each node. The full media-load
  calculation - per-stream bitrates from the VP8 simulcast profiles, ingest, per-node egress and
  inter-node bridging - is reported in **[WEBINAR-LOADTEST.md](WEBINAR-LOADTEST.md)**. The run confirms
  the few-senders/many-receivers design: audience egress divides across the node pool while inter-node
  bridging stays bounded by the (small) panel size, independent of audience size.
- **Automated tests** (Jest) cover the distributed media path that webinars rely on - media-node selection
  and load balancing, node connection/retry/failover, and the authorization middlewares:
  [room-server `__tests__`](https://github.com/edumeet/edumeet-room-server/tree/main/__tests__)
  (e.g. [`LoadBalancing.test.ts`](https://github.com/edumeet/edumeet-room-server/blob/main/__tests__/integration-tests/LoadBalancing.test.ts)),
  [media-node `__tests__`](https://github.com/edumeet/edumeet-media-node/tree/main/__tests__),
  [common `__tests__`](https://github.com/edumeet/edumeet-common/tree/main/__tests__).
- **Webinar role tests** specifically verify the role mechanics: a view-only Participant is blocked from
  publishing mic/camera/screen; Organizer/Presenter/Participant permission resolution; and live
  presenter promotion/demotion with privilege checks -
  [`authorization.test.ts`](https://github.com/edumeet/edumeet-room-server/blob/main/__tests__/unit-tests/common/authorization.test.ts),
  [`moderatorMiddleware.test.ts`](https://github.com/edumeet/edumeet-room-server/blob/main/__tests__/unit-tests/middlewares/moderatorMiddleware.test.ts).
- **Operator & developer documentation**:
  [deployment guide (edumeet-docker)](https://github.com/edumeet/edumeet-docker/blob/main/README.md),
  [room-server config](https://github.com/edumeet/edumeet-room-server/blob/main/README.md),
  [media-node](https://github.com/edumeet/edumeet-media-node/blob/main/README.md),
  [client config](https://github.com/edumeet/edumeet-client/blob/main/README.md).
- **Releases** are published as Docker images (rolling `stable` tag) and tracked in the
  [CHANGELOG](https://github.com/edumeet/edumeet/blob/main/CHANGELOG.md);
  images at [hub.docker.com/u/edumeet](https://hub.docker.com/u/edumeet). The webinar capability shipped
  across the 4.2 series with these milestone releases:
  - **Alpha** - `4.2-20260109-stable` (multi-node + role-based view-only default role: the webinar foundation)
  - **Beta** - `4.2-20260423-stable` (feature-complete: live presenter promotion / on-the-fly permissions)
  - **Release 1.0** - `4.2-20260619-stable` (validation complete; the 6-node / 512-client load test)
- **Public channels** for dissemination: [edumeet.eu](https://edumeet.eu/) / [edumeet.org](https://edumeet.org),
  the [GitHub organisation](https://github.com/edumeet/), Discord, and the community mailing list.

---

## 8. File reference index

| Area | Repository · path |
| --- | --- |
| Node selection / load balancing / geo | `edumeet-room-server/src/MediaService.ts` |
| Peer → router assignment | `edumeet-room-server/src/Room.ts` |
| Inter-node media bridging (pipe transports) | `edumeet-room-server/src/media/Router.ts`, `src/common/consuming.ts` |
| room-server ↔ media-node protocol | `edumeet-common/src/SignalingInterface.ts`, `edumeet-room-server/src/media/MediaNodeConnection.ts`, `edumeet-media-node/src/RoomServer.ts` |
| Permission catalogue | `edumeet-room-server/src/common/authorization.ts`, `edumeet-client/src/utils/roles.tsx` |
| Producer authorization | `edumeet-room-server/src/common/authorization.ts` (`permittedProducer`), `src/middlewares/mediaMiddleware.ts` |
| Effective-permission computation | `edumeet-room-server/src/common/authorization.ts` (`updatePeerPermissions`) |
| Live (on-the-fly) promotion | `edumeet-room-server/src/middlewares/moderatorMiddleware.ts`, `edumeet-client/src/components/permissionsdialog/PermissionsDialog.tsx` |
| Lobby / gated entry | `edumeet-room-server/src/middlewares/lobbyMiddleware.ts` |
| Default role on a room | `edumeet-management-server/src/services/rooms/rooms.schema.ts` + migrations |
| Role / user-role / group-role admin UI | `edumeet-client/src/components/managementservice/{role,rooms,groups}/` |
| Speaker-oriented layout | `edumeet-client/src/components/{spotlights,democratic,maincontent,videobox}/` |
| Management / scheduling / invites | `edumeet-management-server/src/services/`, `src/invites/` |
| Tests | `edumeet-room-server/__tests__/`, `edumeet-media-node/__tests__/`, `edumeet-common/__tests__/` |

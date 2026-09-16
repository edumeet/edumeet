# End-to-end encryption

edumeet can encrypt meeting media end to end, so that the media nodes forwarding it cannot read it.
It is off by default and turned on per tenant or per room. Keys are agreed with MLS (RFC 9420), one
group per room. It has not been independently audited, so the limitations at the end are worth
reading before enabling it for anyone who depends on the guarantee.

## What it protects, and from whom

Without end-to-end encryption a media node terminates SRTP. It decrypts every stream, forwards it,
and re-encrypts it per recipient, so the node handles decoded audio and video. In a federated
deployment those nodes may run on infrastructure operated by other organisations, in other
countries. That node is the party this feature exists to protect against.

With end-to-end encryption on, the media node sees only the leading codec bytes it needs in order to
make forwarding decisions. Everything else is ciphertext it has no key for.

The room server is a different matter. It is trusted for membership, and that is unavoidable in a
browser client: the room server also serves the application, so a hostile room server would not need
to attack the key agreement when it could simply serve a modified client. The design keeps the room
server from ever holding a key, but it cannot stop a room server from lying about who is in the
room. The limitations spell out what that means.

Peer to peer media is not covered by any of this, and does not need to be. It goes directly between
the two browsers rather than through a media node, so the party being guarded against is not in the
path.

## Turning it on

It is off unless enabled. The effective value for a room is resolved as: the per-room setting, then
the tenant default, then the room server configuration, then off. Only an unset value falls through,
so an explicit "off" at any level stops the chain rather than deferring to the next one.

Both the tenant default and the per-room setting are edited from the management views. A tenant can
also lock its default, in which case rooms cannot override it.

A browser that cannot support the WebRTC Encoded Transform API is refused entry to a room that
requires encryption, at the lobby rather than after admission.

The client needs a room server that carries the MLS delivery service, so when upgrading, deploy the
room server before the client or together with it.

## How frames are protected

Media is encrypted inside a worker, before frames reach the network, using `RTCRtpScriptTransform`
and the WebCrypto API. There is no WebAssembly.

Each participant has one frame key that encrypts the frames they send, and every member of the room
derives that key for itself from the group secret, so no key is ever sent to anyone. Encrypting each
frame once, rather than once per recipient, is what keeps this practical: the media node forwards a
single ciphertext to everyone.

Frames are encrypted with AES-GCM-256. The nonce is the key identifier followed by a counter, and it
also serves as the frame header, so decryption needs no shared state beyond the key. The key
identifier is the sender's position in the group and the low bits of the group epoch, as RFC 9605,
the SFrame RFC, specifies for keys that come from MLS.

A small number of leading bytes are left in the clear because the media node has to read them to
make layer forwarding decisions. The count depends on the codec and, for VP8, on whether the frame
is a keyframe. Those clear bytes are authenticated as additional data, so they cannot be tampered
with even though they are readable. Only Opus, VP8 and VP9 have a clear byte layout this
implementation knows. H264 does not, because the browser packetizes it after the transform has run,
so a producer that negotiates anything but those three in an encrypted room is closed rather than
sent unprotected, and the sender prefers a protectable codec up front.

Frames with nothing beyond the clear header, which is what an Opus stream produces during silence
when discontinuous transmission is active, are passed through untouched: they carry no content. Any
frame shorter than the smallest possible encrypted frame is dropped rather than handed to the
decoder unauthenticated.

### Making sure it is actually encrypting

Attaching an encryption transform is not proof that a browser is using it. One browser was observed
accepting the transform and then never passing frames through it, which would send unprotected media
while the interface claimed otherwise.

Three things prevent that:

- A sender holds its real track disabled until its own transform confirms it has processed a frame.
  Until then nothing but silence or a black frame can leave.
- If no frame is processed within a few seconds of the transport connecting, the participant is
  removed from the room with an explanation rather than being allowed to continue unprotected.
- A producer with no transform at all is treated as unconfirmed rather than as nothing to check.

The room indicator reflects confirmed state rather than intent: it shows the room as protected only
once encryption has demonstrably happened, in either direction, so a participant who only receives
gets it too.

## Key agreement

### Why a group

Keys have to change whenever the membership does: a newcomer must not read what was said before it
arrived, and a leaver must not read what is said after. Handing each sender's key to each receiver
would cost one message from every sender to every receiver at every such change, the square of the
room size in a room where many participants send, and that does not shrink with lastN: the SFU
forwards a dozen videos to each receiver, but every sender would have to key every receiver whether
anyone is watching them or not.

MLS avoids that. A room holds a single group secret in a ratchet tree. A membership change is one
commit, broadcast once, of logarithmic size, and every member derives the new epoch's secret from
it. Per-sender frame keys are derived locally from that secret, so nothing per sender is ever sent.
Per membership change, in messages:

| Room                                | Messages                    |
| ----------------------------------- | --------------------------- |
| Meeting, 20 people, all sending     | 20 deliveries of one commit |
| Seminar, 50 people, all sending     | 50                          |
| Conference, 200 people, all sending | 200                         |

Every commit replaces the group secret, so a newcomer cannot read what came before it and a leaver
cannot read what comes after. What a group does not change is keyframes: an epoch change still needs
one from each sender, so the visible cost of a departure is a short resynchronisation of each video.

### The library and the suite

The client uses `ts-mls` ([npm](https://www.npmjs.com/package/ts-mls),
[GitHub](https://github.com/LukaJCB/ts-mls)), a TypeScript implementation of RFC 9420 on top of the
Web Cryptography API, MIT licensed, with no WebAssembly. It pins a 2.0 release candidate rather than
the published 1.6.4, whose `GroupInfo` encoding does not interoperate with other implementations.
Before adoption it was run against the RFC 9420 test vectors, in a message exchange with OpenMLS,
and in groups of 200 members in Node, Chromium and Firefox. The library states plainly that it has
not had a formal security audit.

The ciphersuite is `MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519` for every group. Firefox cannot
run the P-256 suite, because its Web Cryptography implementation cannot export a P-256 key derived
from a secret, and X25519 is the faster suite in every browser besides.

### The group

There is one MLS group per room, breakout rooms included. A breakout belongs to the room and
everyone in it is a room member, so it separates media, which the SFU forwards only within a
session, but not keys. A recording participant is an ordinary member. The group lives as long as the
room: when the room server closes the room, the group goes with it, and the next arrival founds a
new one.

**Joining.** The first member founds the group and publishes its `GroupInfo` to the room server.
Everyone after that commits itself in from that `GroupInfo` with an external commit, so no existing
member has to do anything for an arrival and arrivals do not depend on who else is online. The
server admits one joiner at a time and tells the others to wait a moment, because two newcomers
building on the same `GroupInfo` would race and the loser would start over. The newcomer receives
the new epoch's secret and nothing from before it.

**Leaving.** A member cannot remove itself; some remaining member commits the removal. That member
is chosen deterministically, the remaining member with the lowest position in the tree, and the next
one steps in if it has not acted within a few seconds. Departures within the same fifth of a second
go into one commit, so a server closing several connections costs one commit rather than one each.
The server accepts the first commit built on the current epoch and refuses the rest, and a refused
committer applies the winning commit instead.

**Keeping in step.** Commits reach every member through the server in epoch order. A member that
finds a gap, or that cannot decrypt someone and learns from the server that the group has moved on,
resynchronises by committing itself in again from the current `GroupInfo`, replacing its own leaf. A
member that cannot join or resynchronise within a bounded time leaves the room with an explanation
rather than staying in it unable to read anyone, which is the same fail closed rule as for a
transform that never proves itself.

**Frame keys.** Per epoch, each member derives the SFrame base key from the MLS exporter and from it
a key per sender, following RFC 9605. Receivers get the new epoch's keys as soon as they apply the
commit, and a sender waits a quarter of a second before using its own new key, so that its frames do
not arrive before the receivers can read them. In testing, epoch changes cost no frames after that
delay was added.

**Identity.** A member's leaf carries its participant id, and the room server stamps the sender on
every relayed message, so a commit claiming another member's id is refused. Trust is on first use:
the first signature key seen under a participant id is pinned for the session, and a later leaf
carrying a different key under a known id is flagged in the participant list with a warning. A
reconnect keeps the id and the key pair, so it is not a change of identity.

**Reconnects.** A short reconnect, with the socket back before the room server gives the peer up,
changes nothing. A long one, after which the room server has closed the peer, is a departure for the
others, who remove the leaf, and a fresh join for the returning member.

### The room server

The room server orders commits per group and rejects one built on a stale epoch, holds the current
`GroupInfo` so joiners can commit themselves in, keeps each member's key package, and relays
proposals, commits and Welcomes. All of it is opaque to the server: it never holds a key and cannot
read media. The state is one object per room, and it goes when the room does.

### What it costs

Per member, measured in headless browsers; nineteen operations in twenty were at least this fast:

| Members | Chromium, one commit | Chromium, joiner's own join | Firefox, one commit | Firefox, joiner's own join |
| ------- | -------------------- | --------------------------- | ------------------- | -------------------------- |
| 50      | 3 ms                 | 23 ms                       | 13 to 20 ms         | 83 ms                      |
| 200     | 3 to 4 ms            | 61 ms                       | 10 to 15 ms         | 244 ms                     |

A departure from a room of 200 costs each remaining member a few milliseconds of asynchronous
WebCrypto work, and that cost does not grow with the room. What grows is the newcomer's own join,
because a joiner validates every leaf of the tree it receives. In signalling, a departure is one
commit relayed to every member, and an arrival is one commit relayed likewise plus one `GroupInfo`
download for the newcomer, 54 KB at 200 members.

## Verification

The cryptography, the signalling and the fail closed checks run under unit tests on both sides: the
client's key provider is tested against the real library, the join, resynchronisation and departure
logic against a faked one, and the room server's ordering, joiner queue and cleanup against faked
peers. What a browser actually does with a transform, and whether two browsers can read each other,
was verified by hand in runs across Chrome, Edge, Firefox and Safari: founding and joins, several
people promoted from the lobby at once, departures including the founder's, short and long
reconnects, and a whole room losing the server and founding a new group.

## Browser support

Verified working, including between different browsers: Chrome, Edge, Firefox and Safari. Edge and
Chrome share the Chromium engine with Opera, Brave, Vivaldi and the other Chromium browsers, which
therefore work the same way, though they were not tested one by one. Any browser implementing
`RTCRtpScriptTransform` is allowed to try, and one that accepts the transform without using it is
caught by the checks above rather than by a list of permitted browsers.

Chrome additionally requires the peer connection to be created with encoded insertable streams
enabled, which is why that flag is set only when encryption is on. Setting it unconditionally breaks
media in rooms that are not encrypted.

## Data protection

This section is meant to help a deployment assess encryption against the GDPR or similar rules, for
example in a data protection impact assessment or a transfer assessment. It describes what each part
of the system processes in an encrypted room. It is a technical description, not legal advice.

### What each component sees in an encrypted room

| Component | Processes | Cannot read |
| --- | --- | --- |
| Participant's browser | Everything the participant sees and hears, and the keys | |
| Room server | Display names, user ids of signed in users, IP addresses, room names, membership, chat, files, and the MLS messages it relays | Audio, video, transcripts, keys |
| Management server | Accounts, tenants, rooms, meetings and invitations | Anything from a call |
| Media node | Participant IP addresses and ports; a random id per room session; when connections open and close and when streams pause or resume; who is speaking when; packet sizes and timing; the clear leading bytes of each frame | Audio, video, transcripts, names, accounts, room names, chat |
| Other media nodes of the same room | The encrypted streams of participants connected elsewhere, with their timing and speaking activity, under random ids and without their addresses | The same as a media node |
| TURN server, when used | Participant IP addresses and relayed ciphertext | The same as a media node |

A few of these deserve a note:

- **Room identity.** A media node is asked for a router by a random id created for each room
  session, never by the room name.
- **Speaking activity.** The audio level header of each packet is not encrypted, and the media node
  uses it to detect the active speaker. Silence and speech can be told apart, as the limitations
  below also say.
- **Nothing identifying travels with the media.** Producers, consumers and transports carry
  generated ids. Client monitoring samples, which can carry display names, are not sent from an
  encrypted room, and transcripts are encrypted.

### Points for an assessment

**Encryption does not make the media node anonymous.** A media node needs participant IP addresses
to deliver media, and an IP address is personal data. The organisation running a node therefore
still processes personal data for the deployment, whichever country it is in. What encryption
removes is the content: voices, faces, screens and transcripts.

**Participants on other nodes appear only under random ids.** When a room spans several media nodes,
each node receives the streams of participants connected to the others, but not their addresses.
Whether that counts as personal data for the node's operator depends on whether it has any
reasonable means of linking those ids to people, which in turn depends on who can access the room
server and its logs.

**Region limits are per tenant.** The room server can restrict a tenant's rooms to media nodes in
chosen regions (see Media Node Region Binding in the room server README). The restriction applies to
every participant of the room alike, whatever their own location, and a room keeps using the nodes
it already has when further participants join.

**Identities stay on the room and management servers.** Names, accounts, chat and files never reach
a media node, so where those two servers run is what decides where identifying data is processed.
The room server's debug logs contain IP addresses and display names.

**Encryption is per room.** In a room without it, media nodes handle decoded audio and video, and
client monitoring samples, when enabled, reach the node with display names unless
`obfuscateDisplayName` is set. An assessment that relies on encryption applies to encrypted rooms
only, so a tenant that depends on it should lock its default.

**Some browser features involve third parties.** Transcription uses the browser's own speech
recognition, which sends the speaker's audio to the browser vendor's service and is outside the
encryption. It is off unless enabled in the client configuration. Local recording stays in the
browser.

**The guarantees are bounded.** The room server is trusted for membership, identity is trusted on
first use, and neither the library nor this implementation has been audited. A privacy notice that
describes encryption should say that media nodes cannot read meeting content, rather than that
nobody operating the service can.

## Limitations

**Identity is trusted on first use.** A room server that inserted its own member when a group was
founded could place itself in the group, and nobody would be able to tell, because members only ever
learn each other's keys through it. Pinning detects a key that changes later, not one that was wrong
from the start. Out of band verification, where people compare a short code derived from the group
state, would close this and is not implemented. Neither are signed credentials, which would let
authenticated users be verified against the management server.

**The room server is trusted for membership.** It decides who is in the room, and a member it admits
gets keys like any other. It cannot read a key.

**Forward secrecy is bounded.** Every commit replaces the group secret, but nothing commits in a
room where nobody comes or goes, so a long quiet session stays on one epoch, and a compromised
member key stays in use until the next membership change.

**One group secret protects the whole room.** A compromised member exposes every sender's frames for
the epoch rather than one sender's, which is the price of never distributing a key.

**A leaver can read a short window.** Departures are batched and the removal is a commit round trip
away, so the key changes a fraction of a second after someone leaves, or a few seconds later when
the expected committer is slow and another steps in. Anything sent in that window is readable by
them if they can obtain the ciphertext.

**Old frames can be replayed within the retention window.** Recipients accept any key they still
hold, so a media node could resend frames captured under one of them.

**A media node can misattribute streams.** Decryption looks the key up by the frame's sender
position, not by which participant a consumer belongs to, so a node could route one person's stream
into another's tile. It cannot read or alter the content, only mislabel it.

**Neither the library nor this implementation is audited.** MLS is a protocol where a subtle mistake
in tree handling is invisible in normal use and only matters against an adversary. The RFC 9420 test
vectors and the exchange with OpenMLS are the substitute for the audit neither has had, and an audit
has to precede any stronger claim than keeping federated media nodes out.

**Local recording and transcription see plaintext.** Both run in the browser on decoded media and
are unaffected by encryption. A transcript is sent to the other participants over a data channel,
encrypted under the sender's key for the epoch as its frames are, so the media node forwards it
without being able to read it. The text itself comes from the browser's speech recognition, which
sends the speaker's audio to the browser vendor's service; encryption does not reach that step,
which is worth considering in a room chosen for its privacy.

**Client monitoring is off.** The client normally sends connection statistics to the media node over
a data channel, and the node reads them. In an end-to-end encrypted room the client does not open
that channel and the room server refuses it if asked.

**Silence is observable.** Frames with no content are passed through unencrypted, so an observer can
distinguish speech from silence. Frame sizes already revealed this before encryption, so it is not a
new exposure, but it is not hidden either.

**Chat and file sharing are not covered.** Encryption applies to media. Chat already relies on the
room server, which is trusted for membership in any case.

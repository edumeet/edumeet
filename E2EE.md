# End-to-end encryption

edumeet can encrypt meeting media end to end, so that the media nodes forwarding it cannot read it.
It is off by default and turned on per tenant or per room. It has not been independently audited, so
the limitations at the end are worth reading before enabling it for anyone who depends on the
guarantee.

Two key agreements exist. The default, described first, keeps one MLS group (RFC 9420) per room. The
earlier one distributes each sender's key pairwise and stays in the code as a fallback, selected by
one key in the client configuration. Both feed the same frame encryption, run in the same worker,
and pass the same checks that encryption is actually happening. This document explains what the
feature protects, how frames are protected, how each key agreement works and what it costs, how both
were verified, and what neither of them claims.

## What it protects, and from whom

Without end-to-end encryption a media node terminates SRTP. It decrypts every stream, forwards it,
and re-encrypts it per recipient, so the node handles decoded audio and video. In a federated
deployment those nodes may run on infrastructure operated by other organisations, in other
countries. That node is the party this feature exists to protect against.

With end-to-end encryption on, the media node sees only the leading codec bytes it needs in order to
make forwarding decisions. Everything else is ciphertext it has no key for.

The room server is a different matter. It is trusted for key agreement, and that is unavoidable in a
browser client: the room server also serves the application, so a hostile room server would not need
to attack the key agreement when it could simply serve a modified client. Both designs keep the room
server from ever holding a key, but neither can stop a room server from lying about who is in the
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

Which key agreement a client uses is the `e2eeProvider` key of the client configuration: `mls`, the
default, or `pairwise`. It is a property of the deployment, not of a room. Every client of an
instance reads the same configuration, so a room is always on one provider, and the management
server has no part in the choice: it says whether a room is encrypted, which is all it needs to say.
The room server serves both providers at once, the MLS delivery service beside the pairwise relay,
so switching an instance is a client deploy and nothing else. A client that meets a peer on the
other provider never gets a key from it and holds that peer's media, which is the fail closed rule
that applies to any missing key, so a mixed room degrades visibly rather than silently. A client on
`mls` needs a room server that carries the delivery service, so the room server is deployed before
the client or together with it.

## How frames are protected

Media is encrypted inside a worker, before frames reach the network, using `RTCRtpScriptTransform`
and the WebCrypto API. There is no WebAssembly. The pairwise provider adds no cryptography
dependency at all; the MLS provider adds the `ts-mls` library, which is TypeScript on top of
WebCrypto.

### One key per sender

Each participant has one **frame key** that encrypts the frames they send, and everyone in the room
holds a copy of it. Encrypting each frame once, rather than once per recipient, is what keeps this
practical: the media node forwards a single ciphertext to everyone. The two providers differ in how
that key reaches everyone. Under MLS every member derives every sender's key from a secret the group
shares, so nothing per sender is ever sent. Under pairwise keys each sender wraps its key for each
recipient under a key only that pair can compute, and sends it. That difference is the whole reason
the group design exists, and the cost sections below show why.

### Frame encryption

Frames are encrypted with AES-GCM-256. The nonce is the key identifier followed by a counter, and it
also serves as the frame header, so decryption needs no shared state beyond the key. The key
identifier is the sender's namespace and an epoch. Under MLS the namespace is the sender's leaf
index in the group and the epoch is the low byte of the group epoch, following RFC 9605, the SFrame
RFC, which specifies exactly this binding of frame keys to MLS. Under pairwise keys the namespace is
derived from the sender's participant id and the epoch counts the sender's key changes. Either way
two senders can never collide, and a receiver can tell from the header which key a frame needs.

A small number of leading bytes are left in the clear because the media node has to read them to
make layer forwarding decisions. The count depends on the codec and, for VP8, on whether the frame
is a keyframe. Those clear bytes are authenticated as additional data, so they cannot be tampered
with even though they are readable.

Only Opus, VP8 and VP9 have a clear byte layout this implementation knows. H264 does not, because
the browser packetizes it after the transform has run, so encrypting past a fixed offset breaks the
stream rather than protecting it. A producer that negotiates anything but those three in an
encrypted room is closed rather than sent unprotected, and the sender prefers a protectable codec up
front so that this rarely happens.

Frames with nothing beyond the clear header, which is what an Opus stream produces during silence
when discontinuous transmission is active, are passed through untouched: they carry no content.
Every size between that and the smallest possible encrypted frame is unreachable for a real sender,
so a frame in that band is dropped rather than handed to the decoder unauthenticated.

### Making sure it is actually encrypting

Attaching an encryption transform is not proof that a browser is using it. One browser was observed
accepting the transform and then never passing frames through it, which would send unprotected media
while the interface claimed otherwise.

Three things prevent that:

- A sender holds its real track disabled until its own transform confirms it has processed a frame.
  Until then nothing but silence or a black frame can leave. Each producer waits on its own
  confirmation, so a second one is never released on the first one's evidence.
- If no frame is processed within a few seconds of the transport connecting, the participant is
  removed from the room with an explanation rather than being allowed to continue unprotected.
- A producer with no transform at all is treated as unconfirmed rather than as nothing to check.

The room indicator reflects confirmed state rather than intent: it shows the room as protected only
once encryption has demonstrably happened, in either direction, so a participant who only receives
gets it too. It is a property of the room rather than of individual participants, since a room
either requires encryption of everyone or of no one.

## Key agreement with MLS

This is the default provider.

### Why a group

The pairwise design, described later in this document, removed every cost it could by a rule:
arrivals are free, only senders replace their key, departures are batched, recovery is on demand.
What no rule could remove was the departure cost in a room where many participants send, and that
room is more common than it sounds, because key distribution ignores lastN. The SFU forwards a dozen
videos to each receiver, so media scales with lastN, but every sender must key every receiver
whether anyone is watching them or not. A hundred cameras the SFU handles comfortably still cost ten
thousand key messages per departure.

MLS changes the key model. A room holds a single group secret in a ratchet tree. A membership change
is one commit, broadcast once, of logarithmic size, and every member derives the new epoch's secret
from it. Per-sender frame keys are derived locally from that secret, so nothing per sender is ever
distributed. Per departure, in messages:

| Room                                | Pairwise | MLS                       |
| ----------------------------------- | -------- | ------------------------- |
| Meeting, 20 people, all sending     | ~400     | 20 deliveries of a commit |
| Seminar, 50 people, all sending     | ~2,500   | 50                        |
| Lecture, 200 people, 3 sending      | ~600     | 200                       |
| Conference, 200 people, all sending | ~40,000  | 200                       |

It also brings forward secrecy and post-compromise security, since every commit replaces the group
secret and an Update replaces a member's own keys, and it makes one security code per meeting
possible, which the pairwise design cannot reach at any price. What it does not change is keyframes:
an epoch change still needs one from each sender, so the visible cost of a departure is the same
under either design. Arrivals cost a commit where the pairwise design made them free, which is a
small price for the rest.

What it does not change either: the room server remains trusted for membership, exactly as it is for
the pairwise exchange. MLS keeps the server from reading keys; it does not stop the server from
admitting a member it should not. Only signed credentials do that, and they are not built.

### The library

`ts-mls` ([npm](https://www.npmjs.com/package/ts-mls), [GitHub](https://github.com/LukaJCB/ts-mls))
is a TypeScript implementation of RFC 9420, MIT licensed, about 700 KB unpacked, with one
dependency, `@hpke/core`, plus `@noble` packages that are peer dependencies and are installed
alongside it. HPKE, AEAD, key derivation and hashing run on the Web Cryptography API and signatures
in pure JavaScript through `@noble/curves`, with no WebAssembly. The client pins `2.0.0-rc.16`, the
upstream `main` branch at the time, rather than the published 1.6.4, because the spike found three
faults in 1.6.4 that `main` had already fixed; the history at the end of this document has the
details. The library states plainly that it has not had a formal security audit. It is the only
serious option in this language; the alternative is a WebAssembly build of OpenMLS, which this
project has so far avoided.

The ciphersuite is `MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519`, pinned for every group. A group
has one suite for all its members, and the P-256 suite cannot be joined from Firefox: a P-256
private key that `@hpke/core` derives from a secret cannot be exported by Firefox's Web Cryptography
implementation, and ts-mls derives its init and path keys that way. X25519 is also the faster suite
in every browser, by two to ten times on joins and adds, because Ed25519 verification in pure
JavaScript is much cheaper than P-256 ECDSA.

### The group

One MLS group per room, breakout rooms included. A breakout belongs to the room and everyone in it
is a room member, so it separates media, which the SFU forwards only within a session, but not keys;
that is the boundary the pairwise design draws as well, and it is kept on purpose. A recording
participant is an ordinary member. The group lives as long as the room: when the room server closes
the room, the group state goes with it, and the next arrival founds a new one.

### Joining

A newcomer asks the room server to join the group and is told one of three things: found the group,
wait, or join at the current epoch with the group's `GroupInfo`.

The first member founds the group and publishes its `GroupInfo`; the server insists that a founding
starts at epoch zero. A founding has ten seconds. If the founder has not published by then, the next
asker is told to found instead, so a founder that closes its tab during the founding does not lock
the room.

Everyone after that commits itself in with an **external commit**, built from the `GroupInfo` the
server handed it: no existing member has to do anything, which is what makes arrivals independent of
who else is online and is the reason the room server holds `GroupInfo`. The newcomer receives the
new epoch's secret and nothing from before it, so the backward secrecy that advancing provides in
the pairwise design comes for free.

Joiners are admitted one at a time. An external commit is built on the `GroupInfo` it was handed, so
two newcomers handed the same one would race, the loser would start over, and a lecture hall
arriving together would do quadratic work with some of the arrivals losing their seat to a timeout.
Instead each newcomer holds its turn until its commit is accepted, it leaves, or five seconds pass;
the others are told to wait and ask again after half a second. A newcomer keeps asking for up to a
minute and up to twenty refusals before it gives up, and a request that fails while its socket is
reconnecting is a reason to ask again rather than to leave. Three people promoted out of a lobby at
once, in the fifth browser run below, went in at epochs one, two and three, the last of them after
being told to wait twice.

The ordinary MLS path, an Add proposal committed by a present member with a Welcome for the
newcomer, also exists: every member keeps a key package with the server for it, and a Welcome that
reaches a newcomer while it is still waiting for its turn ends the wait and joins it. It is not the
path arrivals normally take.

### Leaving

A member cannot remove itself; some remaining member must commit a Remove. That is made
deterministic rather than left to a leader: every member sees who left, and the one with the lowest
leaf index still present commits the Remove. Departures within the same 200 milliseconds go into one
commit, which is the batching the pairwise design does by hand, so a server closing several
connections costs one commit rather than one each. If the expected committer has not committed
within three seconds, the next member by leaf order steps in, each one 200 milliseconds after the
one before it, so that a slow committer costs the room one extra commit rather than one from every
member; a pending fallback keeps its date when further commits arrive rather than being pushed back
by each of them. The server accepts the first commit built on the current epoch and refuses the
rest, and a refused committer applies the winning commit instead, so the duplicates are harmless.

The price is the window: the leaver can read what is sent until the Remove is applied, which is the
batch window plus the commit round trip, about a third of a second when the committer is present and
up to a few seconds when the fallback has to step in.

A peer that is back in the room under the same id is not departed, whatever an earlier note about it
says: a returning peer clears its own entry from the pending departures, and no Remove is committed
for anyone the room lists. The sixth browser run is why that rule exists.

### Keeping in step

Commits reach every member through the server in epoch order, and each member handles them one at a
time so that commits arriving together are judged in order. The rule for a relayed commit is simple:
one for an epoch at or below ours is already covered and is skipped, one for exactly the next epoch
is applied, and a gap means a missed commit, which is answered by resynchronising. A member also
asks the server for the current epoch when its worker cannot decrypt someone, which in a quiet room
is the only sign of a missed commit; the check waits for any queued commits to finish before it
compares, is throttled to once every two seconds, and starts a resynchronisation only when the
server really is ahead.

Resynchronising is an external commit from the current `GroupInfo` that replaces the member's own
leaf, through the same queue and under the same time bound as a newcomer's join. A member whose leaf
the others have already removed, for instance after a long reconnect, joins afresh instead. The
pairwise design's recovery request has no counterpart here.

When a join cannot complete within its bound, a resynchronisation is refused too often, or a
transform never proves itself, the member leaves the room with an explanation rather than staying
unprotected or silently unable to read anyone, which is the fail closed rule applied to the group.

### Frame keys

Per epoch, each member derives the SFrame base key from the MLS exporter with the label RFC 9605
gives it, and from the base key a key per sender, by leaf index. The provider pushes every sender's
key into the worker, which changes nothing in how frames are sealed or checked: the clear byte
handling, the fail closed checks and the drop rules are the pairwise provider's, unchanged. The one
thing the worker is told is that group keys are never advanced, so a frame under a key it does not
hold is reported as not yet delivered rather than derived from an older one.

An epoch change is not instantaneous for a receiver: it has to apply the commit and derive the keys
while the sender may already be using them. The first browser run measured that as two to five
frames of each sender lost over about a tenth of a second at every epoch change. So a sender hands
out the decrypt keys for the new epoch at once and starts using its own new key a quarter of a
second later, its first key on joining included, and a burst of commits switches no later than half
a second after the first of them, with the newest key. A newcomer's media is held that quarter of a
second longer for it, and epoch changes have cost no frames in any run since. Receivers ask each
sender for one keyframe per epoch, not one per key.

The key identifier carries the low eight bits of the epoch, so it wraps after 256 commits; a
receiver holds the keys of the current epoch and drops those of an older one that shares the same
low bits, as RFC 9605 says.

### Identity

A member's leaf carries a basic credential with its participant id, and the room server stamps the
sender on every relayed message, so a commit or a `GroupInfo` claiming another member's id is
refused. Trust is on first use: the first signature key seen under a participant id is pinned for
the session, and a later leaf carrying a different key under a known id is flagged in the
participant list and raises a warning, as the pairwise provider does with its identity keys. A
reconnect keeps the peer id and the same key pair, so it is not a change of identity.

Signed credentials, in which the management server signs the credential of an authenticated user so
that the others can verify it against something they already trust and the room server can no longer
insert a member unnoticed for those users, are the next step and are not built. Guests would remain
trust on first use. A single group secret also makes one security code per meeting possible, derived
from the epoch's authenticated group state; that is not built either.

### The room server as delivery service

The pairwise relay keeps no state. MLS needs the room server to order commits per group and reject
one built on a stale epoch, to hold the current `GroupInfo` so joiners can commit themselves in, to
keep each member's key package, and to relay proposals, commits and Welcomes without being able to
read any of them. None of this lets the server read media; all of it is new code beside the existing
relay, and it turned the relay from stateless into stateful, which was the largest single piece of
the work.

The service is seven messages. `mlsJoin` answers a newcomer with found, wait, or join with the
current epoch and `GroupInfo`, and runs the queue above. `mlsGroupInfo` is the founder's
publication. `mlsCommit` carries the epoch the commit was built on, the commit, the `GroupInfo` of
the epoch it creates and any Welcome with the peers it is for; the server accepts it only if that
epoch is still current, advances, stores the new `GroupInfo`, relays the commit to everyone else
with the sender stamped, and delivers the Welcome. Only the member that produced an epoch may
restate its `GroupInfo`. `mlsEpoch` answers the current epoch without taking a turn. `mlsKeyPackage`
stores a peer's key package, `mlsKeyPackages` reads them, and `mlsProposal` relays proposals.
Messages are capped at one megabyte for a commit or a `GroupInfo` and 64 KB for the rest, which is
ample: a key package is 0.4 KB, a `GroupInfo` with the tree is 54 KB at 200 members and a commit 23
KB. The state is one object per room, a peer's turn and key package go when its connection closes,
and the whole of it goes when the room does.

### Reconnects

A short reconnect, with the socket back before the room server gives the peer up, changes nothing:
the member is still in the group, and media resumes under the keys everyone holds. A long one, after
which the room server has closed the peer, is a departure for the others, who remove the leaf, and a
fresh join for the returning member, which comes back under the same peer id, finds no leaf of its
own in the tree and joins as a newcomer. In the fourth browser run both sides were in step at the
next epoch within half a second and without a dropped frame.

### What it costs

Measured in the spike, per member, in headless browsers on the X25519 suite, p95:

| Members | Chromium, one commit | Chromium, joiner's own join | Firefox, one commit | Firefox, joiner's own join |
| ------- | -------------------- | --------------------------- | ------------------- | -------------------------- |
| 50      | 3 ms                 | 23 ms                       | 13 to 20 ms         | 83 ms                      |
| 200     | 3 to 4 ms            | 61 ms                       | 10 to 15 ms         | 244 ms                     |

A departure from a room of 200 costs each remaining member a few milliseconds of asynchronous
WebCrypto work, and that cost does not grow with the room. What grows is the newcomer's own join,
because a joiner validates every leaf of the tree it receives, and the cost of a large Add batch to
everyone else, because each added key package is verified. Both are policy rather than protocol, and
neither matters at the sizes rooms reach. Deriving the frame keys and salts for 200 senders takes 14
to 20 ms. In signalling, a departure is one commit relayed to every member, and an arrival is one
external commit relayed likewise plus one `GroupInfo` download for the newcomer.

## Key agreement with pairwise keys

This is the earlier provider, selected with `e2eeProvider: 'pairwise'`. It stays in the code as the
fallback and the comparison while MLS is new; nothing in it changed when MLS arrived, and its tests
still run. Its limit is the departure cost in a room where many participants send, which is what MLS
was built to remove.

### Two layers of keys

Each participant's frame key, called the **media key** here, is distributed to each peer
individually, wrapped under a **key encryption key** (KEK) that only that pair of participants can
compute.

```
ECDH P-256 + HKDF-SHA256  ->  KEK (per pair of peers)
KEK                       ->  wraps the media key for one recipient
media key                 ->  encrypts the frames (AES-GCM-256)
```

A key that everyone holds has to reach everyone, one pairwise message at a time. That is the root of
every cost below.

### Key exchange

On joining, each participant generates an ephemeral ECDH P-256 identity key pair. The private key is
created as non-extractable, so the application itself cannot read it, and it is never stored: a new
pair is generated for every session.

Participants announce their **public** identity key over the existing signalling channel. On first
contact, each side derives the shared KEK for that pair with ECDH followed by HKDF-SHA256, then
sends its own media key wrapped under it.

The room server relays these messages and stamps the authoritative sender id on them, but the values
it carries are a public key and a wrapped key. It holds no private key and cannot derive the KEK.
The stamping is what stops one participant from posing as another: a key whose identifier does not
match the stamped sender is rejected.

A media key that arrives before the sender's identity has finished processing is held and applied
once the KEK exists, rather than discarded. Browsers differ enough in how quickly they complete an
ECDH derivation that the two can genuinely arrive out of order.

### Identity pinning

The first identity key seen for a participant is pinned. If a later announcement from the same
participant carries a different key, the change is flagged: that participant is marked in the
participant list and a warning is raised. Media keeps flowing so the call is not interrupted, which
means the warning can be ignored, and it is worth taking seriously when it appears. A participant
whose identity has changed is also refused when it asks for a key, since answering would hand the
key to whoever supplied the new identity.

Pinning lasts for the session. Identity keys are regenerated on every join and survive a reconnect,
so nothing carries over between meetings and a reconnect is not a change of identity.

### What membership costs, and what was done about it

A media key cannot stay fixed for the life of a meeting, because who is in the room changes. Every
change of membership raises the same question: who holds a key they should no longer have, or lacks
one they now need? Answering it costs messages, and with pairwise distribution the bill is always
"one message per pair that has to change".

#### The starting point

The simplest correct design replaces every participant's key on every change of membership. Each of
N participants generates a fresh key and sends it to the other N minus one, and every sender then
emits a keyframe so that receivers can resynchronise. That is roughly N squared messages per event,
and because a room fills one arrival at a time, filling it costs the sum of those:

| Room size | One membership change | Filling the room one by one |
| --------- | --------------------- | --------------------------- |
| 10        | ~100 messages         | ~385                        |
| 50        | ~2,500                | ~43,000                     |
| 200       | ~40,000               | ~2,700,000                  |

At two hundred people that is on the order of 800 MB of signalling, and two hundred cameras emitting
a keyframe at the same instant, once per arrival, at the start of the meeting when everyone is
joining. That design was costed and rejected before it was built. Everything below is what replaced
it.

#### Arrivals cost nothing

A newcomer must not be able to read what was said before they arrived, otherwise a media node
holding recorded ciphertext could hand the recording to any later arrival and have it decrypted. So
the key has to change when someone arrives. It does not, however, have to be replaced.

Instead each participant already present **advances** its key through a one way function, derived
with HKDF from the current key, and sends the advanced key only to the newcomer. Everyone who
already held the previous key derives the next one themselves, so no message is sent to them at all.
The newcomer holds only the advanced key and cannot run the derivation backwards, so the past stays
closed to them.

Three details make this free rather than merely cheap:

- **Receivers advance when they see a newer epoch in a frame**, rather than waiting to be told.
  There is no signalling for an advance at all, and the derivation is one hash.
- **An advance needs no keyframe.** Receivers derive the key and keep decoding, so there is none of
  the keyframe storm that a replacement causes.
- **Arrivals are batched over 200 milliseconds.** Joining a room produces one first contact per
  participant already present, and one advance covers any number of people arriving together.
  Without the batch a newcomer to a full room would advance once per person met.

Two rules were added after testing showed they were needed:

- **A newcomer's reply is not a request.** A newcomer answers our announcement with one of its own,
  and it arrives looking exactly like a request for our key. Answering it would hand the newcomer
  the key from *before* the advance, which is the key the advance exists to keep from them. While a
  newcomer's arrival is still in the batch window, a second announcement from them is treated as
  their reply, and the batch hands them the advanced key moments later. This was found in a live
  log, where every newcomer had been receiving both keys.
- **Nothing sent, nothing to hide.** A participant that has encrypted nothing under its current key
  does not advance, because there is nothing behind that key for a newcomer to read. This is what
  keeps a participant sitting with microphone and camera off through a run of arrivals from moving
  ahead of everyone who has had no frames from them to follow.

The only thing an arrival costs is the newcomer's own exchange: one key from each person present,
which is inherent in the newcomer needing to read them.

#### Departures cost, and here is why less than they did

A departing participant keeps whatever key they were given. Without a change they could read what is
said after they leave, provided they can reach the ciphertext. Here advancing does not help: the
leaver holds the current key and can derive the next one exactly as easily as everyone remaining.
The key has to be **replaced** with fresh random material, and fresh material has to be delivered,
down the pairwise channels the leaver does not hold. That is the one cost pairwise keys cannot
avoid. Two rules make it much smaller than the starting point.

**Only participants that are sending replace their key.** A media key protects the frames its owner
sends. A participant with no producer at all has nothing the leaver could read, so it does not
replace its key at the departure. It marks the key as burned and replaces it the moment it next
starts sending, before that producer's transform is attached, so no frame ever leaves under the
burned key. A muted microphone still counts as a producer, because it can resume without going
through that path. In a lecture, where a handful of people speak and hundreds listen, this is the
difference between the square of the room size and a few times the room size.

**Departures are batched.** Departures within the same 200 milliseconds are answered with one
replacement, so several people dropping at once, which is what a server closing connections
produces, cost one round rather than one each. The price is that the leaver can read up to that
window after leaving.

Each replacement still costs a keyframe per sender and per simulcast layer, generated by every
camera at the same instant, and the receivers of a replaced key drop a few frames until the new key
arrives. In testing that gap is about a third of a second, the round trip of the key.

#### What it costs

For a room of N people, in messages, excluding the newcomer's own key exchange, which happens either
way:

| Room size | Arrival | Departure, everyone sending | Departure, 3 senders |
| --------- | ------- | --------------------------- | -------------------- |
| 10        | 0       | ~100                        | ~30                  |
| 50        | 0       | ~2,500                      | ~150                 |
| 200       | 0       | ~40,000                     | ~600                 |

Set against the starting point: filling a room of two hundred went from millions of messages to none
beyond the inherent exchange, a departure in a lecture went from forty thousand messages to six
hundred, and arrivals no longer cause a keyframe from every camera in the room. A room in which
everyone sends still pays the square of its size per departure, batched per burst. That case is the
one limit of this design, and the reason the group design above exists.

#### Keeping everyone in reach

Advancing keys quietly has one side effect. A participant only learns that a key advanced by
decrypting a frame under it, so a sender who advances while someone is receiving nothing from them
leaves that person behind. Two things keep that rare: the "nothing sent, nothing to hide" rule
above, and the fact that a key belongs to a participant rather than to one of their streams, so
anyone decrypting a sender's audio is keeping up with the key their video uses as well, even while
the SFU is not forwarding that video.

A receiver derives a bounded number of steps forward, which covers a long run of missed arrivals and
also stops a forged key identifier from demanding unlimited work. Falling further behind than that
is not fatal. A receiver that has been unable to decrypt a sender for a sustained run of frames,
about three seconds, asks that sender for a key.

There is no request message and none is needed. A participant that already knows us reads a repeat
identity announcement as a request, since nothing else would prompt one, so recovery runs over the
two notifications the room server already relays. The asker rate limits how often it asks, the
sender rate limits how often it answers, and an answer is a key rather than another announcement, so
the exchange cannot loop. The same path recovers a key that was simply lost on the way.

Recovery was chosen over the alternative of replacing every key every few arrivals as a precaution.
That alternative was costed too: every participant counts the same arrivals and would replace on the
same one, so it would have cost the square of the room size every few arrivals, quadratic again by
another route. On demand recovery costs two messages, and only for the participants who actually
cannot decrypt someone.

A derived key is held back until a frame actually authenticates under it. A wrong guess, whether
from a forged identifier or from a sender that replaced its key rather than advancing it, therefore
leaves the key store untouched instead of displacing keys that work. And a guess that failed once is
not tried again: a replaced key can never be derived, and re-deriving it on every frame until the
replacement arrived was found, in Firefox, to keep the decrypt worker busy enough that the
replacement itself was delayed by seconds. The frames simply wait for the delivery.

#### Reconnects

A brief loss of the signalling connection changes nothing. The room server keeps the participant, no
key changes hands, and media resumes under the keys everyone already holds.

A longer loss, after which the room server has closed the participant, is a departure followed by an
arrival. The others replace their keys when the participant drops out and advance them when they
return. The returning participant never saw anyone leave, so it keeps its own key and simply hands
it over when asked. Identity keys survive a reconnect, so no change of identity is flagged.

#### The road not taken

One other way past the departure cost was considered: a leader, named by the room server, holding a
single room key and handing it to each participant pairwise, with each sender's frame key derived
from it. A departure would then be one participant sending N messages rather than every sender doing
so. It was not built. One key would protect the whole room, everyone would stall for a round trip
when the leader left, the room server would have to name the leader, and it would have been a dead
end on the way to MLS, which gets the same single commit per departure without a leader and with
forward secrecy besides.

## Verification

### Automated tests

The client suite runs under Vitest, 172 tests in all. For the frame layer and the pairwise provider:
the one way derivation, the receiver's key store, the sealing and parsing of frames for each codec,
the pairwise exchange between two participants, the signalling middleware, the codec choice and the
service that holds media until a transform confirms, the last against a faked worker. For MLS,
forty-seven tests: the provider against the real library, founding, external joins, joins from a
Welcome, removes, resynchronisation, exporter keys and the identity pin; the middleware against a
faked provider, covering the join loop with its refusals and deadline, the epoch rule and gaps, the
Welcome that arrives while waiting, departures with the batching, the committer rule and the
fallback, returning peers, every fail closed exit, messages of the wrong kind, a freed leaf taken by
a newcomer, and the epoch byte wrapping after 256 commits; and the service, covering the grace
period, the burst cap and a key application that fails without silencing the ones after it.

The room server suite runs under Jest, 199 tests in all, nineteen of them for the delivery service:
founder election and its timeout, a founding that must start at epoch zero, one joiner at a time
with the turn released on commit, departure or timeout, commits refused on a stale epoch, the
`GroupInfo` restated only by the epoch's committer, the message caps, the sender stamp on relays,
and the cleanup when a peer or the room closes. The pairwise relay keeps its own tests.

### Browser runs

MLS was taken through six runs in real browsers on the dev instance between 2026-09-06 and
2026-09-07, with the worker and middleware logs of every participant analysed afterwards. Runs two
and six were on a machine under heavy load, which is why they surfaced timing faults the others
could not.

| Run | Browsers | Scenario | What the logs showed | Change made |
| --- | -------- | -------- | -------------------- | ----------- |
| 1 | 4 Chrome | Founding, three external joins, departures | All in step, leaf zero committed every departure alone, no resync; every epoch change cost each receiver 2 to 5 frames over about 0.1 s | Decrypt keys pushed at once, own key used 250 ms later; worker told group keys never advance |
| 2 | 3 Chrome, Firefox; load | Firefox on X25519 | Firefox joined, verified, decrypted everyone; its throttled tab took seconds to apply a commit and the epoch check started a needless 30 s rejoin; a newcomer's first frames arrived before its join commit was applied | Epoch check waits for queued commits; the first key waits like every other |
| 3 | Chrome, Firefox; idle | Join and verify | Firefox had its keys within 380 ms; zero frames dropped on either side | None |
| 4 | Chrome founder, Edge | Short and long reconnect | Short: no group action; long: Edge removed the leaf alone, Chrome came back under the same id, found no leaf and joined afresh; in step within 0.5 s, zero drops | None |
| 5 | Edge founder, 3 promoted from the lobby at once | Join queue under a burst | The captured newcomer waited twice, joined at epoch three, skipped the two covered commits; it dropped 25 to 40 frames of each sender, all from epoch two, before its time, which is backward secrecy working; senders paused up to 0.8 s because each commit restarted the grace | A burst switches keys no later than 500 ms after its first commit |
| 6 | Edge founder, Edge, Chrome; load; both Edges killed | Two departures at once, founder included; then the whole room lost the server and refounded | Chrome removed both in one commit; after the collapse Chrome refounded, the Edges joined, and one of them removed Chrome for a departure it still remembered; Chrome rejoined by itself within 2 s | Returning peers clear their pending departure; no Remove for anyone the room lists |

Not yet run under MLS: Safari, and a recording participant. Not yet built: periodic Update commits
for forward secrecy within a long quiet session, and the provider's name in the status tooltip.

The pairwise provider had its own matrix before MLS existed: Chrome, Edge, Firefox and Safari,
between different browsers, with arrivals, departures, reconnects and recovery, which is where the
rules in its section came from.

## Browser support

Verified working, including between different browsers: Chrome, Edge and Firefox with either
provider, and Safari with the pairwise one. Any browser implementing `RTCRtpScriptTransform` is
allowed to try, and one that accepts the transform without using it is caught by the checks above
rather than by a list of permitted browsers.

Chrome additionally requires the peer connection to be created with encoded insertable streams
enabled, which is why that flag is set only when encryption is on. Setting it unconditionally breaks
media in rooms that are not encrypted.

## Limitations

**Identity is trusted on first use.** A room server that substituted its own keys at the moment two
participants first met, or its own member at the moment a group was founded, could place itself
between them, and neither side would be able to tell, because they only ever learned each other's
key through it. Pinning detects a key that changes later, not one that was wrong from the start. Out
of band verification, where two people compare a short code, would close this and is not
implemented. With pairwise keys that means one code per pair; the group secret is what makes a
single code per meeting possible, and signed credentials from the management server are what would
let authenticated users skip it.

**The room server is trusted for membership.** Under either provider it decides who is in the room,
and a member it admits gets keys like any other. Neither provider lets it read a key.

**Forward secrecy is bounded.** With pairwise keys the KEK comes from a single Diffie-Hellman
exchange, so it is fixed for the session and a compromise of it exposes every media key wrapped
under it; identity keys are ephemeral per session, so nothing is exposed across meetings. With MLS
every commit replaces the group secret, but nothing yet commits in a room where nobody comes or
goes, so a long quiet session stays on one epoch, and a compromised member key stays in use until
the next membership change.

**One group secret protects the whole room.** Under MLS a compromised member exposes every sender's
frames for the epoch rather than one sender's, which is the price of never distributing a key.

**A leaver can read a short window.** Departures are batched, so the key is replaced up to 200
milliseconds after someone leaves under pairwise keys, and under MLS a commit round trip later than
that, or a few seconds later when the expected committer is slow and the fallback steps in. Anything
sent in that window is readable by them if they can obtain the ciphertext.

**Old frames can be replayed within the retention window.** Recipients accept any key they still
hold, so a media node could resend frames captured under one of them.

**A media node can misattribute streams.** Decryption looks the key up by the frame's sender
namespace, not by which participant a consumer belongs to, so a node could route one person's stream
into another's tile. It cannot read or alter the content, only mislabel it.

**Neither the library nor this implementation is audited.** The pairwise provider is fifteen hundred
lines written and reviewed here, making a modest claim with a one-sender blast radius. The MLS
provider adopts a large protocol implementation written elsewhere, in which a subtle mistake in tree
handling is invisible in normal use and only matters against an adversary. The RFC 9420 test vectors
and the interop exchange with OpenMLS in the history below are the substitute for the audit neither
has had. An audit has to precede any stronger claim than keeping federated media nodes out.

**Local recording and transcription see plaintext.** Both run in the browser on decoded media and
are unaffected by encryption. Browser speech recognition sends audio to a third party service, which
is worth considering in a room chosen for its privacy.

**Silence is observable.** Frames with no content are passed through unencrypted, so an observer can
distinguish speech from silence. Frame sizes already revealed this before encryption, so it is not a
new exposure, but it is not hidden either.

**Chat and file sharing are not covered.** Encryption applies to media. Chat already relies on the
room server, which is trusted for key agreement in any case.

**Automated tests cover the cryptography, the signalling and the fail closed checks, not the
browsers.** What a browser actually does with a transform, and whether two browsers can read each
other, was verified by hand, as described above.

## History

**The pairwise provider** was the first design, built with the frame layer and shipped with it. Its
key rotation was then rebuilt around the rules in its section, arrivals free, only senders replace,
recovery on demand, after the first version was costed at the square of the room size per event; the
browser matrix that followed found the two rules marked as added after testing.

**The MLS spike** (2026-09-05) was the go or no-go for the group design. It was run twice: first
against the published ts-mls 1.6.4, then, after that run turned up three library problems, against
upstream `main` at 2.0.0-rc.16. Each run built groups of 25, 50, 100 and 200 members in Node and
exercised every operation the design relies on, timed the same operations inside headless Chromium
and Firefox, ran the RFC 9420 test vectors shipped with the library, and exchanged messages with
OpenMLS 0.9 running in Docker. The scripts live in `tmp/mls-spike`.

Everything the design needs works in both versions: adds with a Welcome that carries the ratchet
tree, external joins from a published `GroupInfo`, Removes that leave the leaver unable to derive
the next epoch, Update commits, rejection of a commit built on a stale epoch, recovery by applying
the winning commit to the kept state, and recovery by an external resync commit that replaces the
old leaf rather than adding one. After every step all members hold the same exporter secret, at
every size tried. The RFC 9420 test vectors, 785 cases across tree math, key schedule, secret tree,
message protection, transcript hashes, Welcome, tree operations, TreeKEM and passive client
scenarios, pass for all seven ciphersuites on both versions.

What 1.6.4 got wrong, and what `main` had already fixed:

- The `external_pub` extension of a `GroupInfo` was written as the bare HPKE key where RFC 9420
  defines a length-prefixed vector. OpenMLS follows the RFC, so neither library could external-join
  the other's group.
- An external resync with a key package whose signature key matched no leaf looped forever instead
  of throwing. `main` matches the old leaf by signature key and then by credential identity, so a
  returning member with a fresh key pair resyncs cleanly, and a real mismatch throws.
- Every commit derived the whole secret tree for the new epoch eagerly, two HKDF expansions per node
  for 2N-1 nodes, every one an asynchronous WebCrypto call: 83 ms at 256 leaves, most of the
  per-commit cost, growing with the room. `main` derives the secret tree on demand.

Time per member for processing one commit, Node 24, p95 unless stated:

| Members | Remove or update commit, 1.6.4 | Remove or update commit, main | Join from Welcome (avg), 1.6.4 / main | External join, joiner side (avg), 1.6.4 / main |
| ------- | ------------------------------ | ----------------------------- | ------------------------------------- | ---------------------------------------------- |
| 25      | 36 to 61 ms                    | 13 to 14 ms                   | 74 / 56 ms                            | 172 / 102 ms                                   |
| 50      | 63 to 65 ms                    | 15 to 18 ms                   | 179 / 116 ms                          | 368 / 203 ms                                   |
| 100     | 110 to 124 ms                  | 14 ms                         | 298 / 187 ms                          | 841 / 374 ms                                   |
| 200     | 190 to 228 ms                  | 15 to 16 ms                   | 426 / 337 ms                          | 1,840 / 988 ms                                 |

The same operations in headless Chromium 153 and Firefox 155, on `main`, per member, p95 unless
stated:

| Members, browser, suite | Remove or update commit | External commit | Add commit of 25 | Join from Welcome (avg) | External join, joiner side | Whole scenario |
| ----------------------- | ----------------------- | --------------- | ---------------- | ----------------------- | -------------------------- | -------------- |
| 50, Chromium, P-256     | 4 ms                    | 4 ms            | 40 ms            | 31 ms                   | 52 ms                      | 3 s            |
| 50, Chromium, X25519    | 3 ms                    | 3 ms            | 8 ms             | 6 ms                    | 23 ms                      | 1 s            |
| 50, Firefox, X25519     | 17 to 20 ms             | 13 ms           | 42 ms            | 39 ms                   | 83 ms                      | 5 s            |
| 200, Chromium, P-256    | 5 ms                    | 5 ms            | 70 ms            | 129 ms                  | 189 ms                     | 69 s           |
| 200, Chromium, X25519   | 4 ms                    | 3 ms            | 9 ms             | 12 ms                   | 61 ms                      | 9 s            |
| 200, Firefox, X25519    | 13 to 15 ms             | 10 ms           | 38 ms            | 59 ms                   | 244 ms                     | 38 s           |

On 1.6.4 the same page at 200 members cost a Chromium member 49 to 82 ms per commit and a Firefox
member 265 to 278 ms; `main` is ten to twenty times cheaper. Sizes are the same in both versions: a
key package 0.4 KB, `GroupInfo` with the tree 54 KB at 200 members, a commit 23 KB, a Welcome for 25
newcomers 34 to 56 KB, and a member's serialised state 286 KB on `main`. Firefox could not run the
P-256 suite in either version, for the `@hpke/core` reason given in the library section. A file
exchange with OpenMLS 0.9 on the P-256 suite ran five rounds, a ts-mls client joining from an
OpenMLS Welcome, a ts-mls client committing itself into the OpenMLS group externally, a ts-mls
Remove applied by OpenMLS, an OpenMLS update commit applied by ts-mls, and an OpenMLS Add with a
ts-mls member present; 1.6.4 failed the external join on the encoding fault and `main`, unpatched,
passed all five with every party agreeing on the exporter secret. That settled two things before a
line was written: build on 2.0, and pin the X25519 suite.

**The MLS provider** was built on 2026-09-06: the delivery service in the room server, the key
provider and middleware in the client, and the `e2eeProvider` key with `mls` as its default. Eight
desk reviews before the first browser run added, in order, the epoch rule for relayed commits, one
keyframe round per epoch, the signature key pin, the recovery paths for a refused founding, for a
leaf the others had removed and for a member whose own leaf is gone, notifications handled one at a
time, a founder wait bounded by time rather than by attempts, the epoch check when the worker cannot
decrypt someone, the departure fallback by leaf order, the join queue on the server and the same
time bound for a resynchronising member as for a newcomer, the retry of a request that fails while
the socket reconnects, tests for every fail closed exit and for the Welcome path, the restatement
rule for `GroupInfo`, the fixed date of a pending fallback, a Welcome that arrives just before a
newcomer's own commit, a key application that fails without silencing later ones, a guarded
founder's publication, and the rule that a group starts at epoch zero. The six browser runs above
followed on 2026-09-06 and 2026-09-07 and added the grace period, its burst cap, the epoch check
that waits for queued commits, and the rule for returning peers.

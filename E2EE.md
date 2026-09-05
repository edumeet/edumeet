# End-to-end encryption

edumeet can encrypt meeting media end to end, so that the media nodes forwarding it cannot read it.
It is off by default and turned on per tenant or per room. It has not been independently audited, so
the limitations at the end are worth reading before enabling it for anyone who depends on the
guarantee.

This document explains what the feature protects, how it works, what each part costs, and why the
design is the way it is. The cost section is the longest, because most of the design decisions were
made to bring a cost down.

## What it protects, and from whom

Without end-to-end encryption a media node terminates SRTP. It decrypts every stream, forwards it,
and re-encrypts it per recipient, so the node handles decoded audio and video. In a federated
deployment those nodes may run on infrastructure operated by other organisations, in other countries.
That node is the party this feature exists to protect against.

With end-to-end encryption on, the media node sees only the leading codec bytes it needs in order to
make forwarding decisions. Everything else is ciphertext it has no key for.

The room server is a different matter. It is trusted for key exchange, and that is unavoidable in a
browser client: the room server also serves the application, so a hostile room server would not need
to attack the key exchange when it could simply serve a modified client. The design keeps the room
server from ever holding a key, but it cannot stop a room server from lying about who is in the room.
The limitations spell out what that means.

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

## How it works

Media is encrypted inside a worker, before frames reach the network, using `RTCRtpScriptTransform`
and the WebCrypto API. There is no WebAssembly and no additional cryptography dependency.

### Two layers of keys

Each participant has one **media key** that encrypts the frames they send. Everyone in the room needs
a copy of it, so it is distributed to each peer individually, wrapped under a **key encryption key**
(KEK) that only that pair of participants can compute.

```
ECDH P-256 + HKDF-SHA256  ->  KEK (per pair of peers)
KEK                       ->  wraps the media key for one recipient
media key                 ->  encrypts the frames (AES-GCM-256)
```

Encrypting each frame once, rather than once per recipient, is what keeps this practical: the media
node forwards a single ciphertext to everyone. It is also the root of every cost below. A key that
everyone holds has to reach everyone, one pairwise message at a time.

### Key exchange

On joining, each participant generates an ephemeral ECDH P-256 identity key pair. The private key is
created as non-extractable, so the application itself cannot read it, and it is never stored: a new
pair is generated for every session.

Participants announce their **public** identity key over the existing signalling channel. On first
contact, each side derives the shared KEK for that pair with ECDH followed by HKDF-SHA256, then sends
its own media key wrapped under it.

The room server relays these messages and stamps the authoritative sender id on them, but the values
it carries are a public key and a wrapped key. It holds no private key and cannot derive the KEK. The
stamping is what stops one participant from posing as another: a key whose identifier does not match
the stamped sender is rejected.

A media key that arrives before the sender's identity has finished processing is held and applied
once the KEK exists, rather than discarded. Browsers differ enough in how quickly they complete an
ECDH derivation that the two can genuinely arrive out of order.

### Frame encryption

Frames are encrypted with AES-GCM-256. The nonce is the key identifier followed by a counter, and it
also serves as the frame header, so decryption needs no shared state beyond the key. The key
identifier is the sender's namespace and an epoch, the namespace being derived from the sender's
participant id so that two senders can never collide. The epoch counts the sender's key changes.

A small number of leading bytes are left in the clear because the media node has to read them to make
layer forwarding decisions. The count depends on the codec and, for VP8, on whether the frame is a
keyframe. Those clear bytes are authenticated as additional data, so they cannot be tampered with
even though they are readable.

Only Opus, VP8 and VP9 have a clear byte layout this implementation knows. H264 does not, because the
browser packetizes it after the transform has run, so encrypting past a fixed offset breaks the stream
rather than protecting it. A producer that negotiates anything but those three in an encrypted room is
closed rather than sent unprotected, and the sender prefers a protectable codec up front so that this
rarely happens.

Frames with nothing beyond the clear header, which is what an Opus stream produces during silence
when discontinuous transmission is active, are passed through untouched: they carry no content. Every
size between that and the smallest possible encrypted frame is unreachable for a real sender, so a
frame in that band is dropped rather than handed to the decoder unauthenticated.

### Identity pinning

The first identity key seen for a participant is pinned. If a later announcement from the same
participant carries a different key, the change is flagged: that participant is marked in the
participant list and a warning is raised. Media keeps flowing so the call is not interrupted, which
means the warning can be ignored, and it is worth taking seriously when it appears. A participant whose
identity has changed is also refused when it asks for a key, since answering would hand the key to
whoever supplied the new identity.

Pinning lasts for the session. Identity keys are regenerated on every join and survive a reconnect,
so nothing carries over between meetings and a reconnect is not a change of identity.

## Keys and membership: what it costs, and what was done about it

A media key cannot stay fixed for the life of a meeting, because who is in the room changes. Every
change of membership raises the same question: who holds a key they should no longer have, or lacks
one they now need? Answering it costs messages, and with pairwise distribution the bill is always
"one message per pair that has to change".

### The starting point

The simplest correct design replaces every participant's key on every change of membership. Each of
N participants generates a fresh key and sends it to the other N minus one, and every sender then
emits a keyframe so that receivers can resynchronise. That is roughly N squared messages per event,
and because a room fills one arrival at a time, filling it costs the sum of those:

| Room size | One membership change | Filling the room one by one |
| --------- | --------------------- | --------------------------- |
| 10        | ~100 messages         | ~385                        |
| 50        | ~2,500                | ~43,000                     |
| 200       | ~40,000               | ~2,700,000                  |

At two hundred people that is on the order of 800 MB of signalling, and two hundred cameras emitting a
keyframe at the same instant, once per arrival, at the start of the meeting when everyone is joining.
That design was costed and rejected before it was built. Everything below is what replaced it.

### Arrivals cost nothing

A newcomer must not be able to read what was said before they arrived, otherwise a media node holding
recorded ciphertext could hand the recording to any later arrival and have it decrypted. So the key
has to change when someone arrives. It does not, however, have to be replaced.

Instead each participant already present **advances** its key through a one way function, derived
with HKDF from the current key, and sends the advanced key only to the newcomer. Everyone who already
held the previous key derives the next one themselves, so no message is sent to them at all. The
newcomer holds only the advanced key and cannot run the derivation backwards, so the past stays
closed to them.

Three details make this free rather than merely cheap:

- **Receivers advance when they see a newer epoch in a frame**, rather than waiting to be told. There
  is no signalling for an advance at all, and the derivation is one hash.
- **An advance needs no keyframe.** Receivers derive the key and keep decoding, so there is none of
  the keyframe storm that a replacement causes.
- **Arrivals are batched over 200 milliseconds.** Joining a room produces one first contact per
  participant already present, and one advance covers any number of people arriving together. Without
  the batch a newcomer to a full room would advance once per person met.

Two rules were added after testing showed they were needed:

- **A newcomer's reply is not a request.** A newcomer answers our announcement with one of its own,
  and it arrives looking exactly like a request for our key. Answering it would hand the newcomer the
  key from *before* the advance, which is the key the advance exists to keep from them. While a
  newcomer's arrival is still in the batch window, a second announcement from them is treated as their
  reply, and the batch hands them the advanced key moments later. This was found in a live log, where
  every newcomer had been receiving both keys.
- **Nothing sent, nothing to hide.** A participant that has encrypted nothing under its current key
  does not advance, because there is nothing behind that key for a newcomer to read. This is what
  keeps a participant sitting with microphone and camera off through a run of arrivals from moving
  ahead of everyone who has had no frames from them to follow.

The only thing an arrival costs is the newcomer's own exchange: one key from each person present,
which is inherent in the newcomer needing to read them.

### Departures cost, and here is why less than they did

A departing participant keeps whatever key they were given. Without a change they could read what is
said after they leave, provided they can reach the ciphertext. Here advancing does not help: the
leaver holds the current key and can derive the next one exactly as easily as everyone remaining.
The key has to be **replaced** with fresh random material, and fresh material has to be delivered,
down the pairwise channels the leaver does not hold. That is the one cost pairwise keys cannot avoid.
Two rules make it much smaller than the starting point.

**Only participants that are sending replace their key.** A media key protects the frames its owner
sends. A participant with no producer at all has nothing the leaver could read, so it does not replace
its key at the departure. It marks the key as burned and replaces it the moment it next starts
sending, before that producer's transform is attached, so no frame ever leaves under the burned key. A
muted microphone still counts as a producer, because it can resume without going through that path.
In a lecture, where a handful of people speak and hundreds listen, this is the difference between the
square of the room size and a few times the room size.

**Departures are batched.** Departures within the same 200 milliseconds are answered with one
replacement, so several people dropping at once, which is what a server closing connections produces,
cost one round rather than one each. The price is that the leaver can read up to that window after
leaving.

Each replacement still costs a keyframe per sender and per simulcast layer, generated by every camera
at the same instant, and the receivers of a replaced key drop a few frames until the new key arrives.
In testing that gap is about a third of a second, the round trip of the key.

### What it costs now

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
one limit of this design, and the alternatives for it are described below.

### Keeping everyone in reach

Advancing keys quietly has one side effect. A participant only learns that a key advanced by
decrypting a frame under it, so a sender who advances while someone is receiving nothing from them
leaves that person behind. Two things keep that rare: the "nothing sent, nothing to hide" rule above,
and the fact that a key belongs to a participant rather than to one of their streams, so anyone
decrypting a sender's audio is keeping up with the key their video uses as well, even while the SFU is
not forwarding that video.

A receiver derives a bounded number of steps forward, which covers a long run of missed arrivals and
also stops a forged key identifier from demanding unlimited work. Falling further behind than that is
not fatal. A receiver that has been unable to decrypt a sender for a sustained run of frames, about
three seconds, asks that sender for a key.

There is no request message and none is needed. A participant that already knows us reads a repeat
identity announcement as a request, since nothing else would prompt one, so recovery runs over the two
notifications the room server already relays. The asker rate limits how often it asks, the sender rate
limits how often it answers, and an answer is a key rather than another announcement, so the exchange
cannot loop. The same path recovers a key that was simply lost on the way.

Recovery was chosen over the alternative of replacing every key every few arrivals as a precaution.
That alternative was costed too: every participant counts the same arrivals and would replace on the
same one, so it would have cost the square of the room size every few arrivals, quadratic again by
another route. On demand recovery costs two messages, and only for the participants who actually
cannot decrypt someone.

A derived key is held back until a frame actually authenticates under it. A wrong guess, whether from
a forged identifier or from a sender that replaced its key rather than advancing it, therefore leaves
the key store untouched instead of displacing keys that work. And a guess that failed once is not
tried again: a replaced key can never be derived, and re-deriving it on every frame until the
replacement arrived was found, in Firefox, to keep the decrypt worker busy enough that the
replacement itself was delayed by seconds. The frames simply wait for the delivery.

### Reconnects

A brief loss of the signalling connection changes nothing. The room server keeps the participant, no
key changes hands, and media resumes under the keys everyone already holds.

A longer loss, after which the room server has closed the participant, is a departure followed by an
arrival. The others replace their keys when the participant drops out and advance them when they
return. The returning participant never saw anyone leave, so it keeps its own key and simply hands it
over when asked. Identity keys survive a reconnect, so no change of identity is flagged.

### The alternatives at lecture scale

Pairwise distribution is what keeps a departure with many senders expensive, and there are two known
ways past it. Both change the key model rather than the rotation.

**A leader with a room key.** One participant, named by the room server, generates a single room key
and hands it to each participant pairwise. Each sender's frame key is derived from it, so the frame
format and the worker stay as they are. A departure is then one participant sending N messages
rather than every sender doing so, and a single security code read aloud verifies the whole meeting.
The price is that one key protects the whole room, so one compromise exposes everyone rather than one
sender, that everyone stalls for a round trip when the leader leaves, and that the room server has to
name the leader. It is not built, and would be a dead end if MLS is the destination.

**MLS (RFC 9420).** A group secret held in a ratchet tree, where a membership change is a single
commit of logarithmic size rather than every member re keying every other member. This is the
planned next step, and the next section is the plan.

## Next step: MLS

This is a plan, not a commitment, and nothing in it is built; only the spike at the end has run. It
describes what replacing the pairwise key exchange above with MLS (RFC 9420) would involve, what it
would buy, what it would cost, and in what order to find out whether it holds up.

### Why

The departure cost is the last structural limit in the current design. Every other cost was removed
by a rule: arrivals are free, only senders replace, departures are batched, recovery is on demand.
Nothing of the kind is left for a room where many participants send, and that room is more common
than it sounds, because key distribution ignores lastN. The SFU forwards a dozen videos to each
receiver, so media scales with lastN, but every sender must key every receiver whether anyone is
watching them or not. A hundred cameras the SFU handles comfortably still cost ten thousand key
messages per departure.

MLS changes the key model. A room holds a single group secret in a ratchet tree. A membership change
is one commit, broadcast once, of logarithmic size, and every member derives the new epoch's secret
from it. Per-sender frame keys are derived locally from that secret, so nothing per sender is ever
distributed. Per departure, in messages:

| Room                                | Now      | MLS                       |
| ----------------------------------- | -------- | ------------------------- |
| Meeting, 20 people, all sending     | ~400     | 20 deliveries of a commit |
| Seminar, 50 people, all sending     | ~2,500   | 50                        |
| Lecture, 200 people, 3 sending      | ~600     | 200                       |
| Conference, 200 people, all sending | ~40,000  | 200                       |

It also brings forward secrecy, post-compromise security and one security code per meeting, which the
pairwise design cannot reach at any price. What it does not change is keyframes: an epoch change still
needs one from each sender, so the visible cost of a departure is the same under either design, and
grace period activation is the fix for both. Arrivals cost a commit where they cost nothing today,
which is a small price for the rest.

What it does not change either: the room server remains trusted for membership, exactly as it is today
for key exchange. MLS keeps the server from reading keys; it does not stop the server from admitting a
member it should not. Only signed credentials do that, and they are a later phase.

### What exists to build on

**Library.** `ts-mls` ([npm](https://www.npmjs.com/package/ts-mls),
[GitHub](https://github.com/LukaJCB/ts-mls)) is a TypeScript implementation of RFC 9420, version
1.6.4 as of August 2026 and 2.0.0-rc.16 on `main` in September 2026, which is the version to build
on (see the spike results), MIT licensed, about 690 KB unpacked, with one dependency, `@hpke/core`, plus
`@noble` peer packages that must be installed alongside it. Together they run HPKE, AEAD, key
derivation and hashing on the Web Cryptography API and signatures in pure JavaScript through
`@noble/curves`, with no WebAssembly either way. It exports what this plan needs:
group creation and joining, `createCommit` and `processMessage`, external joins from a published
`GroupInfo` (`joinGroupExternal`, `createGroupInfoWithExternalPubAndRatchetTree`), the MLS exporter
(`mlsExporter`), external proposals, re-initialisation, pre-shared keys, basic and X.509
credentials, and an `AuthenticationService` hook for validating credentials. It states plainly that it
has not had a formal security audit. It is the only serious option in this language; the alternative
is a WebAssembly build of OpenMLS, which this project has so far avoided.

**Binding.** RFC 9605, the SFrame RFC, specifies how SFrame keys come from MLS: a per-epoch base key
from `MLS-Exporter("SFrame 1.0 Base Key", "", Nk)`, per-sender keys derived from it by the sender's
leaf index, and a key identifier that packs a context, the sender index and the low bits of the
epoch, with the rule that a receiver drops an old epoch when a new one arrives with the same low
bits. That is close to what the worker already does with its namespace and epoch byte.

**Our own code.** The key provider is an interface with one implementation, written so a second one
could replace it without touching the worker, the media pipeline or the interface. The worker keys
its store by sender namespace and epoch and derives nothing itself except the one way advance, which
MLS would make unnecessary. The room server relays two opaque message types and stamps the sender.

### Design

**Group per session.** One MLS group per room session. Breakout rooms are separate sessions today and
would be separate groups; moving to a breakout is a leave and a join. A recording participant is an
ordinary member.

**Joining.** The joiner publishes a KeyPackage on arrival, as it publishes its identity today. A
present member could add it with a commit and a Welcome, but that needs some member to act, which is
the leader problem in a new form. Instead the joiner commits itself in with an **external commit**,
using the group's published `GroupInfo`: no existing member has to do anything, the room server hands
the joiner the current `GroupInfo` and relays the joiner's commit to everyone. This is what makes
arrivals independent of who else is online, and the reason the room server has to hold `GroupInfo`.
Either way the newcomer receives the new epoch's secret and nothing from before it, so the backward
secrecy that advancing provides today comes for free.

**Leaving.** A member cannot remove itself; some remaining member must commit a Remove. The plan makes
that deterministic: the remaining member with the lowest leaf index commits within a short window, the
next one takes over if it has not after a timeout, and the room server, which orders commits, accepts
the first valid one and rejects the rest, which then re-synchronise from it. Departures inside the
same window go into one commit, which is the batching the current design does by hand. No key is
distributed pairwise: one commit of logarithmic size reaches everyone.

**Frame keys.** Per epoch, each member derives the SFrame base key from the exporter, and from it a
key per sender index. The worker's key identifier becomes context, sender index and epoch bits,
following RFC 9605. The worker itself changes only in how keys arrive: the provider derives every
sender's key locally and pushes them, rather than the worker deriving advances from frames. The clear
byte handling, the fail closed checks and the drop rules are untouched.

**Forward secrecy and post-compromise security.** Every commit advances the epoch, and an Update
proposal from a member replaces its leaf key. Issuing one periodically, for example every few minutes
from whichever member is the current committer, gives the group both forward secrecy and recovery from
a compromised member key, which the current design has neither of for its pairwise KEK.

**Identity.** Phase one keeps trust on first use: basic credentials carrying the participant id,
pinned as today. Phase two has the management server sign credentials for authenticated users, so a
member's leaf carries an identity the others can verify against something they already trust, and the
room server can no longer insert a member unnoticed for those users. Guests would remain trust on
first use. A single group secret also makes one security code per meeting possible, derived from the
epoch's authenticated group state, which the pairwise design could not offer.

**The room server as delivery service.** Today the room server relays two message types and keeps no
state. MLS needs it to order commits per group and reject one built on a stale epoch, to store the
current `GroupInfo` refreshed by each committer so joiners can commit themselves in, to relay
proposals, commits and Welcomes without being able to read any of them, and to keep the KeyPackage of
each present participant for the Add path and for re-joins. None of this lets the server read media.
All of it is new code with its own tests, and it turns the relay from stateless into stateful, which
is the largest single piece of work in the plan.

**Reconnects and recovery.** A short reconnect changes nothing, as now. A long one is a Remove by the
others and an external commit by the returning member, which is also what recovery becomes: a member
that has fallen out of sync, for any reason, re-joins externally from the current `GroupInfo` rather
than asking a peer for a key. The current recovery request disappears.

### What it would cost to build

For a proof of concept of the same standard as the current one:

| Phase | Work | Estimate |
| ----- | ---- | -------- |
| 0. Spike | Node script with ts-mls: 200-member group, adds, removes, external join, exporter, timings and message sizes; confirm a ciphersuite every browser can run; run the RFC 9420 test vectors and an interop exchange against OpenMLS for those operations | one week |
| 0b. Move to 2.0 | Port the plan's API assumptions to ts-mls 2.0 (parameter objects, an authentication service in every call), pin the X25519 suite, follow the release candidate to its release; all from the spike, see the results below | a few days |
| 1. Delivery service | Room server: group state per session, ordered commits with epoch check, `GroupInfo` store, KeyPackage store, relay of the MLS message types, tests | one to two weeks |
| 2. Client provider | `MlsKeyProvider` behind the existing interface, middleware routing for MLS messages, committer election, frame key derivation into the worker, unit tests | two to three weeks |
| 3. Browser matrix | The same matrix as the current design: three browsers, arrivals, departures, reconnects, recording member, breakouts | one week |
| 4. Credentials | Management server signs credentials for authenticated users, `AuthenticationService` validates them, a security code per meeting | later, separate |

Six to eight weeks of focused work to reach phase three, without phase four; the spike week is
spent.

### Risks

- **Library assurance.** ts-mls is actively maintained, with recent releases, RFC test vectors and an
  interop directory in the repository, so maintenance is not the concern. Three things are. It has not
  been audited, and neither has our own implementation, so that alone is not a point against it; the
  difference is that ours is fifteen hundred lines we wrote, can read in full and have reviewed and
  tested ourselves, making a modest claim with a one-sender blast radius, while this would be a large
  protocol implementation we did not write, adopted to make the stronger claims that need an audit to
  be believable, with a single group secret whose compromise exposes the whole room. MLS is also a
  protocol where a subtle mistake in tree handling is invisible in normal use and only matters against
  an adversary, which no amount of browser testing finds. The paths this plan leans on hardest,
  external commits into a large group, rejected concurrent commits and re-synchronisation, are the
  ones fewest deployments have exercised yet. And a small maintainer team is a dependency risk if they
  stop, because an MLS implementation is not something to pick up casually. Mitigation: the spike runs
  the official RFC 9420 test vectors and an interop exchange against OpenMLS for exactly the
  operations planned, at the scale planned. Phase four is where an audit would have to precede any
  claim to protect against the operator.
- **Stateful server.** Ordering commits and holding `GroupInfo` is straightforward in one process and
  harder across the horizontally scaled room server. The current design deliberately avoided this.
- **Committer availability.** Removes depend on a remaining member acting. The deterministic election
  with a timeout handles a slow or gone committer, but it adds a delay to every departure, during
  which the leaver can still read.
- **Bundle size.** About 700 KB of library against an implementation that currently adds none.
- **Debuggability.** Group state is opaque and shared. The diagnostics that made the current design
  debuggable in a week of browser logs will need an equivalent for epochs and commits.

### Decision

Proceed, in a way that keeps the risk where it can be seen:

1. **Spike first, one week, as the go or no-go.** It answers, cheaply, the questions that would
   otherwise surface in week five with the delivery service already built around them: whether
   external commits behave in a 200-leaf tree and under concurrent joins, how large `GroupInfo` is
   for a joiner to download, whether the WebCrypto-only ciphersuite is enough, and what commits and
   exporter derivations cost in a browser. The RFC 9420 test vectors and an interop exchange with
   OpenMLS are the substitute for the audit we do not have, and the script becomes the fixture
   generator for the provider's tests. Done; the results are in the next section, and they add
   the preconditions listed there.
2. **Build the MLS provider beside the pairwise one, not instead of it.** Both sit behind the existing
   provider interface; a room or tenant selects one, and MLS is off by default. The pairwise design
   stays as the fallback and the comparison, and a flaw in the new one never reaches a room that did
   not opt in.
3. **Make the delivery service additive.** The room server gains ordered commits, a `GroupInfo` store
   and a KeyPackage store as new methods; the existing relay stays for the pairwise provider.
4. **Reuse the acceptance bar.** The unit suites and the browser matrix that verified the current
   design are the bar for this one.
5. **Audit before any stronger claim.** Until then the feature claims what it claims today, keeping
   federated media nodes out, and the MLS provider is the road to the rest.

### Spike results (2026-09-05)

The spike in phase 0 was run twice: first against the published ts-mls 1.6.4, then, after that run
turned up three library problems, against upstream `main` at 2.0.0-rc.16, which is the version phase
one would build on. Each run built groups of 25, 50, 100 and 200 members in Node and exercised every
operation the design relies on, timed the same operations inside headless Chromium and Firefox, ran
the RFC 9420 test vectors shipped with the library, and exchanged messages with OpenMLS 0.9 running
in Docker. The scripts live in `tmp/mls-spike` and become the fixture generators for the provider's
tests later. Ciphersuite `MLS_128_DHKEMP256_AES128GCM_SHA256_P256` unless stated.

**Everything the design needs works, in both versions.** Adds with a Welcome that carries the
ratchet tree, external joins from a published `GroupInfo`, Removes that leave the leaver unable to
derive the next epoch, Update commits, rejection of a commit built on a stale epoch (`Cannot
process commit or proposal from former epoch`), recovery by applying the winning commit to the kept
state, and recovery by an external resync commit that replaces the old leaf rather than adding one.
After every step all members hold the same exporter secret, at every size tried.

**Sizes are fine and the same in both versions.** A key package is 0.4 KB. `GroupInfo` with the
tree, which a joiner downloads, is 54 KB at 200 members and 0.3 KB without it. A commit is 23 KB at
200 members, a Welcome for a batch of 25 newcomers 34 to 56 KB. A member's serialised state at 200
members is 458 KB on 1.6.4 and 286 KB on `main`. The exporter plus RFC 9605 frame keys and salts for
200 senders take 14 to 20 ms.

**The RFC 9420 test vectors pass.** The library's own suite against the vectors published with the
RFC, 14 files and 785 cases covering tree math, key schedule, secret tree, message protection,
transcript hashes, Welcome, tree operations and validation, TreeKEM, and the passive client
scenarios in which a client processes Welcomes and commits produced by other implementations, passes
on this machine for all seven ciphersuites, on 1.6.4 (113 s) and on `main` (40 s).

**What 1.6.4 got wrong, and what `main` has already fixed.** Three problems, found in this order:

- The `external_pub` extension of a `GroupInfo` was written as the bare HPKE key where RFC 9420
  section 12.4.3.2 defines a length-prefixed vector. OpenMLS follows the RFC, so neither library
  could external-join the other's group; the first interop run failed there with `Invalid public
  key for the ciphersuite`. `main` encodes and decodes the vector correctly.
- An external resync with a key package whose signature key matched no leaf looped forever in 1.6.4
  instead of throwing. `main` matches the old leaf by signature key and then by credential identity,
  so a returning member with a fresh key pair resyncs cleanly, and a real mismatch throws.
- On every commit 1.6.4 derived the whole secret tree for the new epoch eagerly, two HKDF
  expansions per node for 2N-1 nodes plus two ratchet roots each, every one an asynchronous
  WebCrypto call. Measured in isolation that was 83 ms at 256 leaves and most of the per-commit
  cost, growing linearly with the room. `main` derives the secret tree on demand and caches the tree
  hash, which is what makes the difference in the numbers below.

Two things are true of both versions. Signatures are not WebCrypto: the default provider uses
`@noble/curves` for ECDSA and Ed25519 in pure JavaScript (no WebAssembly either way), and the
`@noble` packages are peer dependencies that must be installed explicitly. And a join validates the
signature of every leaf, so joining costs about a millisecond or two times the room size in Node, and
adding members costs each member the verification of every added key package.

**Time, per member, for processing one commit** (Node 24 on a laptop, p95 unless stated):

| Members | Remove or update commit, 1.6.4 | Remove or update commit, main | Join from Welcome (avg), 1.6.4 / main | External join, joiner side (avg), 1.6.4 / main |
| ------- | ------------------------------ | ----------------------------- | ------------------------------------- | ---------------------------------------------- |
| 25      | 36 to 61 ms                    | 13 to 14 ms                   | 74 / 56 ms                            | 172 / 102 ms                                   |
| 50      | 63 to 65 ms                    | 15 to 18 ms                   | 179 / 116 ms                          | 368 / 203 ms                                   |
| 100     | 110 to 124 ms                  | 14 ms                         | 298 / 187 ms                          | 841 / 374 ms                                   |
| 200     | 190 to 228 ms                  | 15 to 16 ms                   | 426 / 337 ms                          | 1,840 / 988 ms                                 |

On `main` the per-commit cost no longer depends on the size of the room: a departure costs every
remaining member about 15 ms of asynchronous WebCrypto work whether the room has 25 or 200 people.
What still grows is the joiner's own work, because a joiner validates every leaf of the tree it
receives, and the cost of an Add commit to everyone else, because each added key package is verified.
Against the thresholds in the plan, on `main` in Node: `GroupInfo` under 100 KB passes, derivation
under 50 ms passes, commit processing under 50 ms per member passes for Removes, Updates and
external commits at every size and fails only for Add commits of 25 at once (a batch of 5 should
pass), and the join under 1 s passes on average at 200 members for both the Welcome and the
external path but not at the slowest (1.4 s and 1.2 s). The browser numbers below are the ones
that count, and there it passes.

**In a browser, on `main`, it is fast.** The same operations from a page in headless Chromium 153 and
Firefox 155 through Playwright, per member and p95 unless stated:

| Members, browser, suite | Remove or update commit | External commit | Add commit of 25 | Join from Welcome (avg) | External join, joiner side | Whole scenario |
| ----------------------- | ----------------------- | --------------- | ---------------- | ----------------------- | -------------------------- | -------------- |
| 50, Chromium, P-256     | 4 ms                    | 4 ms            | 40 ms            | 31 ms                   | 52 ms                      | 3 s            |
| 50, Chromium, X25519    | 3 ms                    | 3 ms            | 8 ms             | 6 ms                    | 23 ms                      | 1 s            |
| 50, Firefox, X25519     | 17 to 20 ms             | 13 ms           | 42 ms            | 39 ms                   | 83 ms                      | 5 s            |
| 200, Chromium, P-256    | 5 ms                    | 5 ms            | 70 ms            | 129 ms                  | 189 ms                     | 69 s           |
| 200, Chromium, X25519   | 4 ms                    | 3 ms            | 9 ms             | 12 ms                   | 61 ms                      | 9 s            |
| 200, Firefox, X25519    | 13 to 15 ms             | 10 ms           | 38 ms            | 59 ms                   | 244 ms                     | 38 s           |

For comparison, the same page on 1.6.4 at 200 members cost a Chromium member 49 to 82 ms per commit
and a Firefox member 265 to 278 ms; `main` is ten to twenty times cheaper. A 200-member departure now
costs each Chromium member about 4 ms and each Firefox member about 14 ms, and a newcomer waits
between 60 and 250 ms before it can read anything. Every threshold in the plan passes in the browser
on `main`, except that an Add commit of 25 people at once costs each Chromium member 70 ms on P-256;
smaller batches or the other suite bring it under. All members agree on the exporter in every run.

The X25519 suite is not only the one Firefox can run, it is also the faster one everywhere, by two to
ten times on joins and adds, because Ed25519 verification in pure JavaScript is much cheaper than
P-256 ECDSA. That settles the suite question in favour of `MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519`
unless something else forces P-256.

Firefox could not run the P-256 suite in either version. Every attempt to join a group fails while
decrypting the Welcome, and the probe that pins it down is small: a P-256 private key that
`@hpke/core` derives from a secret cannot be exported by Firefox's Web Cryptography implementation
(`exportKey` fails with `OperationError`), while a generated key exports fine. ts-mls derives its init
and path keys from secrets and stores them exported, so every P-256 group operation breaks in Firefox
at the first join. The library's own browser tests run in Chromium only, which is why nobody noticed.

**It interoperates with OpenMLS.** A file exchange between OpenMLS 0.9 (Rust, in Docker) and ts-mls
on the P-256 suite ran five rounds: a ts-mls client joining from an OpenMLS Welcome, a ts-mls client
committing itself into the OpenMLS group externally, a ts-mls Remove sent as an encrypted private
message and applied by OpenMLS, an OpenMLS update commit applied by ts-mls, and an OpenMLS Add with a
ts-mls member already present. On 1.6.4 the external join failed on the encoding bug above and the
other four rounds passed; on `main`, unpatched, all five pass and every party agrees on the exporter
secret afterwards. The `main` branch also carries a gRPC client for the official MLS interop test
runner, which is how the maintainers now exercise the library against OpenMLS themselves.

**Preconditions this adds to the decision.** Two, both contained:

1. Build on ts-mls 2.0, not 1.6.4. It is a release candidate today (2.0.0-rc.16) with a different,
   parameter-object API and a mandatory authentication service in every call, which suits phase four.
   Nothing in the plan should be built on 1.6.4, whose external joins do not interoperate and whose
   commits cost every member time proportional to the room.
2. Pin the X25519 suite (`MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519`) for the room. A group has one
   suite for all its members; P-256 cannot be joined from Firefox in either version, and X25519 is
   faster in every browser besides. If `@hpke/core` fixes the Firefox derivation, P-256 becomes an
   option again, but nothing here needs it.

**What it means for the decision.** The protocol does what the plan claims, the library on `main`
is correct at 200 members and interoperates with OpenMLS, and the one structural cost that worried
the first run, commit processing growing with the room, is gone in the version we would use. What
remains is a joiner's tree validation, between 60 and 250 ms at 200 members in a browser, and the
per-member cost of large Add batches, both of which are policy (trust the tree hash of a `GroupInfo`
signed by a member we already trust; add in smaller batches) rather than protocol. The
decision to proceed stands, on 2.0, with the suite question settled first. The upstream issues worth
filing are the Firefox P-256 derivation failure against `@hpke/core`, and a note to ts-mls that the
1.6.x `external_pub` encoding is not interoperable, so that 1.6 users know to move.

## Making sure it is actually encrypting

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
gets it too. It is a property of the room rather than of individual participants, since a room either
requires encryption of everyone or of no one.

## Browser support

Verified working, including between different browsers: Chrome, Edge, Firefox and Safari. Any browser
implementing `RTCRtpScriptTransform` is allowed to try, and one that accepts the transform without
using it is caught by the checks above rather than by a list of permitted browsers.

Chrome additionally requires the peer connection to be created with encoded insertable streams
enabled, which is why that flag is set only when encryption is on. Setting it unconditionally breaks
media in rooms that are not encrypted.

## Limitations

**Identity is trusted on first use.** A room server that substituted its own identity keys at the
moment two participants first met could place itself between them, and neither side would be able to
tell, because they only ever learned each other's key through it. Pinning detects a key that changes
later, not one that was wrong from the start. Out of band verification, where two people compare a
short code, would close this and is not implemented. With pairwise keys that means one code per pair;
the leader model above is what makes a single code per meeting possible.

**The pairwise key is not ratcheted.** The KEK comes from a single Diffie-Hellman exchange, so it is
fixed for the session and a compromise of it exposes every media key wrapped under it. Identity keys
are ephemeral per session, so nothing is exposed across meetings. Media keys do move forward as
people arrive, which limits what any one of them is worth, but that is a side effect rather than a
designed forward secrecy guarantee.

**A leaver can read a short window.** Departures are batched, so the key is replaced up to 200
milliseconds after someone leaves, and anything sent in that window is readable by them if they can
obtain the ciphertext.

**Old frames can be replayed within the retention window.** Recipients accept any key they still
hold, so a media node could resend frames captured under one of them.

**A media node can misattribute streams.** Decryption looks the key up by the frame's sender
namespace, not by which participant a consumer belongs to, so a node could route one person's stream
into another's tile. It cannot read or alter the content, only mislabel it.

**Local recording and transcription see plaintext.** Both run in the browser on decoded media and are
unaffected by encryption. Browser speech recognition sends audio to a third party service, which is
worth considering in a room chosen for its privacy.

**Silence is observable.** Frames with no content are passed through unencrypted, so an observer can
distinguish speech from silence. Frame sizes already revealed this before encryption, so it is not a
new exposure, but it is not hidden either.

**Chat and file sharing are not covered.** Encryption applies to media. Chat already relies on the
room server, which is trusted for key exchange in any case.

**Automated tests cover the cryptography, the signalling and the fail closed checks, not the
browsers.** The one way derivation, the receiver's key store, the sealing and parsing of frames for
each codec, the pairwise exchange between two participants, the signalling middleware, the codec
choice and the service that holds media until a transform confirms all run under Vitest in the client,
the last against a faked worker; the room server's relay has its own tests. What a browser actually
does with a transform, and whether two browsers can read each other, was verified by hand across
Chrome, Edge and Firefox.

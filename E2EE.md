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
ways past it. Both change the key model rather than the rotation, and neither is built here.

**A leader with a room key.** One participant, named by the room server, generates a single room key
and hands it to each participant pairwise. Each sender's frame key is derived from it, so the frame
format and the worker stay as they are. A departure is then one participant sending N messages
rather than every sender doing so, and a single security code read aloud verifies the whole meeting.
The price is that one key protects the whole room, so one compromise exposes everyone rather than one
sender, that everyone stalls for a round trip when the leader leaves, and that the room server has to
name the leader.

**MLS (RFC 9420).** A group secret held in a ratchet tree, where a membership change is a single
commit of logarithmic size rather than every member re keying every other member. There is an IETF
draft binding SFrame keys to MLS exporters, so the two are designed to fit together. The cryptography
is available in a browser without WebAssembly. What it needs is an ordered delivery service for
commits, which the room server is not today, and a substantial amount of group state and recovery
machinery. It is the answer if this is ever wanted at lecture scale with everyone sending.

For a feature that is off by default, opt in per room, and built to keep media nodes out at meeting
scale, pairwise keys with the rules above are the smaller and more reviewable mechanism.

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

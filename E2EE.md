# End-to-end encryption

edumeet can encrypt meeting media end to end, so that the media nodes forwarding it cannot read it.
This is a proof of concept: it is off by default, has not been independently audited, and the
limitations below are worth reading before enabling it for anyone who depends on the guarantee.

## What it protects

Without end-to-end encryption a media node terminates SRTP. It decrypts every stream, forwards it,
and re-encrypts it per recipient, so the node handles decoded audio and video. In a federated
deployment those nodes may run on infrastructure operated by other organisations, in other countries.

With end-to-end encryption on, the media node sees only the leading codec bytes it needs in order to
make forwarding decisions. Everything else is ciphertext it has no key for.

The room server is trusted for key exchange. That is unavoidable in a browser client, because the
room server also serves the application: a hostile room server would not need to attack the key
exchange when it could simply serve a modified client instead. See the limitations below for what
this means in practice.

## Turning it on

It is off unless enabled. The effective value for a room is resolved as: the per-room setting, then
the tenant default, then the room server configuration, then off. Only an unset value falls through,
so an explicit "off" at any level stops the chain rather than deferring to the next one.

Both the tenant default and the per-room setting are edited from the management views. A tenant can
also lock its default, in which case rooms cannot override it.

A browser that cannot support the WebRTC Encoded Transform API is refused entry to a room that
requires encryption, at the lobby rather than after admission.

## How it works

Media is encrypted inside a worker, before frames reach the network, using
`RTCRtpScriptTransform` and the WebCrypto API. There is no WebAssembly and no additional
cryptography dependency.

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
node forwards a single ciphertext to everyone.

### Key exchange

On joining, each participant generates an ephemeral ECDH P-256 identity key pair. The private key is
created as non-extractable, so the application itself cannot read it, and it is never stored: a new
pair is generated for every session.

Participants announce their **public** identity key over the existing signalling channel. On first
contact, each side derives the shared KEK for that pair with ECDH followed by HKDF-SHA256, then sends
its own media key wrapped under it.

The room server relays these messages and stamps the authoritative sender id on them, but the values
it carries are a public key and a wrapped key. It holds no private key and cannot derive the KEK.

### Frame encryption

Frames are encrypted with AES-GCM-256. The nonce is the key identifier followed by a counter, and it
also serves as the frame header, so decryption needs no shared state beyond the key.

A small number of leading bytes are left in the clear because the media node has to read them to make
layer forwarding decisions. The count depends on the codec and, for VP8, on whether the frame is a
keyframe. Those clear bytes are authenticated as additional data, so they cannot be tampered with
even though they are readable.

Frames with nothing beyond the clear header, which is what an Opus stream produces during silence
when discontinuous transmission is active, are passed through untouched. They carry no content.

### Identity pinning

The first identity key seen for a participant is pinned. If a later announcement from the same
participant carries a different key, the change is flagged: that participant is marked in the
participant list and a warning is raised. Media keeps flowing so the call is not interrupted, which
means the warning can be ignored, and it is worth taking seriously when it appears.

Pinning lasts for the session. Identity keys are regenerated on every join, so nothing carries over
between meetings.

### Key rotation

Media keys are rotated when a participant leaves. Each remaining participant generates a new key and
redistributes it, so someone who has left cannot read what is said afterwards. Keys are indexed by
identifier and recipients keep the previous one, so frames already in flight still decrypt and the
change is not audible or visible.

There is no rotation on join. A joining participant has a fresh identity and simply receives the
current keys.

## Making sure it is actually encrypting

Attaching an encryption transform is not proof that a browser is using it. One browser was observed
accepting the transform and then never passing frames through it, which would send unprotected media
while the interface claimed otherwise.

Two things prevent that now:

- A sender holds its real track disabled until the worker confirms it has processed a frame. Until
  then nothing but silence or a black frame can leave.
- If no frame is processed within a few seconds of the transport connecting, the participant is
  removed from the room with an explanation rather than being allowed to continue unprotected.

The room indicator reflects confirmed state rather than intent: it shows the room as protected only
once encryption has demonstrably happened.

## Browser support

Verified working, including between different browsers: Chrome, Firefox and Safari. Edge shares
Chrome's engine. Any browser implementing `RTCRtpScriptTransform` is allowed to try, and one that
accepts the transform without using it is caught by the checks above rather than by a list of
permitted browsers.

## Limitations

**Identity is trusted on first use.** A room server that substituted its own identity keys at the
moment two participants first met could place itself between them, and neither side would be able to
tell, because they only ever learned each other's key through it. Pinning detects a key that changes
later, not one that was wrong from the start. Out-of-band verification, where two people compare a
short code, would close this and is not implemented yet.

**No forward secrecy within a session.** The key exchange is a single Diffie-Hellman exchange rather
than a ratchet. Identity keys are ephemeral per session, so nothing is exposed across meetings, but a
key compromised during a call exposes that call.

**Local recording and transcription see plaintext.** Both run in the browser on decoded media and are
unaffected by encryption. Note that browser speech recognition sends audio to a third-party service,
which is worth considering in a room chosen for its privacy.

**Silence is observable.** Frames with no content are passed through unencrypted, so an observer can
distinguish speech from silence. Frame sizes already revealed this before encryption, so it is not a
new exposure, but it is not hidden either.

**Chat and file sharing are not covered.** Encryption applies to media. Chat already relies on the
room server, which is trusted for key exchange in any case.

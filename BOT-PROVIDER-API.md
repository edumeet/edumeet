# Bot provider API

edumeet can hand a meeting to an outside service that records it, streams it or transcribes it. This
document is the contract that service implements. It is written for whoever builds that side.

edumeet calls such a service a **provider**, and the work it does for one meeting a **job**. A
moderator starts a job from the room; the provider answers by opening the meeting in a browser it
controls and doing its work; the moderator, or the end of the meeting, stops it again.

edumeet has no idea what recording or streaming involves. It never sees a file, a stream key or a
transcript, and it has nowhere to put a destination or a language: everything of that kind is
configured on the provider's side. What edumeet sends is which meeting, and which kind of work.

## The two keys

Two separate credentials are involved, and it is worth keeping them apart from the start.

| | Issued by | Held by | Used for |
| --- | --- | --- | --- |
| **API key** | the provider | edumeet | edumeet calling the provider's API |
| **Bot access token** | edumeet | the provider | the provider's browser joining rooms |

The API key travels from the provider to the tenant administrator, who pastes it into edumeet. The
bot access token travels the other way: edumeet generates it, shows it once, and the administrator
sends it to the provider. edumeet stores the API key encrypted and the bot token only as a hash.

## Setting up a provider

1. The provider gives the tenant administrator three things: the https address of its API, an API
   key, and the IP addresses its browsers connect from.
2. The administrator opens the tenant in the edumeet management interface, sets the bot policy to
   admit bots with an access token, and adds a row under **Bot providers** with a label, a generated
   bot access token, the allowed addresses, the job type, the API address and the API key.
3. The administrator sends the bot access token to the provider, who stores it for that tenant.

The label is what participants see as the name of the bot in the meeting, and what a moderator sees
in the menu, so it should be the name of the service.

One row is one kind of job. A provider that both records and streams gets two rows, each with its
own token. A row without an address and key is a bot the provider starts by hand, as before; it gets
no button in the room.

## The API

Two calls, both authenticated with the API key as a bearer token:

```
Authorization: Bearer <api key>
```

The address configured in edumeet is a base address. edumeet appends the paths below to it, so it
must be https, and must carry no query, fragment or credentials. Certificates are validated. A
redirect is not followed. A call that takes longer than **10 seconds** is abandoned.

### Starting a job

```http
POST <api url>/v1/jobs
Content-Type: application/json

{
  "jobId": "4be1c0de-0000-4000-8000-4be1c0de0001",
  "type": "recorder",
  "room": {
    "url": "https://meet.example.org/lecture1?headless=1&botType=recorder&jobId=4be1…&displayName=Acme%20Recorder",
    "host": "meet.example.org",
    "roomId": "lecture1",
    "sessionId": "8f0c…",
    "mainSessionId": "2b71…",
    "sessionName": "Group A"
  },
  "recipients": [ { "email": "teacher@example.org" } ],
  "locale": "pl"
}
```

- **`jobId`** identifies this job in every later call, and in the page the provider opens. It is a
  UUID.
- **`type`** is `recorder`, `transcriber` or `streamer`, and matches the row the job was started
  from.
- **`room.url`** is the page to open, ready to use. It is built by edumeet; the provider appends the
  bot access token to it, see below.
- **`room.host`**, **`room.roomId`** and **`room.sessionId`** identify the session the job runs
  in, so that a provider can apply its own per-tenant or per-room configuration. `sessionId` is the main room
  unless the job runs in a breakout room, in which case **`room.sessionName`** is that room's name.
- **`room.mainSessionId`** is the main room's session, the same for every job of one meeting,
  breakout rooms included; it equals `sessionId` for a job in the main room. `roomId` is the name
  of the room and stays the same when the room is used again another day, so this is the field
  to group the jobs of one meeting by.
- **`recipients`**, when present, are the people to tell once the recording is ready: the owners
  of the room and the moderator who started the job, each once. edumeet resolves them from its
  own accounts, so they are real addresses of signed-in people. Absent when nobody could be
  resolved; the job still runs.
- **`locale`**, when present, is the language the tenant writes to its people in, as a language
  code such as `pl` or `de`. Use it for the notification; fall back to English when it is absent
  or you have no template for it.

Any 2xx means the job is accepted. The body of the answer is ignored, so an empty `202` is enough.
Anything else, a timeout, or a certificate that does not validate, means the job failed: edumeet
tells the moderators, and sends a delete for the same `jobId` in case the job was started anyway.

The answer should be prompt. Launching the browser can happen after it; edumeet waits separately for
the bot to arrive.

### Stopping a job

```http
DELETE <api url>/v1/jobs/4be1c0de-0000-4000-8000-4be1c0de0001
```

The job should be finished properly: stop the capture, close the file or the stream, and let the
browser leave the meeting. Any 2xx means the job is being stopped. **404 also counts as stopped**,
so a job the provider no longer knows needs no special handling.

edumeet sends this when a moderator stops the job, when the bot is removed from the meeting, when the
meeting ends or its room empties, when the breakout room the job runs in is closed, and whenever a job
fails. It may arrive more than once for the same job, and it may arrive for a job whose browser has
already gone.

It is not sent while an edumeet server restarts. See **Surviving a restart**.

### Telling people about the recording

edumeet does not send mail about recordings and never sees the file, so the notification is
yours to send, to the `recipients` of the job, once the recording is available. Send it from an
address of the institution rather than your own: the tenant gives you a sending domain for that,
so the mail looks like it comes from where the meeting was held, and it lands. Say where the
recording is, and until when. Send nothing to anyone who is not in `recipients`; whether others
get it is the owners' decision, not the provider's.

Only a signed-in moderator can start a job, so the `recipients` list is never empty for a reason
other than a lookup failure on edumeet's side.

A meeting with breakout rooms can have a job in the main room and one in each breakout room, each
started separately and possibly by different moderators. Group them by `room.mainSessionId` and
send one notice for the meeting, with a link per recording named after its `sessionName` (the main
room's has none), to the
union of the `recipients` of those jobs: the owners of the room are in every list, and a moderator
who started one of the recordings is told about the others of the same meeting. The natural moment
to send is when the main room's job ends, with a short grace period for a breakout job that is still
being finished; a meeting can also have breakout recordings only, in which case send when the last
of them has been quiet for that long.

## The browser side

The provider opens `room.url` in a browser it controls, with the bot access token appended to the
fragment:

```
<room.url>#botToken=<bot access token>
```

The fragment is not sent to any server, so the token appears in no access log. The page removes it
from its address as soon as it has read it.

The page joins the meeting on its own. It shows the meeting and nothing else: no dialogs, buttons,
notifications or sounds. It sends no audio or video, and it is hidden from the participant list and
the participant count. A transcriber page receives audio only: it declares no video capability, so
the media node never sends it video, which keeps such a browser light enough to run many of them.
A meeting with a bot in it always goes through a media node, however few people are in it, so what
the bot receives does not change as people arrive and leave. Where the deployment collects client
monitoring statistics, the page sends its own, marked as a bot's, so the operator can see what
the recorder received. Participants see
that it is there from an icon in the top bar, and moderators can see and stop the job from the bot
menu.

### Reporting how the job is doing

The page provides one function for the provider to call:

```js
window.edumeetBot.status('running');            // repeat while the job is healthy
window.edumeetBot.status('finished');           // done, about to leave
window.edumeetBot.status('failed', 'disk full') // gave up, with a short reason
```

It returns `true` when the status was sent, and exists only on a page that belongs to a job.

**`running` is a heartbeat and it is required.** Send it once the capture is actually running, and
then every 30 seconds for as long as it stays healthy. It should be tied to the health of the work
itself, for example to the encoder still producing output, because this is what lets edumeet notice a
recorder that has hung behind a page that is still connected.

The reason given with `failed` is shown to the moderators and written to the edumeet server log, so
it should be short and say something useful. It is cut off after 200 characters.

### Watching the page

The page writes its state on the `<html>` element, and the provider should watch it rather than only
its own process:

| Attribute | Meaning |
| --- | --- |
| `data-edumeet-state` | `new`, `lobby`, `joined` or `left` |
| `data-edumeet-connection` | `connecting`, `connected`, `reconnecting` or `disconnected` |
| `data-edumeet-reason` | why it left, once it has |

**When `data-edumeet-reason` appears, the job is over**, whatever the cause, and no delete will
arrive for it. Finish the work and close the browser. The reasons a job page can see are
`kicked` (a moderator removed it, or edumeet ended a job whose browser did not leave),
`meetingEnded`, `connectionClosed`, `sessionClosed` (its breakout room was closed),
`jobNotActive` (the job it carries is over, or belongs to another browser), and the refusals
`roomNotOpen`, `botsNotAllowed` and `botTokenRejected`.

## The life of a job

| edumeet is waiting for | For how long | Otherwise |
| --- | --- | --- |
| the browser to join | 60 s | the job fails |
| the first `running` after it joined | 60 s | the job fails |
| the next `running` | 90 s | the job fails |
| the browser to leave after a stop | 30 s | edumeet removes it from the meeting |
| the browser to come back after a disconnect | 60 s | the job fails |

A browser that loses its connection does not end the job. The icon in the room changes to show that
the job is interrupted, and if the same browser comes back with the same `jobId` within 60 seconds
the job carries on where it was. Reloading the page counts as coming back; opening a second browser
for a job that already has a live one does not, and is refused with `jobNotActive`.

A room runs at most **10 jobs** at once, all providers and kinds together.

## Surviving a restart

An edumeet server that restarts does not stop the jobs running at their providers. Their browsers
lose the connection and try again by themselves.

A browser whose page carries a `jobId` and finds the room not open yet keeps trying quietly every 3
seconds for 30 seconds, because after a restart it may well be back before the first participant is.
Once somebody is in the room, it is let in and its job is picked up again, with no second `POST`.
Providers therefore need do nothing here, beyond leaving the browser open.

Three limits are worth knowing. A browser gives up reconnecting after about 95 seconds, so an outage
longer than that ends the job. A restarted server recognises a job from the bot access token it
was started with, so a job cannot be picked up after its provider row has been deleted. And the
meeting goes on under a new session: a job started after the restart carries a different
`room.mainSessionId` from those started before it, which are never sent again. A provider that
wants one notice across a restart has to bridge the two itself, by the same `host` and `roomId`
close together in time.

## End-to-end encrypted meetings

A job may run in an end-to-end encrypted meeting. The bot takes part in the encryption like any
participant, which means the provider can read the meeting, so a moderator starting a job in such a
meeting is told so explicitly and has to confirm.

## What a provider is expected to do

- Serve the API over https with a certificate that validates, and answer `POST /v1/jobs` promptly.
- Treat the API key as a secret, and accept no request without it.
- Keep the bot access token for the tenant it was issued for, and connect from the addresses that
  were registered for it.
- Send `running` at least every 30 seconds while a job is healthy, tied to the work rather than to a
  timer alone.
- Watch `data-edumeet-reason` and finish cleanly when it appears.
- Treat `DELETE` as a request to finish properly rather than to kill the process, and answer it even
  for a job it no longer knows.
- Tell the `recipients`, and only them, where the recording is once it is ready, from an address
  of the institution; one notice per meeting, grouped by `room.mainSessionId`, when it had
  breakout rooms.
- Tell the people in the meeting nothing edumeet has not: the bot is disclosed by edumeet itself.

## Recording people

edumeet discloses a running job to everyone in the meeting, but disclosure is not consent. Recording
or streaming a meeting, and keeping what comes out of it, is the deploying organisation's
responsibility under its own law: what participants are told, what they agreed to, where the result
is stored, who may see it and how long it is kept. A provider should be able to say where recordings
are stored and how long they are kept, because the organisations deploying it will have to answer for
it.

# Bot provider API

edumeet can hand a meeting to an outside service that records it, streams it or transcribes it. This
document is the contract that service implements. It is written for whoever builds that side.

edumeet calls such a service a **provider**, and each piece of work it does for a meeting a **job**:
a recording, a live stream or a transcription. For every session of a meeting that has jobs, the
provider runs one **bot**, a browser it controls that is in the meeting and does all of that
provider's jobs there at once. A moderator starts and stops jobs from the room; the provider switches
each kind of work on or off in its bot, and the bot leaves when its last job ends.

edumeet has no idea what recording or streaming involves. It never sees a file, a stream key or a
transcript, and it has nowhere to put a destination or a language beyond what is described here:
everything of that kind is configured on the provider's side. What edumeet sends is which meeting,
which bot, and which kind of work.

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

1. The provider gives the tenant administrator four things: the https address of its API, an API
   key, the IP addresses its browsers connect from, and the kinds of job it does.
2. The administrator opens the tenant in the edumeet management interface, sets the bot policy to
   admit bots with an access token, and adds a row under **Bot providers** with a label, a generated
   bot access token, the allowed addresses, the kinds of job ticked, the API address and the API key.
3. The administrator sends the bot access token to the provider, who stores it for that tenant.

The label is what participants see as the name of the bot in the meeting, and what a moderator sees
in the menu, so it should be the name of the service.

One row is one provider, with one token, whatever kinds of job it offers. edumeet sends one bot of
a row to a session, and that bot does every kind the row offers there. A provider whose kinds run as
separate systems, each with a browser of its own, registers one row per kind instead: each row
gets its own token, and its own bot in the session. A row without kinds, address and key is a bot
the provider starts by hand, as before; it gets no button in the room.

## The API

Three calls, all authenticated with the API key as a bearer token:

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
  "botId": "7d3e5a10-0000-4000-8000-7d3e5a100001",
  "room": {
    "url": "https://meet.example.org/lecture1?headless=1&botId=7d3e…&session=8f0c…&displayName=Acme",
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

- **`jobId`** identifies this job in every later call. It is a UUID.
- **`type`** is `recorder`, `transcriber` or `streamer`, one of the kinds ticked on the row.
- **`botId`** is the bot that does the job. It is a UUID edumeet chooses, one per session and
  provider. **The first job with a `botId` you do not know means: open `room.url` in a new browser.
  A job with a `botId` you already run means: switch this kind of work on in that browser**, which is
  already in the meeting. A session runs at most one job of each kind, so a bot is never asked for a
  kind it is already doing.
- **`room.url`** is the page to open, ready to use, and is the same for every job of a bot. It is
  built by edumeet; the provider appends the bot access token to it, see below.
- **`room.host`**, **`room.roomId`** and **`room.sessionId`** identify the session the job runs
  in, so that a provider can apply its own per-tenant or per-room configuration. `sessionId` is the
  main room unless the job runs in a breakout room, in which case **`room.sessionName`** is that
  room's name.
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
Other jobs of the same bot are not affected.

The answer should be prompt. Launching the browser can happen after it; edumeet waits separately for
the bot to arrive.

### Stopping a job

```http
DELETE <api url>/v1/jobs/4be1c0de-0000-4000-8000-4be1c0de0001
```

The job should be finished properly: stop that kind of work, close its file or its stream. **The bot
stays in the meeting while it has other jobs, and leaves after the last one**: when the delete is
for the last job of a bot, finish everything and let the browser leave the meeting. Any 2xx means
the job is being stopped. **404 also counts as stopped**, so a job the provider no longer knows
needs no special handling.

edumeet sends this when a moderator stops the job, for every job of a bot the moderator removes from
the meeting, when the meeting ends or its room empties, when the breakout room the job runs in is
closed, and whenever a job fails. It may arrive more than once for the same job, and it may arrive
for a job whose browser has already gone.

It is not sent while an edumeet server restarts. See **Surviving a restart**.

### Listing the jobs of a bot

```http
GET <api url>/v1/bots/7d3e5a10-0000-4000-8000-7d3e5a100001?host=meet.example.org&roomId=lecture1
```

```json
{ "jobs": [ { "jobId": "4be1c0de-0000-4000-8000-4be1c0de0001", "type": "recorder" } ] }
```

edumeet asks this once, when a bot arrives that it does not know, which happens after an edumeet
server was restarted under running jobs. The answer lists the jobs the bot is doing, so edumeet can
show them in the room again. `host` and `roomId` are the room the bot arrived in: **list the bot's
jobs only when you started that bot for that host and room**, and answer `404` otherwise, as for a
bot you do not know. edumeet ends the jobs it picks up here, and stops them at your API, so a bot
that arrived in the wrong room must not bring the jobs of another room with it. Answer `200` with
the list. Only
this answer is read, and only its first 64 KB; entries without a UUID `jobId` or with an unknown
`type` are skipped. A bot you do not know, an empty list, an error or a timeout all mean edumeet
refuses the bot, and its page sees `jobNotActive`.

### Telling people about the recording

edumeet does not send mail about recordings and never sees the file, so the notification is
yours to send, to the `recipients` of the job, once the recording is available. Send it from an
address of the institution rather than your own: the tenant gives you a sending domain for that,
so the mail looks like it comes from where the meeting was held, and it lands. Say where the
recording is, and until when. Send nothing to anyone who is not in `recipients`; whether others
get it is the owners' decision, not the provider's.

Only a signed-in moderator can start a job, so the `recipients` list is never empty for a reason
other than a lookup failure on edumeet's side.

A meeting with breakout rooms can have a bot in the main room and one in each breakout room, each
with its own jobs, started separately and possibly by different moderators. Group them by
`room.mainSessionId` and send one notice for the meeting, with a link per recording named after its
`sessionName` (the main room's has none), to the union of the `recipients` of those jobs: the owners
of the room are in every list, and a moderator who started one of the recordings is told about the
others of the same meeting. The natural moment to send is when the main room's last job ends, with a
short grace period for a breakout job that is still being finished; a meeting can also have breakout
recordings only, in which case send when the last of them has been quiet for that long.

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
the participant count. It receives audio and video, since a bot may be asked to record at any time;
only the bot of a provider that offers transcription and nothing else is sent with
`botType=transcriber`, declares no video capability, and receives audio alone, which keeps such a
browser light enough to run many of them. A meeting with a bot in it always goes through a media
node, however few people are in it, so what the bot receives does not change as people arrive and
leave. Where the deployment collects client monitoring statistics, the page sends its own, marked
as a bot's, so the operator can see what the recorder received. Participants see that it is there
from an icon in the top bar, and moderators can see and stop each job from the bot menu.

### Reporting how the jobs are doing

The page provides one function for the provider to call:

```js
window.edumeetBot.status('running');                           // the bot's heartbeat
window.edumeetBot.status('finished', undefined, 'streamer');   // this job is done
window.edumeetBot.status('failed', 'ingest down', 'streamer'); // this job gave up
window.edumeetBot.status('finished');                          // every job is done, about to leave
window.edumeetBot.status('failed', 'disk full');               // the bot gave up altogether
```

It returns `true` when the status was sent, and exists only on a page carrying a `botId`.

**`running` is a heartbeat for the whole bot and it is required.** Send it once the capture is
actually running, and then every 30 seconds for as long as the bot stays healthy. It should be tied
to the health of the work itself, for example to the encoder still producing output, because this is
what lets edumeet notice a recorder that has hung behind a page that is still connected.

`finished` and `failed` take a third argument, the kind of job they are about. With it, only that
job ends, and the bot goes on with the others; a `finished` job is not sent a delete, a `failed` one
is. Without it, they are about the whole bot and every job it runs. A kind the bot is not running is
ignored, and a third argument that is not a kind of job sends nothing at all, so a typo cannot end
every job by accident.

The reason given with `failed` is shown to the moderators and written to the edumeet server log, so
it should be short and say something useful. It is cut off after 200 characters. A bot that fails
as a whole tells the moderators once, not once per job.

### Watching the page

The page writes its state on the `<html>` element, and the provider should watch it rather than only
its own process:

| Attribute | Meaning |
| --- | --- |
| `data-edumeet-state` | `new`, `lobby`, `joined` or `left` |
| `data-edumeet-connection` | `connecting`, `connected`, `reconnecting` or `disconnected` |
| `data-edumeet-reason` | why it left, once it has |

**When `data-edumeet-reason` appears, the bot is over**, whatever the cause, and no delete will
arrive for its jobs. Finish the work and close the browser. The reasons a bot page can see are
`kicked` (a moderator removed it, or edumeet ended a bot that did not leave), `meetingEnded`,
`connectionClosed`, `sessionClosed` (its breakout room was closed), `jobNotActive` (the bot has no
jobs left, or belongs to another browser), and the refusals `roomNotOpen`, `botsNotAllowed` and
`botTokenRejected`.

## The life of a bot

| edumeet is waiting for | For how long | Otherwise |
| --- | --- | --- |
| the browser to join | 60 s | its jobs fail |
| the first `running` after it joined | 60 s | its jobs fail |
| the next `running` | 90 s | its jobs fail |
| the browser to leave after its last job ended | 30 s | edumeet removes it from the meeting |
| the browser to come back after a disconnect | 60 s | its jobs fail |

Every job of a bot shows the bot's state. A job started on a bot that is already running shows as
running at once, so switch the new kind of work on promptly.

A browser that loses its connection does not end its jobs. The icons in the room change to show that
the jobs are interrupted, and if the same browser comes back with the same `botId` within 60 seconds
the jobs carry on where they were. Reloading the page counts as coming back; opening a second browser
for a bot that already has a live one does not, and is refused with `jobNotActive`.

A job that is started while its bot is leaving, after the last job ended, gets a new bot with a new
`botId`.

A session runs at most **one job of each kind**, and a room at most **10 jobs** at once, all
providers, kinds and sessions together.

## Surviving a restart

An edumeet server that restarts does not stop the jobs running at their providers. Their browsers
lose the connection and try again by themselves.

A browser whose page carries a `botId` and finds the room not open yet keeps trying quietly every 3
seconds for 30 seconds, because after a restart it may well be back before the first participant is.
Once somebody is in the room, edumeet asks the provider which jobs that bot runs, with the listing
call above, lets it in, and picks its jobs up again, with no second `POST`. Providers therefore need
to answer that call and leave the browser open.

Four limits are worth knowing. A browser gives up reconnecting after about 95 seconds, so an outage
longer than that ends the jobs. A restarted server recognises a bot from the bot access token it was
started with, so a bot cannot be picked up after its provider row has been deleted. A provider that
cannot answer the listing call loses the bot. And the meeting goes on under a new session: a job
started after the restart carries a different `room.mainSessionId` from those started before it,
which are never sent again. A provider that wants one notice across a restart has to bridge the two
itself, by the same `host` and `roomId` close together in time.

## End-to-end encrypted meetings

A job may run in an end-to-end encrypted meeting. The bot takes part in the encryption like any
participant, which means the provider can read the meeting, so a moderator starting a job in such a
meeting is told so explicitly and has to confirm.

## What a provider is expected to do

- Serve the API over https with a certificate that validates, and answer `POST /v1/jobs` promptly.
- Treat the API key as a secret, and accept no request without it.
- Keep the bot access token for the tenant it was issued for, and connect from the addresses that
  were registered for it.
- Run one browser per `botId`: open it for a `botId` it does not know, and switch a kind of work on
  or off in the running one for a `botId` it does.
- Send `running` at least every 30 seconds while a bot is healthy, tied to the work rather than to a
  timer alone, and report the end or failure of a single kind with its type.
- Watch `data-edumeet-reason` and finish cleanly when it appears.
- Treat `DELETE` as a request to finish that job properly rather than to kill the process, keep the
  bot for its other jobs, and answer it even for a job it no longer knows.
- Answer `GET /v1/bots/<botId>` with the jobs a bot runs, and only for the host and room it was
  started for.
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

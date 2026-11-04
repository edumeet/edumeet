# Bot provider API

edumeet can give a meeting to an outside service. The service records, streams or transcribes the
meeting. This document is the contract that the service implements. It is for the people who build
that service.

edumeet calls such a service a **provider**. Each piece of work that the provider does for a
meeting is a **job**. A job is a recording, a live stream or a transcription. A **session** is the
main room or one breakout room of a room, from the time it opens until it closes. For each session
that has jobs, the provider runs one **bot**. A bot is a browser that the provider controls. The bot
is in the meeting and does all the jobs of that provider in that session at the same time.

A signed-in moderator starts and stops jobs from the room. Jobs start only in a room that is claimed
in the edumeet management. The reason: in an unclaimed room, the first person in the room is a
moderator, and nobody owns the recorded content. The provider starts and stops each job type in
its bot. The bot leaves when its last job ends.

edumeet does not know what recording or streaming involves. edumeet never sees a file, a stream key
or a transcript. edumeet has no place for a destination or a language, other than the data that
this document describes. The provider configures all such data on its side. edumeet tells the
provider which meeting, which bot and which job type.

## The two credentials

There are two different credentials. Keep them separate from the start.

| | Who issues it | Who keeps it | Use |
| --- | --- | --- | --- |
| **API key** | the provider | edumeet | edumeet calls the API of the provider |
| **Bot access token** | edumeet | the provider | the browser of the provider joins rooms |

The provider gives the API key to the tenant administrator. The administrator pastes it into
edumeet. The bot access token goes in the opposite direction. edumeet generates the bot access token and
shows it one time. Then the administrator sends it to the provider. edumeet keeps the API key in encrypted
form. edumeet keeps only a hash of the bot access token.

## Set up a provider

1. The provider gives the tenant administrator four items:
   - the https address of its API
   - an API key
   - the IP addresses that its browsers connect from
   - the job types that it does.
2. The administrator opens the tenant in the edumeet management interface.
3. The administrator sets the bot policy to "Only bots with an access token". The policy "All bots"
   also admits the bot.
4. The administrator adds a row under **Bot providers** with these items: a label, a generated bot
   access token, the allowed addresses, the ticked job types, the API address and the API key.
5. The administrator sends the bot access token to the provider. The provider keeps the bot access
   token for that tenant.

Participants see the label as the name of the bot in the meeting. A moderator sees the label in the
menu. Thus, use the name of the service as the label.

One row is one provider with one bot access token, for all the job types that the provider offers. edumeet
sends one bot of a row to a session. That bot does all the job types of the row in that session.

Some providers run each job type as a separate system, with its own browser. Such a provider
registers one row for each job type. Each row then gets its own bot access token and its own bot in
the session.

A row with no job types, no API address and no API key is for a bot that the provider starts
manually, as before. Such a row gets no button in the room.

## The API

The API has three calls. All calls send the API key in the `Authorization` header:

```
Authorization: Bearer <api key>
```

The address that is configured in edumeet is a base address. edumeet adds the paths below to it.
Thus, the address must use https. The address must not contain a query, a fragment or credentials.
edumeet validates certificates. edumeet does not follow a redirect. If a call takes more than
**10 seconds**, edumeet cancels the call.

### Start a job

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

- **`jobId`** identifies this job in all later calls. It is a UUID.
- **`type`** is `recorder`, `transcriber` or `streamer`. It is one of the job types that are ticked
  on the row.
- **`botId`** identifies the bot that does the job. It is a UUID that edumeet selects, one for each
  session and provider. **The first job with a `botId` that you do not know means: open `room.url`
  in a new browser. A job with a `botId` that you already run means: start this job type in that
  browser.** That browser is already in the meeting. A session runs a maximum of one job of each
  job type. Thus, edumeet never asks a bot for a job type that the bot already does.
- **`room.url`** is the page to open. It is ready to use, and it is the same for all the jobs of a
  bot. edumeet builds this URL. The provider adds the bot access token to it (see below). The URL
  contains `botType` only when the row offers exactly one job type. With `botType=transcriber`, the
  page receives only audio. If the row has job types, and the browser comes with a `botType` that
  the row does not offer, edumeet refuses the browser with `botTokenRejected`.
- **`room.host`**, **`room.roomId`** and **`room.sessionId`** identify the session that the job
  runs in. With these fields, a provider can apply its own configuration for each tenant or for
  each room. `sessionId` is the main room, except when the job runs in a breakout room. In that
  case, **`room.sessionName`** is the name of that breakout room.
- **`room.mainSessionId`** is the session of the main room. It is the same for all the jobs of one
  meeting, also for the jobs in breakout rooms. For a job in the main room, it is equal to
  `sessionId`. `roomId` is the name of the room. `roomId` does not change when people use the room
  again on a different day. Thus, `room.mainSessionId` is the field to use to group the jobs of one
  meeting.
- **`recipients`**, if present, are the people to tell when the recording is ready. They are the
  owners of the room and the moderator who started the job. Each person is in the list one time.
  edumeet finds these people in its own accounts. Thus, they are real addresses of signed-in
  people. If edumeet finds no address for any of these people, the field is absent. The job runs
  also in that case.
- **`locale`**, if present, is the language that the tenant uses when it writes to its people. It
  is a language code, for example `pl` or `de`. Use it for the notification. Use English if the
  field is absent, or if you do not have a template for that language.

Any 2xx answer means that the job is accepted. edumeet ignores the body of the answer. Thus, an
empty `202` is sufficient.

The job failed if one of these conditions occurs:

- The answer is not a 2xx.
- edumeet cannot deliver the call: there is no connection, edumeet cannot validate the
  certificate, there is a redirect, or there is no answer in 10 seconds.

In that case, edumeet tells the moderators. edumeet also sends a delete for the same `jobId`,
because it is possible that the provider started the job. The failure has no effect on the other
jobs of the same bot.

Answer quickly. You can start the browser after you answer. edumeet waits for the bot to arrive as a
separate step.

### Stop a job

```http
DELETE <api url>/v1/jobs/4be1c0de-0000-4000-8000-4be1c0de0001
```

Finish the job correctly: stop that job type, and close its file or its stream. **The bot stays
in the meeting while it has other jobs. The bot leaves after its last job.** If the delete is for
the last job of a bot, finish all the work. Then let the browser leave the meeting.

Any 2xx answer means that the provider stops the job. **A `404` also counts as stopped.** Thus, a
job that the provider does not know any more needs no special procedure.

edumeet sends this request each time that one of these events occurs:

- A moderator stops the job.
- A moderator removes a bot from the meeting. edumeet sends the request for each job of that bot.
- The meeting ends, or the last participant leaves the room.
- The breakout room that the job runs in closes, or a moderator empties it.
- A job fails.

The request can arrive more than one time for the same job. It can also arrive for a job whose
browser is already gone.

edumeet sends a delete again in these conditions:

- edumeet cannot deliver the delete: there is no connection, edumeet cannot validate the
  certificate, there is a redirect, or there is no answer in 10 seconds.
- The answer is a 5xx other than 501 and 505.
- The answer is a 408 or a 429.

edumeet sends the delete again a maximum of six times. Between the tries, edumeet waits 10 seconds,
then 30 seconds, then 1, 2, 5 and 10 minutes. This is approximately 19 minutes in total. edumeet
accepts all other answers as final. While more than a thousand deletes wait to be sent again,
edumeet does not send a new failed delete again. edumeet does not keep these repeats when the
edumeet server restarts. Thus, set your own limit for the time that a job can run.

edumeet does not send a delete while an edumeet server restarts. Refer to **Survive a restart**.

### List the jobs of a bot

```http
GET <api url>/v1/bots/7d3e5a10-0000-4000-8000-7d3e5a100001?host=meet.example.org&roomId=lecture1
```

```json
{ "jobs": [ { "jobId": "4be1c0de-0000-4000-8000-4be1c0de0001", "type": "recorder" } ] }
```

edumeet sends this request one time, when a bot that edumeet does not know arrives. This occurs
after an edumeet server restarts while jobs run. The answer gives the jobs that the bot does. With
this list, edumeet can show the jobs in the room again.

`host` and `roomId` identify the room that the bot arrived in. `host` is the host of the `room.url`
of the bot. **Give the jobs of the bot only if you started that bot for that host and room.** If
not, answer `404`, the same as for a bot that you do not know. edumeet ends the jobs that it takes
back here, and it stops them through your API. Thus, a bot that arrived in the wrong room must not
bring the jobs of a different room with it.

Answer `200` with the list. edumeet reads only this answer. These rules apply:

- If the answer is more than 64 KB, edumeet refuses it as an error.
- edumeet ignores the entries that do not have a UUID `jobId`, or that have an unknown `type`.
- If a `jobId` is in the list two times, edumeet counts it one time.

In these conditions, edumeet refuses the bot, and the page of the bot gets `jobNotActive`:

- a bot that you do not know
- an empty list
- an error
- a timeout.

edumeet sends a delete for each listed job that it does not take back. edumeet does not take back a
listed job in these conditions:

- The job has a job type that the row does not offer any more.
- The job has a job type that the session already runs. This includes the job type of a different
  job in the same list.
- The job is more than the job limit of the room.
- The job is for a room or a breakout room that closed in the meantime.

A special case: the `room.url` of a bot contains `botType` when its row offered exactly one job
type. If the row does not offer that job type any more when the bot comes back, edumeet refuses the
bot with `botTokenRejected`. This occurs before edumeet makes the listing call.

### Tell people about the recording

edumeet does not send email about recordings, and edumeet never sees the file. Thus, the
notification is your responsibility. Send it to the `recipients` of the job when the recording is
available.

Send the notification from an address of the institution, not from your own address. The tenant
gives you a sending domain for this purpose. Then the email shows that it comes from the place where
the meeting occurred, and the email arrives. Tell the recipients where the recording is, and until
when it is there. Do not send anything to a person who is not in `recipients`. The owners decide if
other people get the notification, not the provider.

Only a signed-in moderator of a claimed room can start a job. Thus, the `recipients` field is
absent only when edumeet finds no address: a lookup failure on the edumeet side, or accounts without
an email address.

A meeting with breakout rooms can have a bot in the main room and a bot in each breakout room. Each
bot has its own jobs. Moderators start these jobs separately, and different moderators can start
them. Do these steps:

1. Group the jobs by `room.mainSessionId`.
2. Send one notice for the meeting to the union of the `recipients` of those jobs.
3. In the notice, put one link for each recording. Give each link the `sessionName` of its
   recording as the name. The recording of the main room has no `sessionName`.

The owners of the room are in each list. Thus, a moderator who started one of the recordings also
gets information about the other recordings of the same meeting.

The usual time to send the notice is when the last job of the main room ends. A breakout job can
need more time to finish. Thus, wait a short grace period. A meeting can also have only breakout
recordings. In that case, send the notice when the last of these recordings has had no activity for
that same time.

A meeting can record again after you sent its notice, while the room stays open. In that case, tell
the same people again when those jobs end. Send them to the same place. At that time, that place
has all the recordings of the meeting.

## The browser side

The provider opens `room.url` in a browser that it controls. The provider adds the bot access token
to the fragment:

```
<room.url>#botToken=<bot access token>
```

With a valid bot access token, the bot is verified. A verified bot does not need a meeting token,
also in a meetings-only room, and it does not go to the lobby of a locked room. A meeting token is
a different token: it proves that a participant was invited to a scheduled meeting. The bot can
only join a room that is open. In a meetings-only room, an invited participant with a valid meeting
token must be there first.

The page does the remaining steps:

- It joins the meeting.
- It shows the meeting and nothing else.
- It sends no media of its own.
- It reports its status as running every 20 seconds while it is in the meeting.

Thus, a browser that only opens the page and records needs no code for edumeet. Its jobs run, and
they end through the API.

**[BOTS.md](BOTS.md) gives the full description of the browser side**:

- what the page does
- how to set up the browser
- the `window.edumeetBot.status` function, which a bot can use to take control of the heartbeat or
  to end a single job
- the status attributes that tell the bot why it ended.

## The life of a bot

| Event that edumeet waits for | Maximum time | If the event does not occur |
| --- | --- | --- |
| The browser joins. | 60 s from the start of the first job of the bot, including the `POST`. After a restart: 60 s from the listing answer. | Its jobs fail. |
| The first `running` after the browser joined, or after a reload of a running bot. | 60 s | Its jobs fail. |
| The next `running`. | 90 s | Its jobs fail. |
| The browser leaves after its last job ended. | 30 s | edumeet removes the browser from the meeting. |
| The browser comes back after a disconnect. | 60 s | Its jobs fail. |

The page sends `running` automatically. Thus, the two heartbeat limits are important only for a
provider that has taken control of the heartbeat.

Each job of a bot shows the state of the bot. If edumeet starts a job on a bot that already runs,
the job shows as running immediately. Thus, start the new job type quickly.

If a browser loses its connection, its jobs do not end. The icons in the room change to show that
the jobs are interrupted. If the same browser comes back with the same `botId` in 60 seconds, the
jobs continue from where they were. A reload of the page counts as a return. A second browser for a
bot that already has a live browser does not count as a return. edumeet refuses the second browser
with `jobNotActive`.

If a job starts while its bot leaves (after the last job ended), the job gets a new bot with a new
`botId`.

A session runs a maximum of **one job of each job type**. A room runs a maximum of **10 jobs** at the
same time. This limit is for all providers, job types and sessions together.

## Survive a restart

When an edumeet server restarts, the jobs that run at their providers do not stop. Their browsers
lose the connection and try to connect again automatically.

Sometimes the page of a browser has a `botId`, and the room is not open yet. Then the browser does not
stop. It tries again every 3 seconds for 30 seconds, and it reports `roomNotOpen` only if the room
is still not open after that time. The reason: after a restart, it is possible that the browser
comes back before the first participant.

When a person is in the room, edumeet does these steps:

1. edumeet asks the provider which jobs that bot runs. It uses the listing call above.
2. edumeet lets the bot in.
3. edumeet takes back the jobs of the bot. edumeet does not send a second `POST`.

Thus, the provider must answer that call and keep the browser open.

Know these four limits:

- A browser stops its tries to connect again after approximately 95 seconds. Thus, an outage that is
  longer than that ends the jobs.
- A restarted server identifies a bot from the bot access token that the bot started with. Thus,
  edumeet cannot take back a bot if the provider row of the bot was deleted. The same is true when
  the row has no job types, no https API address or no API key that edumeet can send. Then the
  bot comes in as a bot without jobs: edumeet does not list its jobs and sends no delete for them.
- If a provider cannot answer the listing call, the provider loses the bot.
- After the restart, the main room has a new session. A job that starts after the restart has a
  different `room.mainSessionId` from the jobs that started before the restart. edumeet never sends those
  earlier jobs again. If a provider wants one notice across a restart, the provider must connect
  the two sessions itself: by the same `host` and `roomId`, close together in time.

Breakout rooms do not continue after a restart. edumeet refuses a bot of a breakout room with
`sessionNotOpen`. edumeet makes the listing call for that bot and sends a delete for each job in the
list.

If edumeet refuses a bot before it has the list of the jobs of the bot, the bot gets no delete. The
reason is that edumeet does not know these jobs any more. These bots get no delete:

- a bot whose room nobody comes back to in time (`roomNotOpen`)
- a bot that the bot policy or the check of its bot access token refuses (`botsNotAllowed`,
  `botTokenRejected`)
- a bot whose listing call failed (`jobNotActive`, or `sessionNotOpen` for a breakout bot).

End those jobs when the page tells you (see [BOTS.md](BOTS.md)), or at your own limit.

A room reads its providers one time, when the room opens. After the API key of a row changes,
continue to accept the old key. Accept it until all the rooms that opened before the change have
ended. Then accept it for approximately 20 minutes more, for the deletes that edumeet sends again.
If you do not accept the old key, you refuse the deletes of those rooms, and their jobs continue to
run. A job that starts in such a room also uses the old key. The listing call of such a job also
uses the old key.

## End-to-end encrypted meetings

A job can run in an end-to-end encrypted meeting. The bot takes part in the encryption like all
other participants. This means that the provider can read the meeting. Thus, when a moderator starts
a job in such a meeting, the confirmation dialog tells the moderator about this, and the moderator
must confirm.

## What a provider is expected to do

- Serve the API over https with a certificate that validates. Answer `POST /v1/jobs` quickly.
- Keep the API key secret. Do not accept a request without the API key.
- Keep the bot access token for the tenant that it was issued for. Connect from the addresses that
  are registered for that bot access token.
- Run one browser for each `botId`. For a `botId` that you do not know, open a browser. For a
  `botId` that you know, start or stop a job type in the browser that runs.
- Select one of these two methods for the heartbeat:
  - Let the page send the heartbeat, and close the browser when the recording stops working.
  - Take control of the heartbeat, and send `running` at least every 30 seconds. Make the heartbeat
    depend on the work.

  Where you can, report the end or the failure of a single job, with its job type.
- Set a maximum time for a bot to run. We recommend that you also monitor `data-edumeet-reason`, so
  that the bot finishes before the delete makes it finish (see [BOTS.md](BOTS.md)).
- Treat `DELETE` as a request to finish that job correctly, not to kill the process. Keep the bot
  for its other jobs. Answer a `DELETE` also for a job that you do not know any more.
- Answer `GET /v1/bots/<botId>` with the jobs that a bot runs. Answer it only for the host and room
  that you started the bot for.
- When the recording is ready, tell the `recipients` where it is. Tell only them. Send from an
  address of the institution. If the meeting had breakout rooms, send one notice for each meeting,
  grouped by `room.mainSessionId`.
- Do not tell the people in the meeting anything that edumeet has not told them. edumeet itself
  discloses the bot.

## Recording people

edumeet tells all the people in the meeting about a running job. But this disclosure is not consent.

The organisation that deploys edumeet is responsible under its own law for the recording or the
stream of a meeting, and for the storage of the result. This responsibility includes:

- the information that the participants get
- what the participants agreed to
- where the result is stored
- who can see the result
- how long the result is kept.

It is important that a provider can tell where the recordings are stored and how long they are
kept. The reason: the organisations that deploy the provider must answer for this.

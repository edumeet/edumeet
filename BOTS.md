# Writing a bot for edumeet

A **bot** is a browser that takes part in an edumeet meeting to record it, stream it or transcribe
it. It shows the meeting and nothing else, sends no audio or video of its own, and is not counted as
a participant. This document is for whoever builds that browser: what to open, how it gets in, what
the page does by itself and what is left to the bot.

A bot comes into a meeting in one of two ways:

- **Started by a provider.** A tenant has registered an outside service, a *provider*, and a
  moderator starts a recording, a stream or a transcription from the room. edumeet calls the
  provider's API with the address to open, and the provider opens it. The API side is described in
  [BOT-PROVIDER-API.md](BOT-PROVIDER-API.md); this document is the browser side of the same contract.
- **Started by hand.** Someone opens a bot address themselves, for example from a script or a
  scheduler, without any job behind it. See [A bot started by hand](#a-bot-started-by-hand).

In both cases the page does the edumeet work. The bot opens it, records what it shows, and closes
the browser when the bot is over.

## Opening the page

A bot opens the address of a room with `headless=1` in the query:

```
https://meet.example.org/lecture1?headless=1&displayName=Recorder#botToken=<bot access token>
```

A provider never builds this address: edumeet sends it ready to use as `room.url`, and the
provider only appends the token. The parameters are:

| Parameter | Where | Meaning |
| --- | --- | --- |
| `headless` | query | `1` or `true` turns the page into a bot page. Required. |
| `displayName` | query | The name everyone sees for the bot. Without it the bot is called "Bot". |
| `botToken` | fragment | The bot access token of the tenant. See [Getting in](#getting-in). |
| `botId` | query | The bot of a provider's jobs. Set by edumeet; never invent one. |
| `session` | query | A breakout room to join instead of the main room. |
| `botType` | query | `recorder`, `transcriber` or `streamer`, for information. `transcriber` also makes the page receive audio only; edumeet sends it only to a provider that does transcription and nothing else. |
| `meetingToken` | query | A meeting token, for a meetings-only room, as for any participant. |

The token goes in the fragment, after `#`, because a browser never sends the fragment to a server,
so the token appears in no access log. The page reads it and removes it from its address at once.

`botId` is what makes a page a provider's bot: a page with one runs jobs, reports on them and
retries when the room is not open yet, as described below. A page without one is a bot started by
hand.

## Getting in

### The tenant's bot policy

Each tenant decides in the management interface who may join as a bot:

| Policy | A bot with a valid token | A bot without a token |
| --- | --- | --- |
| Disabled (the default) | refused, `botsNotAllowed` | refused, `botsNotAllowed` |
| Only bots with an access token | joins, verified | refused, `botsNotAllowed` |
| All bots | joins, verified | joins, not verified |

A token is valid when it was issued by that tenant, is not disabled, and the bot connects from one
of the IP addresses or ranges registered with it. A token that does not pass is refused with
`botTokenRejected`, rather than letting the bot in as one without a token; the edumeet server log
says which of the three checks failed. A deployment without a management server has no tenants,
and its bots need no token.

A **verified** bot skips the lobby of a locked room and needs no meeting token in a meetings-only
room. A bot that is not verified is treated like a guest: in a locked room it waits in the lobby
(`data-edumeet-state` is `lobby`) until a moderator admits it, and in a meetings-only room it needs
`meetingToken`. A provider's bot always carries the token, so it is always verified.

### The room has to be open

A bot never opens a room. Until at least one participant is in it, the bot is refused with
`roomNotOpen`.

A page with a `botId` does not give up at once: it tries again quietly every 3 seconds for 30
seconds, and writes `roomNotOpen` only if the room is still not open by then. This covers an
edumeet server that restarted under a running bot, where the bot may well be back before the first
participant is. A page without a `botId` is refused at once, and the bot has to try again later by
opening the page again.

### Breakout rooms

A bot is in one session. Without `session` it is in the main room. With
`session=<breakout session id>` it is placed in that breakout room, even if it is still empty, and
it stays there: when the breakout room is closed, the bot ends with `sessionClosed` rather than
following the participants back to the main room. A breakout room that does not exist refuses it
with `sessionNotOpen`. To record the main room and its breakout rooms at the same time, run one bot
per session; a provider is sent a separate job, with its own `room.url`, for each.

## What the page does by itself

- It joins on its own. There is no join dialog, no device preview and no lobby dialog, and the
  browser is never asked for a camera or a microphone.
- It shows the meeting and nothing else. The top bar keeps the logo and the timers; buttons, the
  control bar, dialogs, pop-up notifications and notification sounds are gone, so none of them end
  up in the recording. Names stay on the tiles.
- It lays the meeting out for a recording: no self view, a tile for every participant, including
  those without video, and nothing hidden.
- It sends no audio or video, and it is hidden from the participant list and the participant count.
  It cannot chat, share, draw, raise a hand or vote.
- It receives every participant's audio and video. A page opened with `botType=transcriber` receives
  audio only, which keeps such a browser light enough to run many at once.
- A meeting with a bot in it always goes through a media node, however few people are in it, so what
  the bot receives does not change as people arrive and leave.
- It takes part in end-to-end encryption like any participant, so it can record an encrypted
  meeting. A moderator starting a job in such a meeting is told that the provider will be able to
  see and hear it.
- **It reports itself as running.** A page with a `botId` tells edumeet every 20 seconds that its
  bot is running, for as long as it is in the meeting. That is the heartbeat edumeet expects, so a
  bot that only records needs no code for edumeet.
- It reconnects by itself after a lost connection, for about 95 seconds. Coming back within 60
  seconds keeps the bot's jobs; reloading the page counts as coming back.
- Outside the meeting (connecting, in the lobby, refused, removed, after the meeting ended) it shows
  only the background, and it never reloads or rejoins by itself.
- Where the deployment collects client monitoring statistics, it sends its own, marked as a bot's,
  so the operator can see what the bot received.

Everyone in the meeting sees that a bot is there, from an icon in the top bar with the bots' names,
and a running recording, stream or transcription has its own icon. The bot needs to announce
nothing.

## What the bot has to do

For a provider's bot, the least is:

1. Open the page.
2. Record, stream or transcribe what it shows and plays.
3. Finish properly when edumeet sends a delete for the bot's last job, and close the browser.
4. Close the browser when the recording dies, so that the page leaves the meeting. edumeet notices
   in about a minute and ends the jobs.
5. Not run longer than a limit of its own, in case the edumeet server stops and never comes back.

Everything else is optional: it lets a bot say more, or finish sooner.

### Saying more: `window.edumeetBot.status`

A page with a `botId` provides one function:

```js
window.edumeetBot.status('running');                           // the bot's heartbeat
window.edumeetBot.status('finished', undefined, 'streamer');   // this job is done
window.edumeetBot.status('failed', 'ingest down', 'streamer'); // this job gave up
window.edumeetBot.status('finished');                          // every job is done, about to leave
window.edumeetBot.status('failed', 'disk full');               // the bot gave up altogether
```

It returns `true` when the status was sent, and `false` when nothing was sent: the page is not in
the meeting yet or any more, the state is not one of these three, or the kind is not a kind of job.

**Calling `running` takes the heartbeat over.** From the first call on, the page stops sending its
own for the rest of its life, and the bot has to send `running` at least every 30 seconds for as
long as it is healthy. edumeet ends its jobs when none arrives for 90 seconds. That is worth doing
when the bot can tie it to the work, for example to the encoder still producing output: the page's
own heartbeat only says that the page is in the meeting, while the bot's lets edumeet notice a
recorder that has hung behind a page that is still connected. A bot that cannot tie it to the work
should not call it.

`finished` and `failed` take a third argument, the kind of job they are about. With it, only that
job ends and the bot goes on with the others; a `finished` job is then not sent a delete, a
`failed` one is. Without it, they are about the whole bot and every
job it runs. A kind the bot is not running is ignored, and a third argument that is not a kind of
job sends nothing at all, so a typo cannot end every job.

The reason given with `failed` is shown to the moderators and written to the edumeet server log. It
should be short and say something useful to a moderator, and it is cut off after 200 characters.

### Watching the page

Every edumeet page writes its state on the `<html>` element:

| Attribute | Values |
| --- | --- |
| `data-edumeet-state` | `new`, `lobby`, `joined` or `left` |
| `data-edumeet-connection` | `new`, `connecting`, `connected`, `reconnecting` or `disconnected` |
| `data-edumeet-reason` | absent until the page has stopped, then why |

The attributes only ever hold the codes listed here, never names, ids or tokens, so a bot can
read them from outside the page, for example with the DevTools protocol, without reading anything
of the meeting.

**When `data-edumeet-reason` appears, the page is over**, whatever the reason: it will not rejoin.
So is the bot, except for a `jobNotActive` given because another browser already runs this `botId`,
where only this browser is. While edumeet knows the bot's jobs, it sends a delete for every end it
decides on, first sent at most a minute or so later, and watching the reason only lets the bot
finish sooner. It does not know them for a bot refused after a restart of the edumeet server before
its provider listed its jobs (`roomNotOpen`, `botsNotAllowed`, `botTokenRejected`, or `jobNotActive`
and `sessionNotOpen` when the listing call failed), nor for one started by hand: for those, this is
the way to know it is over.

| Reason | What happened |
| --- | --- |
| `kicked` | A moderator removed the bot, or edumeet ended a bot that did not leave after its last job. |
| `meetingEnded` | The meeting was ended for everyone. |
| `connectionClosed` | The connection was lost and did not come back. |
| `sessionClosed` | The breakout room the bot was in was closed. |
| `jobNotActive` | The bot has no jobs left, another browser already runs this `botId`, or after an edumeet server restart the provider did not confirm the bot's jobs. |
| `roomNotOpen` | Nobody was in the room. |
| `botsNotAllowed` | The tenant admits no bots, or none without a token. |
| `botTokenRejected` | The token, its state or the bot's address did not pass. |
| `sessionNotOpen` | The breakout room in `session` does not exist. |
| `meetingTokenRequired`, `meetingTokenInvalid` | A meetings-only room, and no valid `meetingToken`. |
| `e2eeUnsupported`, `e2eeFailed` | The browser cannot take part in the meeting's end-to-end encryption, or it failed. |
| `joinErrorPending` | An earlier join error is still stored in this tab, so the page did not join. Open the page in a new tab. |

## Setting up the browser

- **Allow autoplay.** The page plays the meeting's audio without a click, and there is nobody to
  click. In Chromium, start the browser with `--autoplay-policy=no-user-gesture-required`.
- **Give it the size of the recording.** The page lays the meeting out to the window, so the window
  size is the size of the picture.
- **No permissions are needed.** The page never asks for a camera, a microphone or a screen.
- **A fresh profile per bot** is simplest. The page keeps its layout settings in the profile, and a
  profile shared with a person's browsing would change their layout; opening any page with
  `headless=0` in that profile puts the layout back.
- **Use a browser edumeet supports for its meetings**, a current Chromium being the usual choice.
  An end-to-end encrypted meeting also needs a browser that supports encoded transforms.
- **One browser per `botId`.** A second browser for a bot that already has a live one is refused
  with `jobNotActive`.

## A bot started by hand

A bot address without a `botId` works as well, for a recorder that someone starts themselves:

```
https://meet.example.org/lecture1?headless=1&displayName=Recorder#botToken=<bot access token>
```

The token is one the tenant administrator created under **Bot providers** for that use, with the
addresses the bot connects from; a tenant whose policy admits all bots needs none, see
[Getting in](#getting-in).

Such a bot has no jobs. Nothing is shown in the room beyond the bot icon, there is no recording
icon, no moderator can stop it other than by removing it, and nobody is told anything when it is
done. The page sends no heartbeat, has no `window.edumeetBot`, and does not retry while the room is
not open. The bot decides itself when to stop, and watches `data-edumeet-reason` to learn that the
meeting is over for it.

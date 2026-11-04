# Writing a bot for edumeet

A **bot** is a browser that joins an edumeet meeting to record, stream or transcribe the meeting,
together with the software that controls that browser. In the browser, the bot opens an edumeet
*page*. The page shows the meeting and nothing else. It sends no audio or video of its own. edumeet does not
count the bot as a participant. This document is for the developer who builds that browser. It
tells you which page to open, how the bot gets in, what the page does automatically and what the
bot must do.

A bot comes into a meeting in one of two ways:

- **Started by a provider.** A tenant registers an external service, a *provider*. A moderator
  starts a recording, a stream or a transcription from the room. Then edumeet calls the API of the
  provider with the address to open, and the provider opens that address.
  [BOT-PROVIDER-API.md](BOT-PROVIDER-API.md) describes the API side. This document describes the
  browser side of the same contract.
- **Started by hand.** A person opens a bot address directly, for example from a script or a
  scheduler. No job is related to this bot. See [A bot started by hand](#a-bot-started-by-hand).

In both cases, the page does the edumeet work. The software of the bot opens the page and records
what the page shows. When the bot ends, its software closes the browser.

## Open the page

The bot opens the address of a room with `headless=1` in the query:

```
https://meet.example.org/lecture1?headless=1&displayName=Recorder#botToken=<bot access token>
```

This example is the address of a bot started by hand. A provider never builds the address of its
bot. edumeet sends that address ready to use as `room.url`, with `botId` and the other parameters
in it. The provider only adds the bot access token at the end. These are the parameters:

| Parameter | Where | Meaning |
| --- | --- | --- |
| `headless` | query | `1` or `true` changes the page into a bot page. Required. |
| `displayName` | query | The name that everyone sees for the bot. Without this parameter, the name of the bot is "Bot". |
| `botToken` | fragment | The bot access token of the tenant. See [How a bot gets in](#how-a-bot-gets-in). |
| `botId` | query | The bot that runs the jobs of a provider. edumeet sets this value. Never make up a value. |
| `session` | query | A breakout room that the bot joins instead of the main room. |
| `botType` | query | `recorder`, `transcriber` or `streamer`. edumeet adds it to `room.url` only when the provider row offers exactly one job type. With `transcriber`, the page receives only audio. If the provider row of the bot access token has job types, and `botType` is not one of them, edumeet refuses the bot with `botTokenRejected`. |
| `meetingToken` | query | The meeting token of a scheduled meeting, for a meetings-only room. It is the same meeting token that the invited participants use. A verified bot does not need it. |

The bot access token goes in the fragment, after `#`. A browser never sends the fragment to a
server, so the bot access token is not in an access log. The page reads the bot access token and
immediately removes it from the page address.

The two tokens are different, and one cannot replace the other:

| Token | What it proves | Who makes it |
| --- | --- | --- |
| Bot access token (`botToken`) | The bot belongs to the tenant, and it connects from an allowed address. | The tenant administrator, under **Bot providers**. |
| Meeting token (`meetingToken`) | The participant was invited to a scheduled meeting of the room. Only a meetings-only room asks for it. | edumeet, for each scheduled meeting. The invitation link contains it. |

The `botId` makes a page the bot of a provider. A page with a `botId` runs jobs and reports on them.
It also tries again when the room is not open yet. The sections below describe this behavior. A
page without a `botId` is a bot started by hand.

## How a bot gets in

### The bot policy of the tenant

In the management interface, each tenant sets who can join as a bot:

| Policy | A bot with a valid bot access token | A bot without a bot access token |
| --- | --- | --- |
| Disabled (the default) | refused, `botsNotAllowed` | refused, `botsNotAllowed` |
| Only bots with an access token | joins, verified | refused, `botsNotAllowed` |
| All bots | joins, verified | joins, not verified |

A bot access token is valid when all three of these conditions are true:

- That tenant issued the bot access token.
- The bot access token is not disabled.
- The bot connects from one of the IP addresses or ranges that are registered with the bot access
  token.

edumeet checks the policy first. With the policy "Disabled", edumeet refuses every bot with
`botsNotAllowed`, also a bot with a bot access token. With the other two policies, edumeet refuses
a bot access token that does not pass the checks with `botTokenRejected`. edumeet does not let the
bot in as a bot without a bot access token.

The edumeet server log shows the reason and the address of the bot. The log does not show which of
the three checks failed, and the answer to the bot does not show it either.

A deployment without a management server, or a room that belongs to no tenant, does not check bots.
Its bots do not need a bot access token, and they are not verified.

A **verified** bot does not go to the lobby of a locked room. It also does not need a meeting token
in a meetings-only room. edumeet treats a bot that is not verified as a guest:

- In a locked room, the bot waits in the lobby (`data-edumeet-state` is `lobby`) until a moderator
  admits it.
- In a meetings-only room, the bot needs `meetingToken`, the meeting token of the meeting in the
  room. The first participant with a valid meeting token connects the room to that meeting. Until
  the room is empty again, all other participants and bots that are not verified must give the same
  meeting token.

The bot of a provider always has the bot access token, so it is always verified. Thus it never
needs a meeting token. But it can only join a room that is open. In a meetings-only room, an invited
participant with a valid meeting token must be there first.

### The room must be open

A bot never opens a room. Until at least one participant is in the room, edumeet refuses the bot
with `roomNotOpen`.

edumeet refuses every bot immediately. A page with a `botId` does not stop at this refusal. It
tries again silently every 3 seconds for 30 seconds. It writes `roomNotOpen` only if the room is
still not open after that time. This behavior is for the case where the edumeet server restarts
while a bot runs. In that case, the bot can come back before the first participant comes back. A
page without a `botId` stops at the first refusal. To try again, the bot must open the page again
later.

### Breakout rooms

A bot is in one session. Without `session`, the bot is in the main room. With
`session=<breakout session id>`, edumeet puts the bot in that breakout room, also when the breakout
room is still empty. The bot stays in that breakout room. When the breakout room closes, or a
moderator empties it, the bot ends with `sessionClosed`. The bot does not follow the participants back to the main room.

If the breakout room does not exist, edumeet refuses the bot with `sessionNotOpen`. To record the
main room and its breakout rooms at the same time, run one bot for each session. edumeet sends a
provider a separate job for each session, with its own `room.url`.

## What the page does by itself

- The page joins automatically. There is no join dialog, no device preview and no lobby dialog. The
  page never asks the browser for a camera or a microphone.
- The page shows the meeting and nothing else. The top bar keeps the logo and the timers. The page
  removes the buttons, the control bar, dialogs, pop-up notifications and notification sounds. Thus
  the recording does not include them. The names stay on the tiles.
- The page sets the meeting layout for a recording. There is no self view, and nothing is hidden.
  Each participant has a tile, also a participant without video.
- The page sends no audio or video. The participant list and the participant count do not show the
  bot. The bot cannot chat, share, draw, raise a hand or vote.
- The page receives the audio and video of all participants. A page opened with
  `botType=transcriber` receives only audio. Thus such a browser uses few resources, and you can run
  many of these browsers at the same time.
- A meeting with a bot in it always uses a media node, also when only a few people are in it.
  Thus, what the bot receives does not change when people arrive and leave.
- The page takes part in end-to-end encryption like all participants, so the bot can record an
  encrypted meeting. When a moderator starts a job in such a meeting, the confirmation dialog
  tells the moderator that the provider can see and hear the meeting.
- **The page reports that the bot is running.** While the bot is in the meeting, a page with a
  `botId` tells edumeet every 20 seconds that its bot is running. edumeet expects this heartbeat.
  Thus a bot that only records does not need code for edumeet.
- After a lost connection, the page reconnects automatically for approximately 95 seconds. If the
  bot comes back in 60 seconds or less, the bot keeps its jobs. A page reload counts as a return.
- Outside the meeting, the page shows only the background. This is true while the page connects,
  in the lobby, after a refusal, after a removal and after the meeting ended. The page does not
  reload or join again automatically. The only exception is an internal error of the page: then
  the page leaves with the reason `left`, reloads after 5 seconds and joins again.
- If the deployment collects client monitoring statistics, the page sends its own statistics. The
  page marks them as statistics of a bot. Thus the operator can see what the bot received.

Everyone in the meeting sees that a bot is there. An icon in the top bar shows this, with the names
of the bots. A running recording, stream or transcription has its own icon. The bot does not have
to announce anything.

## What the bot must do

The bot of a provider must do at least these steps:

1. Open the page.
2. Record, stream or transcribe what the page shows and plays.
3. When edumeet sends a delete for the last job of the bot, finish correctly and close the browser.
   edumeet waits 30 seconds after the last job of the bot ends. Then edumeet removes the page from
   the meeting (reason `kicked`). Thus the bot must not need the page to finish its work.
4. When the recording stops because of a failure, close the browser. Then the page leaves the
   meeting. edumeet detects this in approximately one minute and ends the jobs.
5. Set a maximum run time of its own, and do not run longer. This limit is for the case where the
   edumeet server stops and does not come back.

All other steps are optional. They let a bot give more information or finish sooner.

### More status: `window.edumeetBot.status`

A page with a `botId` gives one function:

```js
window.edumeetBot.status('running');                           // the bot's heartbeat
window.edumeetBot.status('finished', undefined, 'streamer');   // this job is done
window.edumeetBot.status('failed', 'ingest down', 'streamer'); // this job gave up
window.edumeetBot.status('finished');                          // every job is done, about to leave
window.edumeetBot.status('failed', 'disk full');               // the bot gave up altogether
```

The function returns `true` when it sent the status. It returns `false` when it sent nothing. This
occurs in these cases:

- The page is not in the meeting yet, or it is not in the meeting any more.
- The state is not one of these three.
- The third argument is not a job type.

**A call with `running` replaces the heartbeat of the page.** After the first call, the page stops
its own heartbeat for the rest of its life. Then the bot must send `running` at least every 30
seconds while the bot is healthy. If no `running` arrives for 90 seconds, edumeet ends the jobs of
the bot.

This is useful when the bot can connect the heartbeat to the work. An example is an encoder that
still produces output. The heartbeat of the page only tells that the page is in the meeting. The
heartbeat of the bot lets edumeet detect a recorder that stopped working while its page is still
connected. If the bot cannot connect the heartbeat to the work, do not call `running`.

`finished` and `failed` take a third argument: the job type that the status is about. With this
argument, only that job ends, and the bot continues with its other jobs. In this case, edumeet does
not send a delete for a `finished` job, but it sends a delete for a `failed` job. Without the third
argument, the status is about the full bot and all the jobs that it runs.

If the bot does not run a job of that job type, the call has no effect. If the third argument is
not a job type, the page sends nothing. Thus a typing error cannot end all jobs.

edumeet shows the reason that you give with `failed` to the moderators. edumeet also writes it to the
edumeet server log. Keep the reason short, and make it useful to a moderator. A reason longer than
200 characters is cut at 200 characters.

### Watch the page

Each edumeet page writes its state on the `<html>` element:

| Attribute | Values |
| --- | --- |
| `data-edumeet-state` | `new`, `lobby`, `joined` or `left` |
| `data-edumeet-connection` | `new`, `connecting`, `connected`, `reconnecting` or `disconnected` |
| `data-edumeet-reason` | Not present until the page stops. Then it gives the reason why the page stopped. |

The attributes contain only the codes in this section. They never contain names, ids or tokens.
Thus a bot can read them from outside the page, for example with the DevTools protocol. The bot then
reads nothing of the meeting.

**When `data-edumeet-reason` appears, the page has ended.** The page does not join again, with one
exception: after an internal error, the reason is `left`, and the page reloads after 5 seconds. The
bot has also ended, with one exception. If the reason is `jobNotActive` because another browser
already runs this `botId`, only this browser has ended.

While edumeet knows the jobs of the bot, it sends a delete for each end that it decides. edumeet
sends the first delete not more than approximately one minute after it decides the end. Thus, the only advantage of
watching the reason is that the bot can finish sooner. edumeet does not know the jobs in these cases:

- edumeet refused the bot after a restart of the edumeet server, before the provider listed its
  jobs. The reasons are `roomNotOpen`, `botsNotAllowed`, `botTokenRejected`, or `jobNotActive` and
  `sessionNotOpen` when the listing call failed.
- A person started the bot by hand.

For these bots, the reason is the way to know that the bot has ended.

| Reason | What happened |
| --- | --- |
| `kicked` | A moderator removed the bot. Or edumeet ended a bot that did not leave after its last job. |
| `meetingEnded` | The meeting ended for everyone. |
| `connectionClosed` | The page lost the connection, and the connection did not come back. Or the room closed because the last participant left. |
| `sessionClosed` | The breakout room of the bot closed, or a moderator emptied it. |
| `jobNotActive` | The bot has no jobs left. Or another browser already runs this `botId`. Or after an edumeet server restart, the provider did not confirm the jobs of the bot. |
| `roomNotOpen` | No participant was in the room. |
| `botsNotAllowed` | The policy of the tenant admits no bots, or it admits no bots without a bot access token. Or the edumeet server could not reach the management server. |
| `botTokenRejected` | The bot access token, the state of the bot access token or the address of the bot did not pass the checks. Or `botType` is a job type that the provider row of the bot access token does not offer. |
| `sessionNotOpen` | The breakout room in `session` does not exist. |
| `meetingTokenRequired`, `meetingTokenInvalid` | The room is a meetings-only room, the bot is not verified, and it has no valid `meetingToken`. |
| `e2eeUnsupported`, `e2eeFailed` | The browser cannot take part in the end-to-end encryption of the meeting, or the encryption failed. |
| `joinErrorPending` | This tab still stores an earlier join error, so the page did not join. Open the page in a new tab. |
| `left` | The page left the meeting for no other reason. An internal error of the page also gives this reason. After such an error, the page reloads after 5 seconds and joins again. |

## Browser setup

- **Allow autoplay.** The page plays the audio of the meeting without a click, and nobody is there
  to click. In Chromium, start the browser with `--autoplay-policy=no-user-gesture-required`.
- **Set the window to the size of the recording.** The page fits the meeting layout to the window.
  Thus the window size is the size of the picture.
- **The page needs no permissions.** The page never asks for a camera, a microphone or a screen.
- **Use a new profile for each bot.** This is the simplest solution. The page keeps its layout
  settings in the profile. If a person also uses that profile for browsing, the bot changes the
  layout of that person. To reset the layout, open any page with `headless=0` in that profile.
- **Use a browser that edumeet supports for its meetings.** Usually, this is a current Chromium. An
  end-to-end encrypted meeting also needs `RTCRtpScriptTransform` (WebRTC Encoded Transform):
  - Chrome and Chromium 141 or later
  - Firefox 117 or later
  - Safari 15.4 or later

  An older browser, for example Chrome 139, does not join such a meeting. The page stops before it
  joins, with the reason `e2eeUnsupported`. edumeet sees only that the bot did not arrive. Thus
  edumeet fails the jobs of the bot with `joinTimeout`, one minute after the first job of the bot
  started. Before you record encrypted
  meetings, check the browser version.
- **Use one browser for each `botId`.** If a bot already has a live browser, edumeet refuses a
  second browser for that bot with `jobNotActive`.

## A bot started by hand

A bot address without a `botId` also works. Use it for a recorder that a person starts directly:

```
https://meet.example.org/lecture1?headless=1&displayName=Recorder#botToken=<bot access token>
```

The tenant administrator creates the bot access token for this use under **Bot providers**, with
the addresses that the bot connects from. A tenant with a policy that admits all bots does not need
a bot access token, but such a bot is not verified. See
[How a bot gets in](#how-a-bot-gets-in).

This bot has no jobs. For this bot:

- The room shows only the bot icon. There is no recording icon.
- A moderator can stop the bot only when the moderator removes it.
- When the bot is done, nobody gets a message.
- The page sends no heartbeat and has no `window.edumeetBot`.
- The page does not try again while the room is not open.

The bot decides when to stop. It watches `data-edumeet-reason` to know that the meeting is over for
it.

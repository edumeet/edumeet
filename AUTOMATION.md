# Automating the eduMEET page

Some programs control the eduMEET page in a browser, for example a room connector that joins a
meeting for a hardware room system. This document is for whoever writes such a program. It lists
the attributes that the page gives for this purpose.

The labels and texts of the page change between releases and are translated into many languages.
Do not use them to find a control. Use the attributes in this document. They do not change with the
language, and eduMEET keeps them when a control is redesigned.

## Controls

The page marks each control that a program can use with a `data-edumeet-control` attribute:

| Value | Element | Where |
| --- | --- | --- |
| `name` | Text input for the display name | Join dialog |
| `meeting-token` | Text input for the meeting token | Join dialog, when the room requires a meeting token |
| `join` | Join button | Join dialog |
| `mic` | Microphone button | Join dialog and control bar |
| `webcam` | Camera button | Join dialog and control bar |
| `screenshare` | Screen sharing button | Control bar |
| `raisehand` | Raise hand button | Control bar |
| `reactions` | Button that opens the reactions menu | Control bar, when reactions are enabled in the room |
| `participants` | Button that shows or hides the participant list | Control bar |
| `chat` | Button that shows or hides the chat | Control bar |
| `leave` | Leave button | Top bar |
| `leave-confirm` | Button that confirms the leave | Leave dialog |
| `leave-cancel` | Button that closes the leave dialog and stays in the meeting | Leave dialog |
| `chat-input` | Text input for a chat message | Chat |
| `chat-send` | Button that sends the chat message | Chat |

A control can be on the page more than once, or not at all. For example, `chat` is not there when
the chat is disabled in the room. `meeting-token` is there only when the room asks for a token.
Always check that the control exists before you use it.

The join dialog and the control bar use the same values: `mic` is the microphone button before and
after the join.

## State

The buttons `mic`, `webcam`, `screenshare`, `raisehand`, `participants` and `chat` also have
`data-edumeet-on`:

| Value | Meaning |
| --- | --- |
| `true` | The microphone or the camera sends, the screen is shared, the hand is raised, or the list or the chat is open. |
| `false` | It is not. |

These buttons toggle. Read `data-edumeet-on` before you click, and click only when the state must
change.

The `participants` button also has `data-edumeet-count`, the number of participants in the meeting,
including the person on the page.

## Reactions

To send a reaction, click `reactions`, and then click the item of the reaction in the menu. Each item
has `data-edumeet-reaction` with one of these values: `thumbup`, `clap`, `party`, `laugh`. The menu
closes after the click.

## Videos

Each video element of a participant has `data-edumeet-video` with the source of the video:

| Value | Video |
| --- | --- |
| `webcam` | Camera |
| `screen` | Shared screen |
| `extravideo` | Additional video |

The video of the camera preview in the join dialog has no `data-edumeet-video`.

## State of the page

The page writes its state on the `<html>` element: `data-edumeet-state`, `data-edumeet-connection`
and `data-edumeet-reason`. [BOTS.md](BOTS.md) describes them. Use `data-edumeet-state` to know when
the page is in the meeting (`joined`) and when it has left (`left`).

## Text inputs

To enter text in `name`, `meeting-token` or `chat-input`, set the value as a user does. Use the
native value setter of the element, and then send an `input` event. The page does not see a value
that is only assigned to the `value` property.

# APP STATE

```js
{
  room :
  {
    url               : 'https://example.io/?&roomId=d0el8y34',
    state             : 'connected', // new/connecting/connected/closed
    activeSpeakerName : 'alice'
  },
  me :
  {
    name                 : 'bob',
    displayName          : 'Bob McFLower',
    displayNameSet       : false, // true if got from cookie or manually set.
    device               : { flag: 'firefox', name: 'Firefox', version: '61' },
    canSendMic           : true,
    canSendWebcam        : true,
    canChangeWebcam      : false,
    webcamInProgress     : false,
    audioOnly            : false,
    audioOnlyInProgress  : false,
    restartIceInProgress : false
  },
  producers :
  {
    1111 :
    {
      id             : 1111,
      source         : 'mic', // mic/webcam,
      locallyPaused  : true,
      remotelyPaused : false,
      track          : MediaStreamTrack,
      codec          : 'opus'
    },
    1112 :
    {
      id             : 1112,
      source         : 'webcam', // mic/webcam
      deviceLabel    : 'Macbook Webcam',
      type           : 'front', // front/back
      locallyPaused  : false,
      remotelyPaused : false,
      track          : MediaStreamTrack,
      codec          : 'vp8',
    }
  },
  peers :
  {
    'alice' :
    {
      name        : 'alice',
      displayName : 'Alice Thomsom',
      device      : { flag: 'chrome', name: 'Chrome', version: '58' },
      consumers   : [ 5551, 5552 ]
    }
  },
  consumers :
  {
    5551 :
    {
      id             : 5551,
      peerName       : 'alice',
      source         : 'mic', // mic/webcam
      supported      : true,
      locallyPaused  : false,
      remotelyPaused : false,
      profile        : 'default',
      track          : MediaStreamTrack,
      codec          : 'opus'
    },
    5552 :
    {
      id             : 5552,
      peerName       : 'alice',
      source         : 'webcam',
      supported      : false,
      locallyPaused  : false,
      remotelyPaused : true,
      profile        : 'medium',
      track          : null,
      codec          : 'h264'
    }
  },
  notifications :
  [
    {
      id     : 'qweasdw43we',
      type   : 'info' // info/error
      text   : 'You joined the room'
    },
    {
      id     : 'j7sdhkjjkcc',
      type   : 'error'
      text   : 'Could not add webcam'
    }
  ]
}
```

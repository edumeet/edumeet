# Changelog

## 3.4.0

### Added

* Multiparty meeting renamed to edumeet
* Merged room selector- and join- dialog - default keyboard focus on login field
* Localization selectable
* Added aspect ratio 16 : 9  and this is default now, ref #439
* New worker load calculation so router selection is based on that and not random anymore
* New permissions and roles:
  * Propagate userRoles to client state, ref #437
  * Extend userRoles and use the new audio, video permissions, ref #437
  * New permission to modify peer roles
  * Create room actions for giving and taking roles
  * Add functions to client for modifying roles live
  * Ability to give roles to users
  * Add new permission to config
* Add room to userMapping. Example of giving moderator if there is no authenticated user
* Promote all peers from lobby when a peer joins with the PROMOTE_PEER permission and activateOnHostJoin is true in config
* Make menus more intuitive on mobile
* Simplify electron screenshare check
* Logo support
* Improve autoMute mic-indicators, Improve audio level scaling
* Clean up participant list
* Add indicator for peers in focus. Ref #360
* TCP enabled by default, prefer UDP
* Ability for Prometheus exporter to listen on localhost
* Make list headers bolder
* Trim displayName inputs. Add random number to Guest displayName.
* Removed facingMode from mobile
* Documentation for prometheus exporter
* Added switching of own video mirror in settings
* Added hiding of own videos
* Request audio and webcam permission at once, when user is requesting media
* Add initial support for local and saml auth
  * Local login form
  * Add bcrypt encrypted passwords for local strategy
  * Add displayName mapping to usermapping
  * Add saml attriute mappings
* Use shared cookieparser for web and websocket
* Update TopBar leave button
* Add joinAudio capability
* Standardize Auth button

### Migration

from last master version:
* Copy paste defaultAudio and centralAudioOtions from config.example.js to config.js 
* Copy paste whole theme from config.example.js to config
* Configure logo in config.js

### Upgrade depencies

* webtorrent from 0.107.17 to 0.108.1 …
* Upgrade React-scripts

### Languages

* Updates translations: hu, tr, no, pl, uk
* Addad translations: Hindi (hi), Russian (ru), Kazakh (ka)

### Bugfixes

* Hopefully fix to silent peer issue, ref #256
* Set timeout for TURN API request, fixes #484
* Possible fix for #582 Crackling sound
* Fix for #444 Settings persistence
* Fix Audio settings from config.js take no effect
* Fix only firefox handles applyConstraints to audio tracks correctly
* Fix (autoMuted) mic too big click area
* Fix userRoles check
* Fix spoltights ignoring maxLastN
* Fix wrong config parameter naming (voiceActivatedUnmute)
* Fix locale checking state
* Fix express error handler
* Add constraint for user facing camera. Update media devices properly
* Cleanup on close
* Fixed null values for peers not yet assigned to a router
* Fix URL sanitizer bug
* Removed audio request modification
* Fix race in spotlights
* Fix piping bug when peers returning to router
* Fix piped router count
* Add comma to prometheus config code
* Removed code that is problematic and also unused
* Remove duplicated callbackURL
* Fix moderator buttons layout
* Fix: Special chars are not sanitized in URL
* Fix another roomId bug
* Tidy: replace obj.entries with obj.values to avoid unused key
* Fix close room link

## 3.3

* Add: Rooms now scale across cores
* Add: Permissions and roles. Users can now have different roles (moderator, admin etc.) that give different permissions.
* Add: TURN API or fallback TURN server
* Add: Configurable room size limit
* Add: Prometheus monitoring support
* Add: Possible to share several videos (ex: 2 webcams)
* Add: Configurable audio settings (echocancellation etc.)
* Add: Configurable audio output device (in supported browsers)
* Add: Audio auto mute/unmute based on volume
* Add: Handle unsupported browsers properly
* Add: Lots of appearance settings
* Add: Side drawer can now stay permanently open
* Add: Move control buttons to separate control bar
* Add: Can now "raise hand"
* Add: Screen sharing in Safari 13+, Opera and Edge
* Add: Extended advanced info about network in client
* Add: Configurable screen sharing frame rate
* Add: Help and About dialogs
* Add: More keyboard shortcuts
* Add: Quality indicator on videos
* Add: More translations
* Fix: Various UI fixes and improvements
* Fix: Better audio/video device handling
* Fix: Update keyboard shortcut handling
* Fix: Authentication for load balanced scenarios
* Fix: Signaling when entering lobby
* Fix: Signaling timeouts and retries
* Fix: Filesharing fixes (sharing same file twice, etc.)
* Fix: Better handling of hark
* Fix: Use applyContraints instead of restarting producers
* Fix: Now handles reconnects properly if client loses connection
* Fix: Rotating devices don't show rotated videos
* Fix: Various fixes to client authentication

## 3.2.1

* Fix: permananent top bar by default
* Fix: `httpOnly` mode https redirect
* Add some extra checks for video stream and track
* Add Italian translation
* Add Czech translation
* Add new server option `trustProxy` for load balancing http only use case
* Add HAproxy load balance example
* Add LTI LMS integration documentation
* Fix spacing of leave button
* Fix for sharing same file multiple times

## 3.2

* Add munin plugin
* Add `muted=true` search param to disable audio by default
* Modify webtorrent tracker
* Add key shortcut `space` for audio mute
* Add key shortcut `v` for video mute
* Add user configurable LastN
* Add option to permananent top bar (permanent by default)
* Update mediasoup server
* Add `simulcast` options to app config (disabled by default)
* Add `stats` option to get counts of rooms and peers
* Add `httpOnly` option for loadbalancer backend setups
* LTI integration for LMS systems like moodle
* Add translations (12+1 languages)
* Add support IPv6
* Many other fixes and refactorings

## 3.1

* Browser session storage
* Virtual lobby for rooms
* Allow minimum TLSv1.2 and recommended ciphers
* Code splitting for faster load times
* Various GUI fixes
* Internationalization support
* Can require sign in for access

## 3.0

* Updated to mediasoup v3
* Replace lib "passport-datporten" with "openid-client" (a general OIDC certified client)
  * OpenID Connect discovery
  * Auth code flow
* Add spdy http2 support.
  * Notice it does not supports node 11.x
* Updated to Material UI v4

## 2.0

* Material UI
* Separate settings for lastN for desktop and mobile

## 1.2

* Add Lock Room feature
* Fix suspended Web Audio context / fixed delayed getUsermedia
* Added support for the new getdisplaymedia API in Chrome 72

## 1.1

* Moved Filesharing code out from React code to RoomClient
* Major cleanup of CSS. Variables for most colors and sizes exposed in :root
* Started using React Context instead of middleware
* Small fixes to buttons and layout

## 1.0

* Fixed toolarea button based on feedback from users
* Added possibility to move video to separate window
* Added SIP gateway

## RC1 1.0

* First stable release?

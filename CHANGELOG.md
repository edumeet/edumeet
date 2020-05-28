# Changelog

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
* Add: Lots of appearence settings
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

# Changelog

### Next Version
 * Add munin plugin
 * Add muted=true search param to disble audio by deffault

### 3.1
* Browser session storage
* Virtual lobby for rooms
* Allow minimum TLSv1.2 and recommended ciphers
* Code splitting for faster load times
* Various GUI fixes
* Internationalization support
* Can require sign in for access

### 3.0
* Updated to mediasoup v3
* Replace lib "passport-datporten" with "openid-client" (a general OIDC certified client)
  - OpenID Connect discovery
  - Auth code flow
* Add spdy http2 support.
  - Notice it does not supports node 11.x
* Updated to Material UI v4

 ### 2.0
* Material UI
* Separate settings for lastN for desktop and mobile

 ### 1.2
* Add Lock Room feature
* Fix suspended Web Audio context / fixed delayed getUsermedia
* Added support for the new getdisplaymedia API in Chrome 72

### 1.1
* Moved Filesharing code out from React code to RoomClient
* Major cleanup of CSS. Variables for most colors and sizes exposed in :root
* Started using React Context instead of middleware
* Small fixes to buttons and layout

### 1.0
* Fixed toolarea button based on feedback from users
* Added possibility to move video to separate window
* Added SIP gateway

### RC1 1.0
* First stable release?

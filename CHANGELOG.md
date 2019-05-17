# Changelog

### 2.1
* Replace lib "passport-datporten" with "openid-client" (a general OIDC certified client)
  - OpenID Connect discovery
  - Auth code flow
* Add spdy http2 support.
  - Notice it does not supports node 11.x

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

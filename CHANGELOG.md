
# Edumeet 4.x CHANGE LOG
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)

Releases are based on our [docker images](https://hub.docker.com/u/edumeet)

We are using a rolling release versioning:
```
<version>-<date of release>-<tag>

4.0-20240131-stable
```
The stable tag  is teseted by the development team and used by default for [edumeet-docker](https://github.com/edumeet/edumeet-docker/) repository installs.

## [4.1-2025xxxx-stable] - 2025-xx-xx

### Added
- Draw on meet feature (Whiteboard)
- Video background from local image feature
### Changed

### Fixed
- Fix management UI - query limit was set to 10 so userquery for admins did not work correctly
- Fix login button on the room chooser UI (message listener was not started)
- Fix for edumeet client drag and drop bug in the volume slider (edumeet-client issue  255)


## [4.1-20250513-stable] - 2025-05-13

### Added
- Drag and drop functionality for breakout rooms
- Users can upload room backgrounds for local usage (TODO update it to work with video background)
- Added option to add rules to mgmt service (user creation can be blocked by conditions, user can gain permissions (Tenant admin/owner, group membership))
- Added name parameter for mgmt-service (Previously it was not stored. Depending on the Oauth source it can differ: name, nickname, displayName ... fallback is email)
- Added session end url for mgmt-service (Previously it was not stored. Currently not in use, but can be used to log out from the OIDC provider session, and not just logout from edumeet)
- Added new translations for new and old components in the edumeet-client
### Changed
- edumeet-docker got an update for certificate re-generation
### Fixed
- Fix management UI - minor bug fixes (in some cases id parameter was used instead of tenantId ).
- Fix management backend bugs.
- Some labels were mixed up



## [4.1-20250218-stable] - 2025-02-18
The mangemenet client has been integrated into the edumeet-client.
### Added
- Audio feedback on join dialog
- Countdown timer is feature is now added, but disabled by default
- Management interface is now part of the client
- Tooltip text option with (text,description and link parameters)
- ObserveRTC stats
### Changed
- Removed mgmt-client.
- QR code is now disabled by default but can be enabled
### Fixed
- Media node can now listen on 2 interfaces 
- Fixed blur bug with multiple camera devices
- Fix management UI - hide parameters that cannot be assigned (at creation).
- Fix management backend bugs (rooms are now only shown to the owners, groups and roles can be created by normal users too).

## [4.0-20241016-stable] - 2024-10-16
Generic bug fixes
 
### Added
- Impressum url can be added (in app config impressumUrl :  path/url) 
- p2p can be disabled (in app config p2penabled : true/false )
### Changed
### Fixed


## [4.0-20240919-stable] - 2024-09-19
Generic bug fixes
 
### Added
### Changed
### Fixed
- packages are upgraded

## [4.0-20240823-stable] - 2024-08-23
Generic bug fixes
 
### Added
### Changed
### Fixed
- Management server callback is now fixed

## [4.0-20240819-stable] - 2024-08-19
Generic bug fixes
 
### Added
- QR code is now displayed on the room dialog
### Changed
- TURN ports and protocols are now configurable in the room-server config
### Fixed
- translations are updated

## [4.0-20240730-stable] - 2024-07-30
Generic bug fixes
 
### Added
### Changed
### Fixed
- XSS vulnerability fixed in the mgmt server


## [4.0-20240531-stable] - 2024-05-31
Generic bug fixes
 
### Added
### Changed
### Fixed
- Edumeet hardcoded text is no longer there.
- When management service is configured logo and background is now loading as expected.
- Fixed the problem of consumers stuck in a loading state.
- Fixed recording after it got slightly broken with the P2P work. Also added support for Firefox and Safari while I was at it.
- Packages are now updated again

## [4.0-20240315-stable] - 2024-03-15
Generic bug fixes
 
### Added
- Spotlight logic
- microphone volume feedback is shown when media is not sent
### Changed
- Layout of screenshare
### Fixed
- P2P mode (codec is not hardcoded, if 2 participants are talking edumeet will use p2p)
- Packages are now updated again


## [4.0-20240308-stable] - 2024-03-08
Generic bug fixes
 
### Added
- P2P mode
### Changed
- Made participant list a bit more compact
- room layout small UI changes 
### Fixed
- media-node communication logic
- Packages are now updated again


## [4.0-20240301-stable] - 2024-03-01 
Generic bug fixes + minify size of images
 
### Added

### Changed
- Extended metric for media node
### Fixed
- Management Client had hardcoded path
- Management Client was running in development mode 
- Packages are now updated again


## [4.0-20240229-stable] - 2024-02-29
Generic bug fixes + major config change
 
### Added
- Improved background blur 
- Media node has now metric, load, healt http endpoint
- Turn support
- Made media on join configurable.
- Add support for audio output selection.
### Changed
- Room-server config is simplified.

### Fixed
- Issue, code was not building in production mode because of a bad variable check
- Media node was leaking memory because of mediasoup version bug
- Packages are now updated again

## [4.0-20240202-stable] - 2024-02-02
Generic bug fixes
 
### Added
- new Translations
### Changed

### Fixed
Updated mediasoup  

## [4.0-20240131-stable] - 2024-01-31
Rewritten the the whole codebase from scrach based on EduMEET 3.x .
 
### Added
- New local video recording code (works with Chrome).
- Background blur
- New UI
- Added managmenet service (optional)
 
### Changed
Everything...
EduMEET is now written in TypeScrip and uses Node 18.x 

### Fixed
Every package is now updated to the latest available.
 

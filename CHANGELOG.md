
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
 

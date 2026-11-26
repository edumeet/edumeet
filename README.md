# ![edumeet logo](https://github.com/edumeet/edumeet-client/blob/main/public/images/logo.edumeet.svg) **WebRTC meeting service**
Official website: [edumeet.org](https://edumeet.org)

Try it online at [letsmeet.no](https://letsmeet.no)

Join our discord server [here](https://discord.gg/jxhQNq956)

Stable Docker image tags end in `-stable`:
| Component    | Docker images |
| -------- | ------- |
| edumeet-client  | ![Docker image version for client](https://img.shields.io/docker/v/edumeet/edumeet-client)   |
| edumeet-room-server | ![Docker image version for room server](https://img.shields.io/docker/v/edumeet/edumeet-room-server)     |
| edumeet-media-node    | ![Docker image version for media node](https://img.shields.io/docker/v/edumeet/edumeet-media-node)    |
| edumeet-management-server    | ![Docker image version for management server](https://img.shields.io/docker/v/edumeet/edumeet-management-server)    |

## Start here

Choose the guide that fits what you want to do:

| I want to... | Start here |
| --- | --- |
| Try a meeting without installing anything | [Open letsmeet.no](https://letsmeet.no) |
| Run a basic instance without managed rooms or login | [Minimal Docker deployment](docs/minimal-deployment.md), in this repository |
| Run a full instance with management, managed rooms and optional login | [Full Docker installation](https://github.com/edumeet/edumeet-docker#readme) |
| Develop or test eduMEET from source | [Developer setup](DEVELOPMENT.md), or [VS Code setup](DEVELOPMENT-VSCODE.md) |
| Learn about encryption, webinars, bots or other features | [Documentation index](#documentation) |

The two Docker installations have different configurations and firewall rules.
Follow the guide for the one you choose. These guides describe the current `main`
branch; a deployed release may differ.

`docker-compose.yml` pins the edumeet images to the current stable release, and the `latest` tag on Docker Hub points at the same release.

To publish a release: push the images with the version tag, then merge the pull request that adds the `## [<version>-stable]` section to `CHANGELOG.md` and sets that version in `docker-compose.yml`. The [release workflow](.github/workflows/release.yml) then creates the GitHub Release and moves `latest` to the new version.

## Main features

| Feature  | Description |
| ------------- | ------------- |
| **A/V streaming** | Share your microphone and camera + additional video stream  |
| **Screen sharing** | Share your screen to make some presentation right from your desktop |
| **File sharing** | Share your files with the peers (torrent solution under the hood) |
| **Chat messages**  | Text conversation with other participants |
| **Local Recording**  | Record window/tab/screen content in browser supported formats with room audio and save them (**disabled by default**) |
| **Authentication**  | Optional authentication through the full deployment's management server and an OIDC provider |

## Installation

This section describes the **minimal deployment** in this repository: client,
room server, media node and TURN, without the management server or login. For
the full deployment, use [edumeet-docker](https://github.com/edumeet/edumeet-docker#readme)
instead.

- <a name="prerequisites"></a>[Prerequisites and networking](docs/minimal-deployment.md#prerequisites)
- <a name="installation-steps"></a>[Install and start](docs/minimal-deployment.md#install-and-start)
- <a name="configuration"></a>[Configuration and backup](docs/minimal-deployment.md#configuration-and-backup)
- Configuration references: [client](https://github.com/edumeet/edumeet-client/blob/main/docs/configuration.md)
  and [room server](https://github.com/edumeet/edumeet-room-server/blob/main/docs/configuration.md)

## Documentation

### Deploy and operate

- [Minimal Docker deployment](docs/minimal-deployment.md) — install and operate without management or login
- [Full Docker deployment](https://github.com/edumeet/edumeet-docker#readme) — management and optional login
- [Suspicious clients](SUSPICIOUS-CLIENTS.md) — monitor unusual connections and optionally configure bans

### Meetings and features

- [End-to-end encryption](E2EE.md) — protection, setup and limitations
- [Webinars](WEBINAR.md) and [reported load-test results](WEBINAR-LOADTEST.md)
- [Meetings and calendar invitations](https://github.com/edumeet/edumeet-docker/blob/main/docs/meetings.md#calendar-invites)

### Develop and integrate

- [Developer setup](DEVELOPMENT.md) and [VS Code setup](DEVELOPMENT-VSCODE.md)
- [Browser automation](https://github.com/edumeet/edumeet-client/blob/main/docs/browser-automation.md) — stable page attributes for integrations
- [Writing a bot](BOTS.md) and the [bot provider API](BOT-PROVIDER-API.md)
- [Documentation ownership and maintenance](docs/documentation-maintenance.md)
- [Changelog](CHANGELOG.md)

## Development

eduMEET consists of four services, each in its own repository: [edumeet-client](https://github.com/edumeet/edumeet-client), [edumeet-room-server](https://github.com/edumeet/edumeet-room-server), [edumeet-media-node](https://github.com/edumeet/edumeet-media-node) and [edumeet-management-server](https://github.com/edumeet/edumeet-management-server), plus the shared library [edumeet-common](https://github.com/edumeet/edumeet-common).

To run them all from source, first check the prerequisites and safety notes in
[DEVELOPMENT.md](DEVELOPMENT.md). The commands below create a new workspace;
choose a different name if that directory already exists.

```bash
mkdir -p ~/src && mkdir ~/src/edumeet-workspace && cd ~/src/edumeet-workspace &&
  git clone https://github.com/edumeet/edumeet.git &&
  cp -a edumeet/dev-workspace/. . && ./bootstrap.sh
```
For VS Code, see [DEVELOPMENT-VSCODE.md](DEVELOPMENT-VSCODE.md). Contributions
go through pull requests against `main` of the respective repository; see its
`CONTRIBUTING.md`.

## Community-driven support
| Type                |                                                |
| -----------         | -----------                                    |
| Open mailing list   | community@lists.edumeet.org                    |
| Subscribe           | lists.edumeet.org/sympa/subscribe/community/   |
| Open archive        | lists.edumeet.org/sympa/arc/community/         |

## Authors

* Håvar Aambø Fosstveit
* Stefan Otto
* Mészáros Mihály
* Roman Drozd
* Rémai Gábor László
* Piotr Pawałowski

## License

MIT License

Contributions to this work were made on behalf of the GÉANT project, a project that has received funding from the European Union’s Horizon 2020 research and innovation programme under Grant Agreement No. 731122 (GN4-2). On behalf of GÉANT project, GÉANT Association is the sole owner of the copyright in all material which was developed by a member of the GÉANT project.

GÉANT Vereniging (Association) is registered with the Chamber of Commerce in Amsterdam with registration number 40535155 and operates in the UK as a branch of GÉANT Vereniging. Registered office: Hoekenrode 3, 1102BR Amsterdam, The Netherlands. UK branch address: City House, 126-130 Hills Road, Cambridge CB2 1PQ, UK.


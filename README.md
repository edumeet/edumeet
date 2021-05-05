# edumeet

A WebRTC meeting service using [mediasoup](https://mediasoup.org).

![demo](demo.gif)

Try it online at https://letsmeet.no. You can add /roomname to the URL for specifying a room.

## Features

* Audio/Video
* Chat
* Screen sharing
* File sharing
* Different layouts
* Internationalization support

## Docker

If you want the automatic approach, you can find a docker image [here](https://hub.docker.com/r/edumeet/edumeet/).

## Ansible

If you want the ansible approach, you can find ansible role [here](https://github.com/edumeet/edumeet-ansible/).
[![asciicast](https://asciinema.org/a/311365.svg)](https://asciinema.org/a/311365)

## Package Installation

If you want to install it on the Debian & Ubuntu based operating systems.

* Prerequisites:
edumeet will run on nodejs v14.x (tested with v14.15.4 version).
To install see here [here](https://github.com/nodesource/distributions/blob/master/README.md#debinstall).

* Download .deb package from [here](https://github.com/edumeet/edumeet/actions?query=workflow%3ADeployer+branch%3Amaster+is%3Asuccess) (job artifact)

* Unzip the file

```bash
$ unzip edumeet.zip
```

* Install the package

```bash
$ sudo apt install edumeet/edumeet.deb
```

* After package installation, don't forget the configure ip address in config file.

```bash
$ sudo nano /etc/meeting/server-config.js
```

* Finally, start the service by (it's enabled by default)

```bash
$ sudo systemctl start edumeet
```

## Manual installation

* Install all the required dependencies and NodeJS v14 (Debian/Ubuntu):

```bash
sudo apt install -y curl git python build-essential redis openssl libssl-dev pkg-config
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo bash -
sudo apt update && sudo apt install -y nodejs
```

* Install the Yarn package manager (recommended):

```bash
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install -y yarn
```

* Clone the project:

```bash
git clone https://github.com/edumeet/edumeet.git
cd edumeet

# switch to the "develop" branch to get the latest version for developing
git checkout develop
```

* Copy `server/config/config.example.js` to `server/config/config.js` :

```bash
cp server/config/config.example.js server/config/config.js
```

* Copy `app/public/config/config.example.js` to `app/public/config/config.js` :

```bash
cp app/public/config/config.example.js app/public/config/config.js
```

* Edit your two `config.js` with appropriate settings (listening IP/port, logging options, **valid** TLS certificate, don't forget ip setting in last section in server config: (webRtcTransport), etc).

* Set up the browser app:

```bash
cd app

# using Yarn (recommended)
yarn && yarn build

# using NPM
npm i && npm run build
```

This will build the client application and copy everything to `server/public` from where the server can host client code to browser requests.

* Set up the server:

```bash
cd ../server

# using Yarn (recommended)
yarn && yarn build

# using NPM
npm i && npm run build
```

## Run it locally

* Run the Node.js server application in a terminal:

```bash
cd server

# using Yarn (recommended)
yarn start

# using NPM
npm run start
```

* Note: Do not run the server as root. If you need to use port 80/443 make a iptables-mapping for that or use systemd configuration for that (see further down this doc).
* Test your service in a webRTC enabled browser: `https://yourDomainOrIPAdress:3443/roomname`

## Deploy it in a server

* Stop your locally running server. Copy systemd-service file `edumeet.service` to `/etc/systemd/system/` and check location path settings:

```bash
$ cp edumeet.service /etc/systemd/system/
$ edit /etc/systemd/system/edumeet.service
```

* Reload systemd configuration and start service:

```bash
$ systemctl daemon-reload
$ systemctl start edumeet
```

* If you want to start edumeet at boot time:

```bash
$ systemctl enable edumeet
```

## Ports and firewall

* 3443/tcp (default https webserver and signaling - adjustable in `server/config.js`)
* 4443/tcp (default `npm start` port for developing with live browser reload, not needed in production environments - adjustable in app/package.json)
* 40000-49999/udp/tcp (media ports - adjustable in `server/config.js`)

## Load balanced installation

To deploy this as a load balanced cluster, have a look at [HAproxy](HAproxy.md).

## Learning management integration

To integrate with an LMS (e.g. Moodle), have a look at [LTI](LTI/LTI.md).

## TURN configuration

* You need an additional [TURN](https://github.com/coturn/coturn)-server for clients located behind restrictive firewalls! Add your server and credentials to `server/config/config.js`

## Community-driven support

* Open mailing list: community@lists.edumeet.org
* Subscribe: lists.edumeet.org/sympa/subscribe/community/
* Open archive: lists.edumeet.org/sympa/arc/community/

## Authors

* Håvar Aambø Fosstveit
* Stefan Otto
* Mészáros Mihály
* Roman Drozd
* Rémai Gábor László
* Piotr Pawałowski

This started as a fork of the [work](https://github.com/versatica/mediasoup-demo) done by:

* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]

## License

MIT License (see `LICENSE.md`)

Contributions to this work were made on behalf of the GÉANT project, a project that has received funding from the European Union’s Horizon 2020 research and innovation programme under Grant Agreement No. 731122 (GN4-2). On behalf of GÉANT project, GÉANT Association is the sole owner of the copyright in all material which was developed by a member of the GÉANT project.

GÉANT Vereniging (Association) is registered with the Chamber of Commerce in Amsterdam with registration number 40535155 and operates in the UK as a branch of GÉANT Vereniging. Registered office: Hoekenrode 3, 1102BR Amsterdam, The Netherlands. UK branch address: City House, 126-130 Hills Road, Cambridge CB2 1PQ, UK.

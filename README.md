# multiparty-meeting

A WebRTC meeting service using [mediasoup](https://mediasoup.org).

Try it online at https://letsmeet.no. You can add /roomname to the URL for specifying a room.

## Features
* Audio/Video
* Chat
* Screen sharing
* File sharing
* Different video layouts

There is also a SIP gateway that can be found [here](https://github.com/havfo/multiparty-meeting-sipgw). To try it, call: roomname@letsmeet.no.

## Docker
If you want the automatic approach, you can find a docker image [here](https://hub.docker.com/r/misi/mm/).

## Manual installation

* Clone the project:

```bash
$ git clone https://github.com/havfo/multiparty-meeting.git
$ cd multiparty-meeting
```

* Copy `server/config.example.js` to `server/config.js` :

```bash
$ cp server/config.example.js server/config.js
```

* Copy `app/public/config.example.js` to `app/public/config.js` :

```bash
$ cp app/public/config.example.js app/public/config.js
```

* Edit your two `config.js` with appropriate settings (listening IP/port, logging options, **valid** TLS certificate, etc).

* Set up the browser app:

```bash
$ cd app
$ npm install
$ npm run build
```
This will build the client application and copy everythink to `server/public` from where the server can host client code to browser requests.

* Set up the server:

```bash
$ cd ..
$ cd server
$ npm install
```

## Run it locally

* Run the Node.js server application in a terminal:

```bash
$ cd server
$ npm start
```
* test your service in a webRTC enabled browser: `https://yourDomainOrIPAdress:3443/roomname`

## Deploy it in a server

* Stop your locally running server. Copy systemd-service file `multiparty-meeting.service` to `/etc/systemd/system/` and check location path settings:
```bash
$ cp multiparty-meeting.service /etc/systemd/system/
$ edit /etc/systemd/system/multiparty-meeting.service
```

* reload systemd configuration and start service:

```bash
$ systemctl daemon-reload
$ systemctl start multiparty-meeting
```

* if you want to start multiparty-meeting at boot time:
```bash
$ systemctl enable multiparty-meeting
```

## Ports and firewall

* 3443/tcp (default https webserver and signaling - adjustable in `server/config.js`)
* 4443/tcp (default `npm start` port for developing with live browser reload, not needed in production enviroments - adjustable in app/package.json)
* 40000-49999/udp/tcp (media ports - adjustable in `server/config.js`)

## TURN configuration

* You need an addtional [TURN](https://github.com/coturn/coturn)-server for clients located behind restrictive firewalls! Add your server and credentials to `app/config.js`

## Authors

* Håvar Aambø Fosstveit
* Stefan Otto
* Mészáros Mihály


This started as a fork of the [work](https://github.com/versatica/mediasoup-demo) done by:
* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]


## License

MIT

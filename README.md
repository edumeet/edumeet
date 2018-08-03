# multiparty-meeting

A WebRTC meeting service using [mediasoup](https://mediasoup.org) as its backend.

Try it online at https://akademia.no. You can add /roomname to the URL for specifying a room.


## Installation

* Clone the project:

```bash
$ git clone https://github.com/havfo/multiparty-meeting.git
$ cd multiparty-meeting
```

* Copy `server/config.example.js` to `server/config.js` :

```bash
$ cp server/config.example.js server/config.js
```

* Copy `app/config.example.js` to `app/config.js` :

In addition, the server requires a screen to be installed for the server
to be able to seed shared torrent files. This is because the headless
Electron instance used by WebTorrent expects one.

See [webtorrent-hybrid](https://github.com/webtorrent/webtorrent-hybrid) for
more information about this.

* Copy `config.example.js` as `config.js` and customize it for your scenario:

```bash
$ cp app/config.example.js app/config.js
```

* Edit your two `config.js` with appropriate settings (listening IP/port, logging options, **valid** TLS certificate, etc).

* Set up the browser app:

```bash
$ cd app
$ npm install
$ export NODE_ENV=production
$ gulp dist
```
This will build the client application and copy everythink to `server/public` from where the server can host client code to browser requests. (no apache/NGINX needed)

* Globally install `gulp-cli` NPM module (may need `sudo`):

```bash
$ npm install -g gulp-cli
```

* Set up the server:

```bash
$ cd ..
$ cd server
$ npm install
```

## Run it locally

* Run the Node.js server application in a terminal:

```bash
$ node server.js
```
* test your service in a webRTC enabled browser: `https://yourDomainOrIPAdress:3443/roomname`

## Deploy it in a server

* Stop your locally running server. Copy systemd-service file `multiparty-meeting.service` to `/etc/systemd/system/` and dobbel check location path settings:
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
* 3000/tcp (default `gulp live` port for developing with live browser reload, not needed in production enviroments - adjustable in app/gulpfile.js)
* 40000-49999/udp/tcp (media ports - adjustable in `server/config.js`)

* If you want your service running at standard ports 80/443 you should:
  * Make a redirect from HTTP port 80 to HTTPS (with Apache/NGINX) 
  * Configure a forwarding rule with iptables from port 443 to your configured service port (default 3443)


## TURN configuration

* You need an addtional [TURN](https://github.com/coturn/coturn)-server for clients located behind restrictive firewalls! Add your server and credentials to `app/config.js`

## Author

* Håvar Aambø Fosstveit
* Stefan Otto
* Mészáros Mihály


This is heavily based on the [work](https://github.com/versatica/mediasoup-demo) done by:
* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]


## License

MIT


# mediasoup-demo

A demo of [mediasoup](https://mediasoup.org).

Try it online at https://demo.mediasoup.org.


## Installation

* Clone the project:

```bash
$ git clone https://github.com/versatica/mediasoup-demo.git
$ cd mediasoup-demo
```

* Set up the server:

```bash
$ cd server
$ npm install
```

* Copy `config.example.js` as `config.js` and customize it for your scenario:

```bash
$ cp config.example.js config.js
```

* Set up the browser app:

```bash
$ cd app
$ npm install
```

* Globally install `gulp-cli` NPM module (may need `sudo`):

```bash
$ npm install -g gulp-cli
```


## Run it locally

* Run the Node.js server application in a terminal:

```bash
$ cd server
$ node server.js
```

* In another terminal build and run the browser application:

```bash
$ cd app
$ gulp live
```

* Enjoy.


## Deploy it in a server

* Build the production ready browser application:

```bash
$ cd app
$ gulp dist
```

* Upload the entire `server` folder to your server and make your web server (Apache, Nginx...) expose the `server/public` folder.

* Edit your `server/config.js` with appropriate settings (listening IP/port, logging options, **valid** TLS certificate, etc).

* Within your server, run the server side Node.js application. We recommend using the [pm2](https://www.npmjs.com/package/pm2) NPM daemon launcher, but any other can be used.


## Author

* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]


## License

MIT


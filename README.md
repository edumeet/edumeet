# ![edumeet logo](/app/public/images/logo.edumeet.svg)
A WebRTC meeting service using [mediasoup](https://mediasoup.org).

![demo](demo.gif)

Try it online at [letsmeet.no](https://letsmeet.no)

## Main features

| Feature  | Description |
| ------------- | ------------- |
| **Audio/Video streaming** | You can share your microphone and camera + additional video stream  |
| **Video layouts** | You can choose between **Democratic** and **Filmstrip** views. More in progress. |
| **Screen sharing** | You can share your screen to make some presentation right from your desktop |
| **File sharing** | You can share your files with the peers (torrent solution under the hood) |
| **Chat messages**  | You can make a text conversation with peers |
| **Local Recording**  | Record window/tab/screen content in browser supported formats with room audio and save them.(**disabled by default**) |
| **Authorization**  | Supported types: **OIDC**, **SAML**, **local text-based database** |


#### Multi-Languages 
<details>
  <summary>How to contribute?</summary>
  
  #### Steps
  1. take a certain [language file](https://github.com/edumeet/edumeet/tree/develop/app/src/translations) you want to translate
  2. find the _null_  values
  >	"settings.language": null,
  3. replace them based on the _en.json_ file
  > "settings.language": "Select language",
  4. make a Pull Request, or send us a [e-mail](mailto:roman@drozd.it) with file
  
  Thanks so much in advance!
</details>


#### Local Recording
<details>
  <summary>See more</summary>
  
  * Local Recording records the browser window video and audio. From the list of media formats that your  browser supports you can select your preferred media format in the settings menu advanced video menu setting.  MediaRecorder makes small chucks of recording and these recorded blob chunks temporary stored in IndexedDB, if IndexedDB implemented in your browser. Otherwise it stores blobs in memory in an array of blobs.
Local Recording creates a local IndexedDB with the name of the starting timestamp (unix timestamp format)  And a storage called chunks. All chunks read in an array and created a final blob that you can download. After blobs array concatenation as a big blob, this big blob saved as file, and finally we delete the temporary local IndexedDB.

* Local recording is **disabled** by default. You can enable it by setting localRecordingEnabled to true in  (./app/public/config/config.js)

* **WARNINIG**: Take care that You need for local recording extra cpu, memory and disk space.
  **You need to have good enough free disk space!!**
Keep in mind that Browsers don't allow to use all the disk free capacity!
See more info about browsers storage limits:
  * <https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Browser_storage_limits_and_eviction_criteria#storage_limits>
  * <https://chromium.googlesource.com/chromium/src/+/refs/heads/master/storage/browser/quota/quota_settings.cc#68>

</details>

## Docker

Get docker image [here](https://hub.docker.com/r/edumeet/edumeet/)

## Ansible (based on Docker)

See [more](https://github.com/edumeet/edumeet-ansible/).

[![asciicast](https://asciinema.org/a/311365.svg)](https://asciinema.org/a/311365)

## .deb package (for debian-based systems)

If you want to install it on the Debian & Ubuntu based operating systems.

* Prerequisites: [node v14.x](https://github.com/nodesource/distributions/blob/master/README.md#debinstall) (tested with v14.18.3 version)

* Get package [here](https://github.com/edumeet/edumeet/actions?query=workflow%3ADeployer+branch%3Amaster+is%3Asuccess) (job artifact)

```bash
# Unzip the file
unzip edumeet.zip

# Install the package
sudo apt install edumeet/edumeet.deb

# After package installation, don't forget the configure ip address in config file.
sudo nano /etc/meeting/server-config.js

# Finally, start the service by (it's enabled by default)
sudo systemctl start edumeet
```

## Manual installation (build)

### install
Note: We strongly recommend to always use a _yarn_ package manager.

```bash
# Install all the required dependencies and NodeJS v14 (Debian/Ubuntu) and Yarn package manager:
sudo apt update && sudo apt install -y curl git python python3-pip build-essential redis openssl libssl-dev pkg-config
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo bash -
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install -y yarn nodejs

# get version
git clone https://github.com/edumeet/edumeet.git

cd edumeet

# switch to the "develop" branch to get the latest version for developing
git checkout develop 
```

### build
```bash
cd app
yarn && yarn build

cd ../server
yarn && yarn build
```

### configure

Note: Edumeet will start on the default settings (if you don't create your own configuration files)

Important! You must always **rebuild** the edumeet when you change something in the configuration  files. 

#### use template (example)
Just clone the example files and adjust them

```bash
cp server/config/config.example.js server/config/config.js
cp app/public/config/config.example.js app/public/config/config.js
```

#### create your own config (yaml or json)

Example when _config.yaml_:
```yaml 
turnAPIKey: "<KEY>"
turnAPIURI: "https://api.turn.geant.org/turn"
mediasoup:
  webRtcTransport:
    listenIps:
    - ip: "<serverip>"
      announcedIp: ""
```
Example when _config.js_
```javascript
var config =
{
	developmentPort : 8443,
	productionPort  : 3443
};
```

Full documentation and list of all settings:
| destination | location | 
| ---   | ---      |
| app side | [./app/README.md](https://github.com/edumeet/edumeet/blob/develop/app/README.md) |
| srv side | [./server/README.md](https://github.com/edumeet/edumeet/blob/develop/server/README.md) | 

### Run 

#### locally (for development)

* The newest build is always in **develop branch** if you want to make a contribution/pull request use it instead of master branch.

```bash
# You can run a live build from app folder and running :
app$ yarn start

# Also you need to start a server in server folder too. 
server$ yarn start
```

#### locally

```bash
# Run the Node.js server application in a terminal:
cd server
yarn start
```

Note: Do not run the server as root. Instead, do redirects  on the firewall:
```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 8443
sudo iptables -t nat -A OUTPUT -p tcp --dport 443 -o lo -j REDIRECT --to-port 8443
sudo iptables -t nat -A PREROUTING -p tcp --dport 3443 -j REDIRECT --to-ports 8443
sudo iptables -t nat -A OUTPUT -p tcp --dport 3443 -o lo -j REDIRECT --to-port 8443

# make it persistent
sudo apt install iptables-persistent
sudo iptables-save > /etc/iptables/rules.v4
sudo ip6tables-save > /etc/iptables/rules.v6
```

* Test your service in a webRTC enabled browser: `https://yourDomainOrIPAdress:3443/roomname`

#### as a service (systemd)

```bash
# Stop your locally running server. Copy systemd-service file `edumeet.service` to `/etc/systemd/system/` and check location path settings:
cp edumeet.service /etc/systemd/system/

# modify the install paths, if required
sudo edit /etc/systemd/system/edumeet.service

# Reload systemd configuration and start service:
sudo systemctl daemon-reload
sudo systemctl start edumeet

# If you want to start edumeet at boot time:
sudo systemctl enable edumeet
```

## Ports and firewall
| Port | protocol | description |
| ---- | ----------- | ----------- |
|3443 | tcp | default https webserver and signaling - adjustable in `server/config.js`) |
| 4443 | tcp | default `yarn start` port for developing with live browser reload, not needed in production environments - adjustable in app/package.json) |
| 40000-49999 | udp, tcp | media ports - adjustable in `server/config.js` |

## Load balanced installation

To deploy this as a load balanced cluster, have a look at [HAproxy](HAproxy.md).

## Learning management integration

To integrate with an LMS (e.g. Moodle), have a look at [LTI](LTI/LTI.md).

## TURN configuration

You need an additional [TURN](https://github.com/coturn/coturn)-server for clients located behind restrictive firewalls! 
Add your server and credentials to `server/config/config.js`

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

This started as a fork of the [work](https://github.com/versatica/mediasoup-demo) done by:

* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]

## License

MIT License (see `LICENSE.md`)

Contributions to this work were made on behalf of the GÉANT project, a project that has received funding from the European Union’s Horizon 2020 research and innovation programme under Grant Agreement No. 731122 (GN4-2). On behalf of GÉANT project, GÉANT Association is the sole owner of the copyright in all material which was developed by a member of the GÉANT project.

GÉANT Vereniging (Association) is registered with the Chamber of Commerce in Amsterdam with registration number 40535155 and operates in the UK as a branch of GÉANT Vereniging. Registered office: Hoekenrode 3, 1102BR Amsterdam, The Netherlands. UK branch address: City House, 126-130 Hills Road, Cambridge CB2 1PQ, UK.

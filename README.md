## Main features

| Feature  | Description |
| ------------- | ------------- |
| **A/V streaming** | Share your microphone and camera + additional video stream  |
| **Video layouts** | Choose between **Democratic** and **Filmstrip** views. More in progress. |
| **Screen sharing** | Share your screen to make some presentation right from your desktop |
| **File sharing** | Share your files with the peers (torrent solution under the hood) |
| **Chat messages**  | Text conversation with other participants |
| **Local Recording**  | Record window/tab/screen content in browser supported formats with room audio and save them (**disabled by default**) |
| **Authentication**  | Supported types: **OIDC**, **SAML**, **local db (text-based)** |


### Internationalization (22 languages) 
<details>
  <summary>Help us with translations:exclamation:</summary>
  
  #### How to contribute?
	
  1. Continue to translate existing [language file](/app/src/intl/translations)
  2. find the _null_  values
  >	"settings.language": null,
  3. replace them based on the _en.json_ file
  >	"settings.language": "Select language",
  4. If your language is not listed, create a new translation _.json_ file..
  >	copy en.json to [_"two letter country code"_.json](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) and translate to your languange 
  5. make a Pull Request, or send us a file by
	
  Thank you in advance!
</details>


### Local Recording
<details>
  <summary>See more</summary>
  
* Local Recording records the browser window video and audio. From the list of media formats that your  browser supports you can select your preferred media format in the settings menu advanced video menu setting.  MediaRecorder makes small chucks of recording and these recorded blob chunks temporary stored in IndexedDB, if IndexedDB implemented in your browser. Otherwise it stores blobs in memory in an array of blobs.
Local Recording creates a local IndexedDB with the name of the starting timestamp (unix timestamp format)  And a storage called chunks. All chunks read in an array and created a final blob that you can download. After blobs array concatenation as a big blob, this big blob saved as file, and finally we delete the temporary local IndexedDB.

* Local recording is **disabled** by default. It could be enabled by setting _localRecordingEnabled_ to true in  (./app/public/config/config.js)

* **WARNING**: Take care that local recording will increase cpu, memory and disk space consumption.
**Enough free disk space has to be provided!!!**
Keep in mind that Browsers don't allow to use all the disk free capacity!
See more info about browsers storage limits:
  * <https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Browser_storage_limits_and_eviction_criteria#storage_limits>
  * <https://chromium.googlesource.com/chromium/src/+/refs/heads/master/storage/browser/quota/quota_settings.cc#68>

</details>

```bash
# Unzip the file
unzip FaceToFace.zip

# Install the package
sudo apt install FaceToFace/FaceToFace.deb

# After package installation, don't forget to edit configuration files.
sudo nano /etc/educonf/client-config.js
sudo nano /etc/educonf/server-config.js
sudo nano /etc/educonf/server-config.yaml

# Finally, start the service by (it's enabled by default)
sudo systemctl start FaceToFace
```

## Manual installation (build)
Installation example is based on Debian/Ubuntu Linux operating system.
1. Install [NodeJS (v16.x)](https://github.com/nodesource/distributions) and [Yarn ](https://classic.yarnpkg.com/en/docs/install#debian-stable) package manager 
- NodeJS (v16.x) [Debian/Ubuntu](https://github.com/nodesource/distributions#deb)
```bash
# Using Ubuntu
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using Debian, as root
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs
```
- Yarn package manager:
```bash
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install yarn
```
2. Install all required dependencies
```bash
sudo apt update && sudo apt install -y curl git python python3-pip build-essential redis openssl libssl-dev pkg-config
```	
3. Clone FaceToFace git repository
```bash
git clone https://github.com/buraksumer/FaceToFace.git
cd FaceToFace
```
(switch to the "develop" branch to get the latest features)
```bash
git checkout develop 
```
### Configuration
**FaceToFace** will start and run normally with just default settings. If there is no configuration files,  it will automatically detect your host IP address, and listen on port 443 (https). In order to change default values (e.g. certificates), or activate features (e.g. authentication), use appropriate configuration file (see below for details).  

**:warning: Note:** There are separate configuration files for FaceToFace application and FaceToFace server:

**FaceToFace application (app)** for: enabling login, change logo or background, adjust A/V parameters, etc...

Copy [example](/app/public/config/config.example.js) template and edit values (see all available parameters in [./app/public/config/README.md](/app/public/config/README.md))
```bash
cp app/public/config/config.example.js app/public/config/config.js
```

**FaceToFace server** require **:warning:two** configuration files: **config.js**, and **config.{_json_, _yaml_ or _toml_}** (multiple format supported)

**1. config.js** for setting authentication methods and user roles.

Copy example template and edit values (see additional details in [example](/server/config/config.example.js) file)
```bash
cp server/config/config.example.js server/config/config.js
```

**2. config.{_json_, _yaml_ or _toml_}** for configuring: server port, server certificates, [STUN/TURN](#turn-configuration) configuration, monitoring, etc...  (See below examples of different configuration styles). 

[**:point_right: _config.yaml_**](/server/config/config.example.yaml) example:
```yaml 
    listeningPort: 443
    tls:
        key:  /opt/FaceToFace/server/certs/privkey.pem
        cert: /opt/FaceToFace/server/certs/cert.pem
```
[**:point_right: _config.json_**](/server/config/config.example.json) example:
```javascript
    {
        "listeningPort" : "443",
        "tls" : {
            "cert" : "/opt/FaceToFace/server/certs/cert.pem",
            "key"  : "/opt/FaceToFace/server/certs/privkey.pem"
        }
    }
```
[**:point_right: _config.toml_**](/server/config/config.example.toml) example:
```toml
    listeningPort = "443"

    [tls]
    cert = "/opt/FaceToFace/server/certs/cert.pem"
    key = "/opt/FaceToFace/server/certs/privkey.pem"
```
**:red_circle: IMPORTANT:**  Use **only one** type for second configuration file (`yaml` file format is highly recommended)

Copy **only one** example template file and edit values (see all available parameters in [./server/config/README.md](/server/config/README.md))
```bash
cp server/config/config.example.yaml server/config/config.yaml
  OR!!!
cp server/config/config.example.json server/config/config.json
  OR!!!
cp server/config/config.example.toml server/config/config.toml
```

**:warning: NOTE:** application and server components **has to be rebuild** if configuration parameter is changed ([see build steps](#manual-installation-build)). Rebuild is not necessary for Docker or Debian (.deb) version, just restart container/service.

### Build
**Note:** It is highly recommended to use _yarn_ package manager.

```bash
cd app
yarn && yarn build

cd ../server
yarn && yarn build
```
### Run

**Run on server** (as root or with sudo) 

```bash
# Run the Node.js server application in a terminal:
cd server
sudo yarn start
```

**Run locally** (for development)

* The newest build is always in **develop branch** if you want to make a contribution/pull request use it instead of master branch.

```bash
# run a live build from app folder:
app$ yarn start

# and run server in server folder: 
server$ yarn start
```

Note: To avoid running server as root, redirects privileged ports with firewall rules:
```bash
#adjust ports to your needs

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

**Run as a service** (systemd)

```bash
# Stop your locally running server. Copy systemd-service file `FaceToFace.service` to `/etc/systemd/system/` and check location path settings:
cp FaceToFace.service /etc/systemd/system/

# modify the install paths, if required
sudo edit /etc/systemd/system/FaceToFace.service

# Reload systemd configuration and start service:
sudo systemctl daemon-reload
sudo systemctl start FaceToFace

# If you want to start FaceToFace at boot time:
sudo systemctl enable FaceToFace
```

## Ports and firewall
| Port | protocol | description |
| ---- | ----------- | ----------- |
|  443 | tcp | default https webserver and signaling - adjustable in `server/config/config.yaml`) |
| 4443 | tcp | default `yarn start` port for developing with live browser reload, not needed in production environments - adjustable in app/package.json) |
| 40000-49999 | udp, tcp | media ports - adjustable in `server/config/config.yaml` |

## Load balanced installation

To deploy this as a load balanced cluster, have a look at [HAproxy](HAproxy.md).

## Learning management integration

To integrate with an LMS (e.g. Moodle), have a look at [LTI](LTI/LTI.md).

## TURN configuration

If you are part of the GEANT eduGAIN, you can request your turn api key at [https://turn.geant.org/](https://turn.geant.org/)
	
You need an additional [TURN](https://github.com/coturn/coturn)-server for clients located behind restrictive firewalls! 
Add your server and credentials to `server/config/config.yaml`

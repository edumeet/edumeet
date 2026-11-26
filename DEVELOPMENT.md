# eduMEET developer setup

This guide gets the whole eduMEET 4.x stack running on your machine from source: client, room server, media node and management server. It also covers testing with real devices and login, and the problems you're likely to hit. It works with any editor; for a ready-made VS Code setup see [DEVELOPMENT-VSCODE.md](DEVELOPMENT-VSCODE.md).

How to propose changes (issues first, forks, pull requests to `main`) is described in each component's `CONTRIBUTING.md`, for example [edumeet-room-server/CONTRIBUTING.md](https://github.com/edumeet/edumeet-room-server/blob/main/CONTRIBUTING.md).

These instructions describe the current workspace template and component
configurations; check the versions you are using.

---

## 1. How the stack fits together

```
                  https://localhost:4443                 wss://localhost:8443
  Browser ──────────────────────────────► client   ┌──────────────────────────► room-server
     │   (page + JS, Vite dev server)              │  (signaling, socket.io)        │
     │                                             │                                │ wss://localhost:3000
     │ ── http://localhost:3030 ──► management-server ◄── REST (JWT, admin login)  ─┤ (secret auth)
     │      (login, rooms, admin UI API)      │                                     ▼
     │                                        └──► PostgreSQL :5432           media-node
     └──────────── audio/video: UDP/TCP 40000–40249 ─────────────────────────► (mediasoup SFU)
```

| Component | Repo | Tech | Dev port | Required for |
|---|---|---|---|---|
| Client | [edumeet-client](https://github.com/edumeet/edumeet-client) | React, Redux, Vite, mediasoup-client | 4443 (https) | everything |
| Room server | [edumeet-room-server](https://github.com/edumeet/edumeet-room-server) | Node, socket.io | 8443 (wss) | everything |
| Media node | [edumeet-media-node](https://github.com/edumeet/edumeet-media-node) | Node, mediasoup | 3000 (wss) + 40000–40249 udp/tcp | audio, video, screen sharing |
| Management server | [edumeet-management-server](https://github.com/edumeet/edumeet-management-server) | Feathers 5, knex, PostgreSQL | 3030 (http) | login, managed rooms, admin UI (`/mgmt-admin`), invites |
| Common library | [edumeet-common](https://github.com/edumeet/edumeet-common) | TypeScript | — | used by room-server and media-node |
| Minimal Docker deployment | [edumeet](https://github.com/edumeet/edumeet) (this repo, `run-first.sh`) | compose, nginx, coturn | — | quick install without login: client, room server, media node |
| Full Docker deployment | [edumeet-docker](https://github.com/edumeet/edumeet-docker) | compose, nginx, Keycloak, coturn, PostgreSQL | — | production-like testing including management server and login |

The management server is optional. Without it, the room server runs unmanaged rooms using `defaultRoomSettings` from its config, which is enough for most media and UI work.

---

## 2. Requirements

| Need | Why / notes |
|---|---|
| Linux or macOS | Windows: use WSL2 |
| **Node.js 24** | `edumeet-management-server` declares `"engines": { "node": ">= 24.0.0" }`; use 24 for all repos. [nvm](https://github.com/nvm-sh/nvm) makes switching easy |
| **Yarn 4** via Corepack | every repo pins Yarn 4 (`packageManager` in `package.json`). Run `corepack enable` once per Node version. If `yarn -v` prints `1.x` inside a repo, Corepack isn't enabled |
| Docker with Compose v2 | for PostgreSQL (and optionally the full docker stack) |
| git | SSH access to GitHub if you want to push |
| `python3`, `make`, `g++` | only if mediasoup can't download a prebuilt worker for your platform and has to compile it |
| A Chromium-based browser or Firefox | Chrome DevTools has the best WebRTC tooling (`chrome://webrtc-internals`) |

---

## 3. Quick start (recommended)

[dev-workspace/](dev-workspace/) in this repo holds a bootstrap script plus the shared files for the workspace folder. The workspace is a plain folder that holds all repos side by side.

Use a **new, empty workspace directory**. Copying the template into an existing
directory can overwrite its `.vscode/`, `dev/`, `.nvmrc`, `bootstrap.sh` and
other files. The template also uses the fixed Docker container name
`edumeet-dev-db` and host port 5432; check for conflicts before starting it.

```bash
mkdir -p ~/src && mkdir ~/src/edumeet-workspace && cd ~/src/edumeet-workspace &&
  git clone https://github.com/edumeet/edumeet.git &&
  cp -a edumeet/dev-workspace/. . && ./bootstrap.sh
```

For SSH clones of the component repositories, replace the last command with
`GIT_BASE=git@github.com:edumeet ./bootstrap.sh`.

The script:
1. Installs and selects Node 24 from `.nvmrc` and enables Corepack.
2. Clones the five repos (it skips any that already exist).
3. Runs `yarn install --immutable` in each.
4. Makes the workspace's own token key pair and super-admin password in `.dev-secrets/` (readable by you only). The management server refuses the ones published with eduMeet.
5. Writes the four local config files described in section 4. It never overwrites existing ones, and all four are gitignored in their repos.
6. Starts PostgreSQL (`dev/docker-compose.yml`), attempts the management-server
   migrations and sets the super-admin password.

The admin login is `edumeet-admin@localhost` with the password in `.dev-secrets/room-server.env`.
The bootstrap script can hide migration errors, so verify migrations separately:

```bash
(cd edumeet-management-server && ../dev/with-node.sh yarn migrate)
```

Do not rerun bootstrap casually on an existing workspace: it preserves existing
config files but resets the database super-admin password to the value in
`.dev-secrets/room-server.env`. Inspect the script and back up any data first.
Then continue with [section 5, Run the stack](#5-run-the-stack).

---

## 4. Manual setup (what the script does, and why)

### 4.1 Clone and install

```bash
cd ~/src/edumeet-workspace
for r in common client room-server media-node management-server; do
  git clone git@github.com:edumeet/edumeet-$r.git
  (cd edumeet-$r && yarn install --immutable)
done
```

### 4.2 PostgreSQL

```bash
docker run -d --name edumeet-dev-db -p 127.0.0.1:5432:5432 \
  -e POSTGRES_PASSWORD=edumeet -e POSTGRES_DB=edumeet postgres:18-alpine
```
Wait for PostgreSQL to be ready. Configure the signing key in the next section
before running migrations; the management server rejects the published example key.

### 4.3 Config files

Every file below is gitignored in its repo; don't commit them.

**`edumeet-client/public/config/config.js`**
```js
var config = {
	developmentPort: 8443,                 // dev builds (yarn start) use this port for the room server
	loginEnabled: true,
	managementUrl: 'http://localhost:3030',
};
```
The client connects to `wss://<page hostname>:<developmentPort>` in development and `productionPort` in production builds. It only uses `serverHostname` when that's set. All options are in `public/config/config.example.js` and the [client configuration reference](https://github.com/edumeet/edumeet-client/blob/main/docs/configuration.md).

**`edumeet-room-server/config/config.json`**: copy `config/config.example.json` and change:
```jsonc
{
	"tls": { … keep as in the example … },          // keep it, see below
	"managementService": {
		"host": "http://localhost:3030",
		"jwtPublicKeys": [ "<your public key>" ]         // see the management server's local.json below
	},
	"mediaNodes": [{
		"hostname": "localhost", "port": 3000, "secret": "devsecret",
		"latitude": 63.43, "longitude": 10.39, "country": "NO"
	}]
}
```
- **Keep `tls`.** Without it the room server speaks plain `ws://`, and the client page is served over `https://`.
- **TURN is optional.** Without `turnHostname` and `turnports` the room server sends clients no TURN server, which is fine on one machine or a LAN.
- To work without the management server, remove `managementService` entirely.

**`edumeet-management-server/config/local.json`**
```json
{
	"origins": ["http://localhost:3030", "https://localhost:4443"],
	"authentication": { "secret": "<your private key>" }
}
```
- `origins` is the socket.io CORS list. `default.json` only allows `http://localhost:3030`, so without this file the client on :4443 can't open the management server's socket.
- `authentication.secret` is the private key the management server signs tokens with. The key pair in `default.json` is public, so the management server refuses to start with it. Make your own pair. This prints both keys as JSON strings, ready to paste: the private key goes here, the public key into the room server's `jwtPublicKeys`.
  ```bash
  node -e "const k = require('crypto').generateKeyPairSync('rsa', { modulusLength: 2048 }); console.log(JSON.stringify({ private: k.privateKey.export({ type: 'pkcs8', format: 'pem' }), public: k.publicKey.export({ type: 'spki', format: 'pem' }) }, null, 1))"
  ```
- With a local identity provider on `http://localhost`, also add `"oauthPrivateHosts": ["localhost"]`. Otherwise the management server only accepts https URLs on public addresses for a tenant's sign-in.

**`edumeet-management-server/config/test.json`**
```json
{ "postgresql": { "connection": "postgres://postgres:edumeet@localhost:5432/edumeet_test" } }
```
`yarn test` runs migrations and creates and removes tenants, rooms and bot credentials. Without this file it does that in your **dev** database. Create the test database once:
```bash
docker exec edumeet-dev-db createdb -U postgres edumeet_test
```

Before running tests, verify that `config/test.json` and any configuration
overrides point to the separate test database. Bootstrap preserves an existing
`config/test.json`; it does not check whether that file is safe.

With `config/local.json` in place, run the migrations and set the super-admin's
password (at least 12 characters). The first migration's published password is
refused at sign-in. The room server uses the new password too.
```bash
cd ~/src/edumeet-workspace/edumeet-management-server
yarn compile
yarn migrate
yarn set-password edumeet-admin@localhost
```

---

## 5. Run the stack

Start in this order, each in its own terminal opened at the workspace root,
all with Node 24. If using nvm, run `nvm use 24` in each terminal first;
bootstrap's Node selection does not change your parent shell.

```bash
# 1. management server (auto-restarts on change)
cd edumeet-management-server && TRUST_PROXY=false yarn dev

# 2. media node
cd edumeet-media-node && LOG_LEVEL=info yarn start --ip 127.0.0.1 --secret devsecret --numberOfWorkers 2

# 3. room server, using the credentials generated by bootstrap.sh
set -a && . .dev-secrets/room-server.env && set +a &&
  cd edumeet-room-server && NODE_TLS_REJECT_UNAUTHORIZED=0 LOG_LEVEL=info yarn start

# 4. client (hot reload)
cd edumeet-client && yarn start
```

For manual setup, instead of sourcing `.dev-secrets/room-server.env`, export
`MANAGEMENT_USERNAME` and the password you set for that account in the room
server's terminal. Avoid putting the password in shell history.

The commands use these options:

| Option | Meaning |
|---|---|
| `--ip` | address the media node listens on and, unless `--announcedIp` is set, announces to browsers. `127.0.0.1` only works on the same machine. See [testing from other devices](docs/development-testing.md#testing-from-other-devices-on-your-network). |
| `--secret` | must match `mediaNodes[].secret` in the room-server config. The media node does not start without a secret, and the room server does not start with an empty one. Outside development, set `MEDIA_SECRET` in the environment instead: other accounts on the host can read a command line |
| `--numberOfWorkers` | mediasoup worker processes; the default is one per CPU core, which is more than you need in dev |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` | disables TLS certificate verification for this Node process; use only in an isolated development environment |
| `LOG_LEVEL` | log level for room-server and media-node (`trace`, `debug`, `info`, `warn`, `error`). The old `DEBUG=edumeet:*` has **no effect** anymore |

`yarn start` in room-server and media-node compiles TypeScript first (`tsc --build`), so **restart them after code changes**. The client (Vite) and management server (nodemon) reload by themselves.

### First run in the browser
1. Open **https://localhost:8443** and accept the self-signed certificate. Otherwise the client's websocket to the room server fails silently. Repeat after clearing browser data.
2. Open **https://localhost:4443/test** and accept that certificate too.
3. Join. Open the same URL in a second window or profile to get a second participant.

### Check that it works
- [ ] Two participants see and hear each other.
- [ ] Two video elements play in each window (`chrome://webrtc-internals` shows inbound and outbound RTP).
- [ ] https://localhost:4443/mgmt-admin lets you log in as `edumeet-admin@localhost` with your password.

---

## 6. Day-to-day work

### Tests and lint

| Repo | Unit tests | Lint |
|---|---|---|
| client | `yarn test` (vitest) | `yarn lint` |
| room-server | `yarn test:unit` (jest) | `yarn lint` |
| media-node | `yarn test:unit` (jest) | `yarn lint` |
| management-server | `yarn test` (mocha; runs migrations first, needs `config/test.json`, see 4.3) | `yarn lint` |
| common | `yarn test` | — |

### Changing edumeet-common
room-server and media-node depend on `github:edumeet/edumeet-common#<tag>`. To test local changes, add a temporary resolution in the consuming repo's `package.json`:
```json
"resolutions": { "edumeet-common": "portal:../edumeet-common" }
```
Run `yarn install`, then `yarn build` in `edumeet-common`, and restart the consumer. Don't commit the resolution; release a new common tag instead.

### Database
```bash
docker exec -it edumeet-dev-db psql -U postgres -d edumeet     # shell
cd edumeet-management-server && yarn migrate:make <name>        # new migration
```

## More development guides

- <a name="7-testing-from-other-devices-on-your-network"></a>
  [Test from other devices](docs/development-testing.md#testing-from-other-devices-on-your-network)
- <a name="8-production-like-testing-edumeet-docker-login-oidc-and-real-networks"></a>
  <a name="host-and-dns"></a><a name="configuration-utilsrun-me-firstsh-is-interactive-and-needs-jq-and-ack"></a>
  <a name="login-through-keycloak-or-any-oidc-provider"></a><a name="nginx-configsproxynginxconftemplate"></a>
  <a name="certificates"></a><a name="router-port-forwards-host-behind-nat"></a>
  [Test with the full Docker deployment](docs/production-like-testing.md)
  for OIDC, TURN and NAT, with [edumeet-docker](https://github.com/edumeet/edumeet-docker#readme)
  and its networking and authentication guides.
- For the separate minimal deployment, see its
  [firewall and TURN guidance](docs/minimal-deployment.md#networking).
- <a name="9-automated-browser-tests-with-fake-media"></a>
  [Automate browser tests](docs/development-testing.md#automated-browser-tests-with-fake-media)
- <a name="10-troubleshooting"></a><a name="11-known-upstream-issues-found-during-setup"></a>
  [Troubleshooting](docs/development-testing.md#troubleshooting)

---

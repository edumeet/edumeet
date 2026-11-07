# eduMEET developer setup

This guide gets the whole eduMEET 4.x stack running on your machine from source: client, room server, media node and management server. It also covers testing with real devices and login, and the problems you're likely to hit. It works with any editor; for a ready-made VS Code setup see [DEVELOPMENT-VSCODE.md](DEVELOPMENT-VSCODE.md).

How to propose changes (issues first, forks, pull requests to `main`) is described in each component's `CONTRIBUTING.md`, for example [edumeet-room-server/CONTRIBUTING.md](https://github.com/edumeet/edumeet-room-server/blob/main/CONTRIBUTING.md).

Last checked against the `main` branches of November 2026 (management-server `8fb1bbe`, room-server `6b0a786`, media-node `3254b3f`, client `4d1faf7`, common `87be894`).

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

```bash
mkdir -p ~/src/edumeet && cd ~/src/edumeet
git clone https://github.com/edumeet/edumeet.git
cp -a edumeet/dev-workspace/. .              # bootstrap.sh, .nvmrc, dev/, .vscode/
./bootstrap.sh                               # or: GIT_BASE=git@github.com:edumeet ./bootstrap.sh
```

The script:
1. Installs and selects Node 24 from `.nvmrc` and enables Corepack.
2. Clones the five repos (it skips any that already exist).
3. Runs `yarn install --immutable` in each.
4. Writes the four local config files described in section 4. It never overwrites existing ones, and all four are gitignored in their repos.
5. Starts PostgreSQL (`dev/docker-compose.yml`) and runs the management-server migrations.

Then continue with [section 5, Run the stack](#5-run-the-stack).

---

## 4. Manual setup (what the script does, and why)

### 4.1 Clone and install

```bash
cd ~/src/edumeet
for r in common client room-server media-node management-server; do
  git clone git@github.com:edumeet/edumeet-$r.git
  (cd edumeet-$r && yarn install --immutable)
done
```

### 4.2 PostgreSQL

```bash
docker run -d --name edumeet-dev-db -p 127.0.0.1:5432:5432 \
  -e POSTGRES_PASSWORD=edumeet -e POSTGRES_DB=edumeet postgres:18-alpine
cd edumeet-management-server && yarn migrate
```

The first migration creates the super-admin **`edumeet-admin@localhost` / `supersecret`**. The management server uses it, and so does the room server to log in to it.

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
The client connects to `wss://<page hostname>:<developmentPort>` in development and `productionPort` in production builds. It only uses `serverHostname` when that's set. All options are in `public/config/config.example.js` and the client README.

**`edumeet-room-server/config/config.json`**: copy `config/config.example.json` and change:
```jsonc
{
	"tls": { … keep as in the example … },          // keep it, see below
	"managementService": {
		"host": "http://localhost:3030",
		"jwtPublicKeys": [ … keep as in the example … ] // matches the management server's dev key
	},
	"mediaNodes": [{
		"hostname": "localhost", "port": 3000, "secret": "devsecret",
		"latitude": 63.43, "longitude": 10.39, "country": "NO",
		"turnHostname": "",                            // required by the schema, "" = no TURN
		"turnports": []
	}]
}
```
- **Keep `tls`.** Without it the room server speaks plain `ws://`, and the client page is served over `https://`.
- **`turnHostname` must be present.** The config schema (`src/common/schema.ts`) requires it, and the server exits at startup with a `ZodError` without it. Leave it empty to disable TURN; `Peer.ts` skips TURN when it's empty. Don't use an empty `turnports` list with a non-empty `turnHostname`: that produces an ICE server entry with no URLs, which browsers reject.
- To work without the management server, remove `managementService` entirely.

**`edumeet-management-server/config/local.json`**
```json
{ "origins": ["http://localhost:3030", "https://localhost:4443"] }
```
`origins` is the socket.io CORS list. `default.json` only allows `http://localhost:3030`, so without this file the client on :4443 can't open the management server's socket.

**`edumeet-management-server/config/test.json`**
```json
{ "postgresql": { "connection": "postgres://postgres:edumeet@localhost:5432/edumeet_test" } }
```
`yarn test` runs migrations and creates and removes tenants, rooms and bot credentials. Without this file it does that in your **dev** database. Create the test database once:
```bash
docker exec edumeet-dev-db createdb -U postgres edumeet_test
```

---

## 5. Run the stack

Start in this order, each in its own terminal, all with Node 24:

```bash
# 1. management server (auto-restarts on change)
cd edumeet-management-server && TRUST_PROXY=false yarn dev

# 2. media node
cd edumeet-media-node && LOG_LEVEL=info yarn start --ip 127.0.0.1 --secret devsecret --numberOfWorkers 2

# 3. room server (logs in to the management server with these credentials)
cd edumeet-room-server && NODE_TLS_REJECT_UNAUTHORIZED=0 \
  MANAGEMENT_USERNAME=edumeet-admin@localhost MANAGEMENT_PASSWORD=supersecret \
  LOG_LEVEL=info yarn start

# 4. client (hot reload)
cd edumeet-client && yarn start
```

The commands use these options:

| Option | Meaning |
|---|---|
| `--ip` | address the media node listens on **and announces to browsers** in ICE candidates. `127.0.0.1` only works for browsers on the same machine (see section 7) |
| `--secret` | must match `mediaNodes[].secret` in the room-server config |
| `--numberOfWorkers` | mediasoup worker processes; the default is one per CPU core, which is more than you need in dev |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` | the media node uses a self-signed demo certificate; dev only |
| `LOG_LEVEL` | log level for room-server and media-node (`trace`, `debug`, `info`, `warn`, `error`). The old `DEBUG=edumeet:*` has **no effect** anymore |

`yarn start` in room-server and media-node compiles TypeScript first (`tsc --build`), so **restart them after code changes**. The client (Vite) and management server (nodemon) reload by themselves.

### First run in the browser
1. Open **https://localhost:8443** and accept the self-signed certificate. Otherwise the client's websocket to the room server fails silently. Repeat after clearing browser data.
2. Open **https://localhost:4443/test** and accept that certificate too.
3. Join. Open the same URL in a second window or profile to get a second participant.

### Check that it works
- [ ] Two participants see and hear each other.
- [ ] Two video elements play in each window (`chrome://webrtc-internals` shows inbound and outbound RTP).
- [ ] https://localhost:4443/mgmt-admin lets you log in as `edumeet-admin@localhost` / `supersecret`.
- [ ] The management server answers: `curl -s localhost:3030/authentication -H 'Content-Type: application/json' -d '{"strategy":"local","email":"edumeet-admin@localhost","password":"supersecret"}'` returns an `accessToken`.

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

---

## 7. Testing from other devices on your network

The media node announces the `--ip` address to browsers. With `127.0.0.1`, only browsers on your own machine can send media.

1. Start the media node with your LAN address: `--ip 192.168.x.y`.
2. Open `https://192.168.x.y:4443/test` on the other device, then accept the certificate on `https://192.168.x.y:8443` there as well.
3. Rooms and media work; login doesn't, because `managementUrl` points to `localhost`. For login testing use the docker stack (section 8).

Phones need a secure context for camera access. Accepting the self-signed certificates works in most desktop browsers. On phones it's awkward to accept the second one (port 8443) too, so for phone testing a deployment with a real certificate is easier (section 8).

---

## 8. Production-like testing: edumeet-docker, login (OIDC) and real networks

For login through an identity provider, TURN, NAT and many participants, run [edumeet-docker](https://github.com/edumeet/edumeet-docker) on a test machine. The minimal stack in this repo (`./run-first.sh` + `docker compose up -d`, see [README.md](README.md#installation)) is enough for media and network tests without login, and most of the host, certificate and router notes below apply to it as well. Point it at your branches with `BRANCH_*` in `.env`, or build images from local code. These are the problems we hit doing that, roughly in setup order.

### Host and DNS
- **You need two host names, not IPs.** nginx routes port 443 by TLS SNI: `MAIN_DOMAIN` goes to the web app, `MEDIA_DOMAIN` to TURN over TLS. Browsers send no SNI for IP addresses. On a LAN without DNS, use a wildcard-DNS service such as `edumeet.192-168-1-50.sslip.io` / `turn.192-168-1-50.sslip.io`. Some routers' DNS-rebind protection blocks such answers; test with `getent hosts`.
- **Ports 80 and 443 must be free on the host.** Check with `ss -tlnp` before starting, because home-automation software or a local web server often already uses them.
- **Disk:** the images take about 4.3 GB. If `/var/lib/docker` is on a small partition, move Docker's `data-root` before pulling.
- **Pull, don't build, unless you're testing your own branches.** Use `docker compose pull` and `docker compose up -d --no-build`. Building every component needs considerably more space and time.

### Configuration (`utils/run-me-first.sh` is interactive and needs `jq` and `ack`)
- `MGMT_PUB` in `.env` is substituted into the room server's `config.json` with `envsubst`, so it must keep **literal `\n`** sequences. Single quotes in `.env` (`MGMT_PUB='-----BEGIN…\n…'`) do that.
- `MEDIA_SECRET` must be identical for the media node and the `mediaNodes` entry in `configs/server/config.json.template`.
- The coturn relay range is 50000–60000 by default. Narrow it, e.g. `--min-port=50000 --max-port=50249`, if you have to forward it through a NAT router.
- When the host is behind NAT, set `LISTEN_IP` to the LAN address and `EXTERNAL_IP` to the public one. The media node announces `EXTERNAL_IP`; coturn needs `--external-ip=PUBLIC/LAN`.

### Login through Keycloak (or any OIDC provider)
1. In Keycloak, create a realm and a **confidential** client. `configs/kc/dev.json` is an importable example: mount it at `/opt/keycloak/data/import/` and start Keycloak with `start --import-realm`. **That example's client secret and test-user password are public in the repo**, so change both before exposing the host. Also turn on brute-force protection and turn off "direct access grants".
2. In the management server (admin UI or REST), create a **tenant**, a **tenant FQDN** (the host name users open) and a **tenant OAuth** entry. The OAuth entry needs `key`, `secret`, `authorize_url`, `access_url`, `profile_url` and `end_session_endpoint`, plus:
   - **`redirect_uri`: set it explicitly** to `https://<MAIN_DOMAIN>/mgmt/oauth/tenant/callback`. If it's empty, the management server builds a callback URL from its own listen address (`http://0.0.0.0:3030/oauth/tenant/callback`), and the identity provider rejects it. The login then stops at the provider without a login form.
3. **The first login after the OAuth config is created, and after every management-server restart, fails with HTTP 500** ("Reloading configuration try again!", `src/hooks/dynamicOAuth.ts`). The server rebuilds its OAuth setup on that request, and the second attempt works. Changing an existing OAuth entry only takes effect after a restart, because the config is cached in memory.
4. Sign-in also checks that the page's origin is a registered tenant FQDN (`src/auth/allowedOrigin.ts`). A host name that's missing from the tenant's FQDNs fails with "Sign in was started from a site that does not belong to this tenant".

### nginx (`configs/proxy/nginx.conf.template`)
- **Restricting admin pages** (`/mgmt-admin`, `/kc/admin`, `/kc/realms/master`) with `allow`/`deny`: put the locations in the **HTTPS server** (`listen 4443 ssl proxy_protocol`), not the port-80 redirect server. Inside those locations use `proxy_pass https://keycloak:8443;` **without a path**. Copying `proxy_pass https://keycloak:8443/kc;` from the `/kc` location makes nginx swap the matched prefix, so `/kc/admin/` becomes `/kc/` and the page redirects to itself until the browser gives up.
- The real client IP arrives through the PROXY protocol (`real_ip_header proxy_protocol`), so `allow` rules see outside visitors' real addresses. LAN clients that use the public name through the router's NAT loopback show up with **the router's public IP**, so add that to the allow list.
- Blocking `/mgmt-admin` is only cosmetic: the admin UI is part of the normal client bundle, and the `/mgmt` API has to stay public. Real protection is a strong super-admin password plus the management server's login throttle (`TRUST_PROXY=true` behind nginx).

### Certificates
- Without public DNS, create a small local CA and give the server certificate SANs for both names. Import the CA into your browser once; TURN over TLS also needs a certificate the browser trusts.
- For Let's Encrypt, forward TCP 80 and 443, test with `certbot … --dry-run` first (staging, no rate limits), and set `USE_CERTBOT=true` so the certbot container renews every 12 hours.

### Router port forwards (host behind NAT)

| Port | Protocol | Purpose |
|---|---|---|
| 80, 443 | TCP | web, signaling, TURN over TLS (by SNI), ACME |
| 40000–40249 | **UDP and TCP** | media node |
| 3478 | **UDP and TCP** | TURN |
| 50000–50249 (narrowed) | UDP | TURN relay |

Routers create a separate rule per protocol: a UDP forward doesn't cover TCP. Keep 3000 (media-node control) closed; only the room server talks to it.

---

## 9. Automated browser tests with fake media

Headless Chrome can join rooms with a synthetic camera and microphone, which is useful for smoke tests, load tests and checking network paths:

```js
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: [
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--ignore-certificate-errors' ] });
```

Notes for writing such tests against the current client:
- The name field on the join dialog is the last visible `<input>` (`input:not([aria-hidden="true"]):not([type="hidden"])`). The first inputs are device selectors.
- The join button's text is `JOIN`, and it stays disabled while the media preview is loading. Wait about 2–3 s.
- To read media stats, wrap `RTCPeerConnection` in `page.evaluateOnNewDocument` and collect `getStats()`: `inbound-rtp` and `outbound-rtp` bytes, `packetsLost`, and the nominated `candidate-pair`.
- To force TURN, create the connection with `iceTransportPolicy: 'relay'`. To test one TURN transport, filter `iceServers[].urls` (`^turns:`, `transport=tcp`, …).
- With TURN, the client-to-TURN transport is in the local candidate's `relayProtocol` (`udp`, `tcp`, `tls`), not in `protocol`. When coturn and the media node share a host, the selected pair can show the relay port as a `prflx` candidate; that's still TURN.
- Headless Chrome's fake camera showed about 2.4% `packetsLost` on every path, including TCP and TLS. Don't read that as a network problem.

---

## 10. Troubleshooting

| Problem | Cause / fix |
|---|---|
| Join hangs, no error | The room-server certificate hasn't been accepted. Open https://localhost:8443 once |
| Room server exits at start with `ZodError … mediaNodes … turnHostname` | Add `"turnHostname": ""` (section 4.3) |
| `EADDRINUSE` on 3000, 3030, 4443 or 8443 | An old process is still running: `fuser -k 3000/tcp 3030/tcp 4443/tcp 8443/tcp` |
| Management server: unsupported engine, or syntax errors | Wrong Node version; use 24 |
| `yarn` is 1.x | `corepack enable` (once for each Node version) |
| Room server ignores `CONFIG_FILE=…` | Known quirk: `getConfig()` in `src/Config.ts` always reads `./config/config.json` (listen port, TLS, media nodes). `CONFIG_FILE` only changes the file that's validated and live-reloaded |
| No logs despite `DEBUG=edumeet:*` | Use `LOG_LEVEL=debug` |
| Other devices connect but get no media | The media node was started with `--ip 127.0.0.1` (section 7) |
| Management tests changed your dev data | Add `config/test.json` (section 4.3) |
| OIDC login: HTTP 500 on first try | Expected after OAuth config changes or a restart; try again (section 8) |
| OIDC login stops at the provider, which reports an invalid redirect URI | Set `redirect_uri` on the tenant OAuth entry (section 8) |
| `/kc/admin` says "This page isn't working" (redirect loop) | nginx `proxy_pass` with a path inside a sub-location (section 8) |

## 11. Known upstream issues found during setup
- management-server: the first OAuth request after a config change or restart always returns 500 (`dynamicOAuth.ts` throws on purpose to reload).
- management-server: `redirect_uri` falls back to an address built from `host`/`port` (`http://0.0.0.0:3030/…`), which no provider can reach.
- room-server: `CONFIG_FILE` is honored by `ConfigLoader` but not by `getConfig()`, which supplies the listen port, TLS and media nodes.
- room-server: `turnHostname` is required by the schema even when no TURN is used.
- edumeet-docker: `run-me-first.sh` is interactive only and needs `jq` and `ack`; Keycloak 26 warns that `KEYCLOAK_ADMIN*` is deprecated (`KC_BOOTSTRAP_ADMIN_*`).

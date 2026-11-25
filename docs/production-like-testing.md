# Production-like testing with edumeet-docker

For login through an identity provider, TURN, NAT and many participants, run
[edumeet-docker](https://github.com/edumeet/edumeet-docker) on a test machine.
The [minimal deployment](minimal-deployment.md) in this repository is enough for
media and network tests without login, and most of the host, certificate and
router notes below apply to it as well. Point edumeet-docker at your branches
with `BRANCH_*` in `.env`, or build images from local code. These are the
problems we hit doing that, roughly in setup order.

## Host and DNS

- **You need two host names, not IPs.** nginx routes port 443 by TLS SNI:
  `MAIN_DOMAIN` goes to the web app, `MEDIA_DOMAIN` to TURN over TLS. Browsers
  send no SNI for IP addresses. On a LAN without DNS, use a wildcard-DNS service
  such as `edumeet.192-168-1-50.sslip.io` / `turn.192-168-1-50.sslip.io`. Some
  routers' DNS-rebind protection blocks such answers; test with `getent hosts`.
- **Ports 80 and 443 must be free on the host.** Check with `ss -tlnp` before
  starting, because home-automation software or a local web server often
  already uses them.
- **Disk:** the images take about 4.3 GB. If `/var/lib/docker` is on a small
  partition, move Docker's `data-root` before pulling.
- **Pull, don't build, unless you're testing your own branches.** Use
  `docker compose pull` and `docker compose up -d --no-build`. Building every
  component needs considerably more space and time.

## Configuration

`utils/run-me-first.sh` is interactive and needs `jq` and `ack`.

- `MGMT_PUB` in `.env` is substituted into the room server's `config.json` with
  `envsubst`, so it must keep **literal `\n`** sequences. Single quotes in
  `.env` (`MGMT_PUB='-----BEGIN…\n…'`) do that.
- `MEDIA_SECRET` must be identical for the media node and the `mediaNodes` entry
  in `configs/server/config.json.template`.
- The coturn relay range is 50000-60000 by default. Narrow it if you have to
  forward it through a NAT router: `command: --min-port=50000 --max-port=50249`
  for the `turn` service in `docker-compose.override.yml`. Options there are
  added after the defaults; leave out `-n` and `--static-auth-secret`.
- When the host is behind NAT, set `LISTEN_IP` to the LAN address (or
  `0.0.0.0`), `EXTERNAL_IP` to the public one and `LOCAL_IP` to the host's LAN
  address. The media node announces `EXTERNAL_IP`; coturn maps it to `LOCAL_IP`
  and allows only these two of the private addresses as relay peers. `LOCAL_IP`
  must never be `0.0.0.0`.
- `.env` holds the deployment's secrets: keep it readable by its owner only
  (`chmod 600 .env`), and run `docker compose` as that user.

## Login through Keycloak (or any OIDC provider)

1. In Keycloak, create a realm and a **confidential** client.
   `configs/kc/dev.json` is an importable example: mount it at
   `/opt/keycloak/data/import/` and start Keycloak with `start --import-realm`.
   **That example's client secret and test-user password are public in the
   repository**, so change both before exposing the host. Also turn on
   brute-force protection and turn off "direct access grants".
2. In the management server (admin UI or REST), create a **tenant**, a **tenant
   FQDN** (the host name users open) and a **tenant OAuth** entry. The OAuth
   entry needs `key`, `secret`, `authorize_url`, `access_url`, `profile_url` and
   `end_session_endpoint`, plus:
   - The three URLs must use `https` and must not point to a private or local
     address. For an identity provider on an internal network, list its host
     name in `oauthPrivateHosts` in the management server's config.
   - **`redirect_uri`**: `https://<MAIN_DOMAIN>/mgmt/oauth/tenant/callback`,
     which must also be a valid redirect URI of the client at the identity
     provider. The admin UI fills it in; when it is empty, the management server
     builds the same address from `MGMT_URL`, which edumeet-docker sets to
     `https://<MAIN_DOMAIN>/mgmt`.
3. Changes to a tenant OAuth entry apply at once; the management server does not
   need a restart.
4. Sign-in also checks that the page's origin is a registered tenant FQDN
   (`src/auth/allowedOrigin.ts` in the management server). A host name that is
   missing from the tenant's FQDNs fails with "Sign in was started from a site
   that does not belong to this tenant".

## nginx

In `configs/proxy/nginx.conf.template`:

- **Restricting admin pages** (`/mgmt-admin`, `/kc/admin`, `/kc/realms/master`)
  with `allow`/`deny`: put the locations in the **HTTPS server**
  (`listen 4443 ssl proxy_protocol`), not the port-80 redirect server. Inside
  those locations use `proxy_pass https://keycloak:8443;` **without a path**.
  Copying `proxy_pass https://keycloak:8443/kc;` from the `/kc` location makes
  nginx swap the matched prefix, so `/kc/admin/` becomes `/kc/` and the page
  redirects to itself until the browser gives up.
- The real client IP arrives through the PROXY protocol
  (`real_ip_header proxy_protocol`), so `allow` rules see outside visitors' real
  addresses. LAN clients that use the public name through the router's NAT
  loopback show up with **the router's public IP**, so add that to the allow
  list.
- Blocking `/mgmt-admin` is only cosmetic: the admin UI is part of the normal
  client bundle, and the `/mgmt` API has to stay public. Real protection is a
  strong super-admin password plus the management server's login throttle
  (`TRUST_PROXY=true` behind nginx).

## Certificates

- Without public DNS, create a small local CA and give the server certificate
  SANs for both names. Import the CA into your browser once; TURN over TLS also
  needs a certificate the browser trusts.
- For Let's Encrypt, forward TCP 80 and 443, test with `certbot … --dry-run`
  first (staging, no rate limits), and set `USE_CERTBOT=true` so the certbot
  container renews every 12 hours.

## Router port forwards (host behind NAT)

| Port | Protocol | Purpose |
|---|---|---|
| 80, 443 | TCP | web, signaling, TURN over TLS (by SNI), ACME |
| 40000-40249 | **UDP and TCP** | media node |
| 3478 | **UDP and TCP** | TURN |
| 50000-50249 (narrowed) | UDP | TURN relay |

The minimal deployment in this repository offers TURN only over TLS on
**443/tcp** (shared with the web ports by SNI), so it needs no 3478 forward. The
TURN relay ports stay host-internal: coturn relays only to the media node on the
same host.

Routers create a separate rule per protocol: a UDP forward does not cover TCP.
Keep 3000 (media-node control) closed; only the room server talks to it.

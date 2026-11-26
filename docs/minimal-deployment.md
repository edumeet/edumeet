# Minimal Docker deployment

This guide is for the Compose setup in the [eduMEET repository](../README.md).
It runs the client, room server, media node, Nginx and coturn, without the
management server, managed rooms or login. For those features, use the separate
[full Docker deployment](https://github.com/edumeet/edumeet-docker#readme).

These instructions describe the repository's current `main` branch, including
the changes merged on November 24, 2026. Older checkouts and deployments can
behave differently; check the configuration for the version you deploy.

## Prerequisites

- Docker, the `docker-compose` command, curl and OpenSSL. The current setup
  script specifically calls `docker-compose`.
- Two distinct domain names pointing to the server's public IP: one for the
  website and one for TURN.
- A host address the room server can reach, and the public address announced to
  clients. Behind NAT these can differ. `LISTEN_IP` must not be `0.0.0.0`.
- Firewall and, if applicable, router rules from [Networking](#networking).

## Install and start

```bash
git clone https://github.com/edumeet/edumeet.git
cd edumeet
./run-first.sh
docker-compose up -d
```

The script asks for the two domains, the listen and public IPs, an email address,
and optional client settings. It generates a media secret and media-node
certificate, then requests a Let's Encrypt certificate. The email prompt is
used for Certbot registration when supplied; if left blank, Certbot registers
without an email address. Older checkouts may need the fix for
[issue #1127](https://github.com/edumeet/edumeet/issues/1127).

**Do not rerun the setup script casually on an existing installation.** It
rewrites `.env` and generates a new media secret; it can also replace existing
certificate data after confirmation. Back up the existing configuration and
certificates first.

Open the main domain in a browser. Join the same room from two browsers or
devices and check that both can hear and see each other.

## Networking

| Port(s) | Protocol | Purpose | Public firewall |
| --- | --- | --- | --- |
| 80 | TCP | HTTP redirect and certificate validation | Allow |
| 443 | TCP | HTTPS, signaling and TURN over TLS | Allow |
| 40000-40249 | TCP and UDP | Default media-node range | Recommended for direct media |

Apply the public rules to the server or cloud firewall and any NAT forwarding
rules. The media range must match the configured values; TCP and UDP need
separate rules.

Current `main` advertises TURN over TLS on **443/TCP** only. Nginx routes it
by domain name alongside HTTPS. Coturn's listener on **3478** and its default
**50000-60000/UDP** relay range are used between services on this host, not
for the browser's TURN-over-TLS connection. Relay traffic may stay internal in
this setup, but routing and NAT can affect it. Test relayed calls before
restricting the relay range. Restrict the coturn listener and media-node
control port **3000** to the services that need them. Local firewall rules
must still permit the necessary service-to-service traffic.

Older versions advertised TURN over UDP incorrectly; see
[issue #1128](https://github.com/edumeet/edumeet/issues/1128). The current
fix removes that UDP path rather than changing it to 443. After updating the
room-server template, recreate the container to refresh its generated config:

```bash
docker-compose up -d --force-recreate edumeet-room-server
```

## Certificates

`run-first.sh` requests a certificate covering both domains using HTTP
validation. Both domains must resolve to this server and port 80/TCP must be
reachable for that validation. The Compose certbot service periodically runs
renewal; check its logs and confirm that renewal succeeds in your environment.

The setup also creates a separate certificate for the media node, pinned by the
room server. After changing `LISTEN_IP`, run `./media-node-cert.sh` and then
`docker-compose up -d` to apply the updated environment to affected services.

### HTTPS only (HSTS)

The proxy sends `Strict-Transport-Security: max-age=31536000` with every HTTPS
answer (`proxy/nginx.conf.template`). A browser that has visited the site uses
HTTPS for this host name from then on, for a year after its last visit. Without
the header, an attacker on the visitor's network can answer a plain HTTP request
for the site with a page of their own, before the redirect to HTTPS.

For such a browser:

- Nothing on this host name opens over plain HTTP any more, on any port. If
  another service is reached as `http://<the same name>:<port>`, give it HTTPS
  or another host name first, or switch the header off.
- A certificate error cannot be passed. If the certificate expires, the browser
  shows an error without the button to continue, so check that the renewal works.

Subdomains and other host names are not affected. To switch the header off
before any browser has seen it, comment the `add_header` line out and restart
the proxy. After that, set it to `max-age=0` and leave it like that for as long
as visitors may come back; removing the line does not make browsers forget the
policy. An installation with its own copy of the template gets the header only
when it takes the line over.

## Configuration and backup

- Client settings are in `client/config.js`; the room server generates its
  configuration from `room-server/config.json.template` at startup.
- `.env` contains the media secret. Keep it readable only by its owner.
- The minimal setup has no management database. Back up `.env`, the client and
  room-server configuration, and the certificate data under `certbot/` and
  `certs/` securely. The backup contains secrets and private keys.

## Troubleshooting

- **Website or certificate challenge unavailable:** check DNS, the proxy logs,
  and TCP ports 80 and 443.
- **The browser shows a certificate error without a way to continue, or changes
  `http://` to `https://` for another service on the same host name:** the proxy
  sends an HSTS header, see [HTTPS only (HSTS)](#https-only-hsts).
- **Page loads but there is no media:** check the announced public IP, the
  media port range, NAT forwarding and the media-node logs.
- **TURN relay fails:** check the TURN domain, TLS certificate, 443/TCP and
  the internal coturn and media-node paths. Current `main` does not offer
  TURN over UDP.

Inspect the services with `docker-compose ps` and
`docker-compose logs <service>`. Stop them with `docker-compose down`.

# Suspicious clients

The room-server can write the addresses of clients that behave unusually to a file: clients that open and close connections again and again, that the room-server refuses because of its limits, or that do not read what they are sent. The room-server does not block anyone. You decide what to do with the file, for example a temporary firewall ban.

The function is off. It starts when you set a file in the room-server configuration.

## Before you turn it on

The room-server must see the real address of each client. Make sure that:

- your reverse proxy overwrites `x-forwarded-for` with the address it sees, and does not append to a header from the client
- clients can reach the room-server only through your reverse proxy. In this compose setup, the room-server port is published on `127.0.0.1` only
- a reverse proxy that connects to the room-server from a public address is listed in `trustedProxies` in the room-server configuration. Private networks and loopback are trusted by default

The proxy of this compose setup and of edumeet-docker meets these points. You do not have to change anything.

## Turn it on

1. Add to `room-server/config.json.template`:

   ```json
   "suspiciousClients": {
       "file": "/usr/src/app/suspicious/suspicious-ips.log"
   }
   ```

2. Mount a folder of the host for the file. In `docker-compose.yml`, add to the volumes of `edumeet-room-server`:

   ```yaml
   - ./data/suspicious:/usr/src/app/suspicious
   ```

3. Run `docker compose up -d`.

You can change these settings:

| Field | Default | Description |
| :--- | :--- | :--- |
| `file` | | The file that the lines are appended to. Without it, the function is off. |
| `windowSeconds` | `300` | The length of the time window in which events are counted. |
| `shortConnectionSeconds` | `30` | A connection that received the state of a room and lasted less than this counts as short. |
| `maxShortConnections` | `50` | Short connections of one address in one window before it is written. |
| `maxLimitHits` | `10` | Refused requests, and connections closed because the client did not read, of one address in one window before it is written. |

## The file

The room-server writes at most one line for each address in each window. Each line starts with the time (UTC, ISO 8601) and the address. The counts follow:

```
2026-11-12T11:05:00.000Z 203.0.113.7 short_connections=57 limit_hits=3 window=300s
```

The file only grows. Rotate it on the host, for example with logrotate.

## Act on the file

One address can be many people: a university network, or a mobile network that puts many users behind one address. A ban stops all of them. So:

- Look at the file for one or two weeks before a tool acts on it. Then you know what is normal for your service.
- Keep the settings high and the bans short.

An example for fail2ban, which bans a written address for 15 minutes on the web ports:

```ini
# /etc/fail2ban/filter.d/edumeet-suspicious.conf
[Definition]
failregex = <HOST> short_connections=
```

```ini
# /etc/fail2ban/jail.d/edumeet-suspicious.conf
[edumeet-suspicious]
enabled  = true
filter   = edumeet-suspicious
logpath  = /path/to/edumeet/data/suspicious/suspicious-ips.log
maxretry = 1
bantime  = 900
port     = http,https
```

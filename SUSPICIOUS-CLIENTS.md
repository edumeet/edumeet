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

Do these steps in the folder of this compose setup.

1. Add to `room-server/config.json.template`:

   ```json
   "suspiciousClients": {
       "file": "/usr/src/app/suspicious/suspicious-ips.log"
   }
   ```

2. Make the folder and an empty file. In its container, the room-server runs as the user `edumeet` with the uid 1001, so this user must own them:

   ```bash
   mkdir -p data/suspicious
   touch data/suspicious/suspicious-ips.log
   sudo chown -R 1001:1001 data/suspicious
   ```

   If the folder does not exist when the container starts, Docker makes it for root, and the room-server cannot write the file. fail2ban (see below) does not start when the file of a jail does not exist, so make the empty file now. `docker compose exec edumeet-room-server id -u` shows the uid of the room-server.

3. Mount the folder. In `docker-compose.yml`, add to the volumes of `edumeet-room-server`:

   ```yaml
   - ./data/suspicious:/usr/src/app/suspicious
   ```

4. Run `docker compose up -d`.

5. Make sure that the room-server can write to the folder:

   ```bash
   docker compose exec edumeet-room-server sh -c 'touch /usr/src/app/suspicious/.test && rm /usr/src/app/suspicious/.test && echo WRITABLE'
   ```

   The command shows `WRITABLE`. The file stays empty until the room-server writes the first address. If the room-server cannot write it, its log shows `cannot write the suspicious clients file`.

You can change these settings:

| Field | Default | Description |
| :--- | :--- | :--- |
| `file` | | The file that the lines are appended to. Without it, the function is off. |
| `windowSeconds` | `300` | The length of the time window in which events are counted. |
| `shortConnectionSeconds` | `10` | A connection that received the state of a room and lasted less than this counts as short. |
| `maxShortConnections` | `200` | Short connections of one address in one window before it is written. |
| `maxLimitHits` | `10` | Refused requests, and connections closed because the client did not read, of one address in one window before it is written. |

## The file

The room-server writes at most one line for each address in each window. Each line starts with the time (UTC, ISO 8601) and the address. The counts follow:

```
2026-11-12T11:05:00.000Z 203.0.113.7 short_connections=57 limit_hits=3 window=300s
```

### Rotate the file

The file only grows. Rotate it on the host with logrotate. Make the file `/etc/logrotate.d/edumeet-suspicious`:

```
/path/to/edumeet/data/suspicious/suspicious-ips.log {
	weekly
	rotate 8
	compress
	delaycompress
	missingok
	notifempty
	copytruncate
}
```

With `copytruncate`, the file stays in its place, and fail2ban (see below) continues to read it. `sudo logrotate -d /etc/logrotate.d/edumeet-suspicious` shows what logrotate will do, and changes nothing.

## Act on the file

One address can be many people: a university network, or a mobile network that puts many users behind one address. A ban stops all of them. So:

- Look at the file for one or two weeks before a tool acts on it. Then you know what is normal for your service.
- Keep the settings high and the bans short.

### fail2ban

This example bans a written address for 15 minutes. The commands are for Debian and Ubuntu.

1. Install fail2ban:

   ```bash
   sudo apt-get install fail2ban
   ```

2. Make the filter `/etc/fail2ban/filter.d/edumeet-suspicious.conf`:

   ```ini
   [Definition]
   failregex = <HOST> short_connections=
   ignoreregex =
   ```

3. Make the jail `/etc/fail2ban/jail.d/edumeet-suspicious.conf`. Use the version for the place where your reverse proxy runs.

   The reverse proxy runs in Docker, as in this compose setup and in edumeet-docker:

   ```ini
   [edumeet-suspicious]
   enabled   = true
   filter    = edumeet-suspicious
   logpath   = /path/to/edumeet/data/suspicious/suspicious-ips.log
   backend   = polling
   maxretry  = 1
   findtime  = 300
   bantime   = 900
   banaction = iptables-allports
   chain     = DOCKER-USER
   protocol  = all
   ignoreip  = 127.0.0.1/8 ::1
   ```

   Docker sends the traffic to the published ports of containers through the `FORWARD` chain, not through `INPUT`. Thus the default ban of fail2ban, in `INPUT`, does not stop it. For your own rules, Docker has the `DOCKER-USER` chain. This jail blocks all traffic from the address to your containers. The host itself, for example SSH, stays available.

   The reverse proxy runs on the host:

   ```ini
   [edumeet-suspicious]
   enabled   = true
   filter    = edumeet-suspicious
   logpath   = /path/to/edumeet/data/suspicious/suspicious-ips.log
   backend   = polling
   maxretry  = 1
   findtime  = 300
   bantime   = 900
   banaction = iptables-multiport
   chain     = INPUT
   port      = http,https
   protocol  = tcp
   ignoreip  = 127.0.0.1/8 ::1
   ```

   This jail blocks the web ports of the host for the address.

   For both versions:

   - `backend = polling` is necessary. Debian and Ubuntu set `backend = systemd` for all jails. With it, the jail reads the journal and not the file.
   - `maxretry = 1`: the room-server writes an address only when the address went above a limit, so each line is a reason for a ban.
   - Add your own addresses to `ignoreip`, for example the addresses of your office and of your monitoring. Separate them with spaces.

4. Only when the reverse proxy runs in Docker: start fail2ban after Docker. The `DOCKER-USER` chain exists only when Docker runs. Make the file `/etc/systemd/system/fail2ban.service.d/after-docker.conf`:

   ```ini
   [Unit]
   After=docker.service
   ```

5. Start fail2ban with the new jail:

   ```bash
   sudo fail2ban-client -t
   sudo systemctl daemon-reload
   sudo systemctl restart fail2ban
   sudo fail2ban-client status edumeet-suspicious
   ```

   The first command shows `OK: configuration test is successful`. The last command shows the jail and the file. fail2ban adds its rule to the chain when it bans for the first time. When the file has lines, `sudo fail2ban-regex /path/to/edumeet/data/suspicious/suspicious-ips.log /etc/fail2ban/filter.d/edumeet-suspicious.conf` shows that the filter finds them.

6. Test the ban with `203.0.113.7`, an address for documentation that no real client has:

   ```bash
   sudo fail2ban-client set edumeet-suspicious banip 203.0.113.7
   sudo iptables -S f2b-edumeet-suspicious
   sudo fail2ban-client set edumeet-suspicious unbanip 203.0.113.7
   sudo iptables -S f2b-edumeet-suspicious
   ```

   The first `iptables` command shows a `REJECT` rule for `203.0.113.7`. The second shows the chain without it.

To remove a ban before its time ends:

```bash
sudo fail2ban-client set edumeet-suspicious unbanip <address>
```

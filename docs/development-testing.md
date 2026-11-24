# Development: testing and troubleshooting

## Testing from other devices on your network

These steps use the local development setup, not a production deployment.
The media node uses its `--ip` address for listening and, unless
`--announcedIp` is set, for media candidates. With `127.0.0.1`, only browsers
on the same machine can send media.

1. Stop the local media node. Change the node's `hostname` in the room-server
   `config/config.json` from `localhost` to the development machine's LAN IP,
   so the room server can reach the media node at its new listen address.
2. Restart the room server and start the media node with that LAN address,
   for example `--ip 192.168.x.y`. In VS Code, use the `media-node (LAN IP)`
   task instead of `media-node`.
3. Allow the other device to reach the client, room server and media ports on
   the local network. Open `https://<LAN-IP>:8443` and accept the room-server
   certificate, then open `https://<LAN-IP>:4443/test` and join.

The default client configuration points `managementUrl` at `localhost`, so
login from another device needs additional configuration. For OIDC and
production-like network tests, use the
[full Docker deployment](https://github.com/edumeet/edumeet-docker#readme).
Browsers require a secure context for camera and microphone access; a phone
may need a trusted certificate and suitable hostname rather than an IP with
self-signed certificates. Return the room-server hostname to `localhost` when
switching back to the default local media-node task.

---

## Automated browser tests with fake media

Headless Chrome can join rooms with a synthetic camera and microphone, which is useful for smoke tests, load tests and checking network paths:

```js
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: [
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--ignore-certificate-errors' ] });
```

The certificate-bypass flag is for isolated development tests only. Install
Puppeteer and Chrome in the test environment before using this example.

Notes for writing such tests against the current client:
- Wait for media preview and for the join button to become enabled rather than
  relying on a fixed delay. Selectors and displayed text can change with the UI
  and language.
- To read media stats, wrap `RTCPeerConnection` in `page.evaluateOnNewDocument` and collect `getStats()`: `inbound-rtp` and `outbound-rtp` bytes, `packetsLost`, and the nominated `candidate-pair`.
- To force TURN, create the connection with `iceTransportPolicy: 'relay'`. To test one TURN transport, filter `iceServers[].urls` (`^turns:`, `transport=tcp`, …).
- With TURN, the client-to-TURN transport is in the local candidate's `relayProtocol` (`udp`, `tcp`, `tls`), not in `protocol`. When coturn and the media node share a host, the selected pair can show the relay port as a `prflx` candidate; that's still TURN.

---

## Troubleshooting

| Problem | Cause / fix |
|---|---|
| Join hangs, no error | The room-server certificate hasn't been accepted. Open https://localhost:8443 once |
| `EADDRINUSE` on 3000, 3030, 4443 or 8443 | Find the listener with `ss -ltnp`, then stop the specific task or process that owns the port. |
| Management server: unsupported engine, or syntax errors | Wrong Node version; use 24 |
| `yarn` is 1.x | `corepack enable` (once for each Node version) |
| No logs despite `DEBUG=edumeet:*` | Use `LOG_LEVEL=debug` |
| Other devices connect but get no media | Check the media node's LAN listen/announced address, the room-server hostname and firewall rules above. |
| Management tests changed your dev data | Stop testing and verify the test database configuration and overrides in [manual setup](../DEVELOPMENT.md#43-config-files). |
| OIDC login stops at the provider, which reports an invalid redirect URI | Check the redirect URI at the provider and in the management configuration; see [authentication](https://github.com/edumeet/edumeet-docker#configure-authentication). |
| `/kc/admin` redirects in a loop | Check any custom Nginx location and `proxy_pass` configuration. |

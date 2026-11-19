#!/bin/bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

python3 - "$repo_dir" <<'PY'
import json
import os
from pathlib import Path
import re
import subprocess
import sys

root = Path(sys.argv[1])
config = json.loads((root / "room-server/config.json.template").read_text())
turnports = config["mediaNodes"][0]["turnports"]
udp = [entry for entry in turnports if entry["protocol"] == "turn" and entry["transport"] == "udp"]
assert len(udp) == 1 and udp[0]["port"] == 443, "TURN UDP must advertise port 443"
assert any(entry["protocol"] == "turns" and entry["transport"] == "tcp" and entry["port"] == 443
           for entry in turnports), "TURN TLS must still advertise TCP port 443"

nginx = (root / "proxy/nginx.conf.template").read_text().replace("${LISTEN_IP}", "LISTEN_IP")
udp_servers = [block for block in re.findall(r"server\s*\{([^{}]*)\}", nginx)
               if re.search(r"\blisten\s+443\s+udp\s*;", block)]
assert len(udp_servers) == 1, "nginx must listen on UDP port 443"
assert re.search(r"proxy_pass\s+LISTEN_IP:3478\s*;", udp_servers[0]), \
    "nginx must forward UDP to coturn"

env = dict(os.environ, MAIN_DOMAIN="meet.example.test", MEDIA_DOMAIN="turn.example.test",
           LISTEN_IP="127.0.0.1", EXTERNAL_IP="192.0.2.1", LOCAL_IP="192.0.2.1",
           MEDIA_SECRET="test")
compose = json.loads(subprocess.check_output(
    ["docker", "compose", "-f", str(root / "docker-compose.yml"), "config", "--format", "json"],
    env=env))
ports = compose["services"]["proxy"]["ports"]
assert any(port["protocol"] == "udp" and str(port["published"]) == "443" and port["target"] == 443
           for port in ports), "Compose must publish UDP port 443 to the proxy"
print("PASS: minimal deployment TURN UDP configuration")
PY

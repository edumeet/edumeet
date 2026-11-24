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
assert turnports == [{"protocol": "turns", "port": 443, "transport": "tcp"}], \
    "TURN must be advertised only over TLS on TCP port 443"

nginx = (root / "proxy/nginx.conf.template").read_text()
assert not re.search(r"\blisten\s+[^;]*\budp\b", nginx), \
    "nginx must not listen on any UDP port"

env = dict(os.environ, MAIN_DOMAIN="meet.example.test", MEDIA_DOMAIN="turn.example.test",
           LISTEN_IP="127.0.0.1", EXTERNAL_IP="192.0.2.1", LOCAL_IP="192.0.2.1",
           MEDIA_SECRET="test")
compose = json.loads(subprocess.check_output(
    ["docker", "compose", "-f", str(root / "docker-compose.yml"), "config", "--format", "json"],
    env=env))
ports = compose["services"]["proxy"]["ports"]
assert all(port["protocol"] == "tcp" for port in ports), \
    "Compose must not publish UDP ports on the proxy"
assert any(str(port["published"]) == "443" and port["target"] == 443 for port in ports), \
    "Compose must publish TCP port 443 to the proxy"
print("PASS: minimal deployment advertises TURN only over TLS on TCP 443")
PY

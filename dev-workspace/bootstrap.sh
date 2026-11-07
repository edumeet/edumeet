#!/usr/bin/env bash
# Set up an eduMEET development workspace in the directory this script lives in:
#   - Node version from .nvmrc (via nvm) and Yarn 4 (via Corepack)
#   - clone the five repos (skips ones that exist)
#   - yarn install in each
#   - write the local, gitignored config files (skips ones that exist)
#   - start Postgres in Docker and run the management-server migrations
#
# Usage:  ./bootstrap.sh                 # clone over HTTPS
#         GIT_BASE=git@github.com:edumeet ./bootstrap.sh   # clone over SSH
#         SKIP_DB=1 ./bootstrap.sh       # don't touch Docker/Postgres
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$PWD
GIT_BASE=${GIT_BASE:-https://github.com/edumeet}
REPOS=(edumeet-common edumeet-client edumeet-room-server edumeet-media-node edumeet-management-server)

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
skip() { printf '    %s exists, keeping it\n' "$1"; }

# ------------------------------------------------------------------ Node + Yarn
step "Node $(cat .nvmrc) and Yarn (Corepack)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
	echo "nvm not found in $NVM_DIR. Install it: https://github.com/nvm-sh/nvm#installing-and-updating" >&2
	exit 1
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh" --no-use
nvm install "$(cat .nvmrc)" >/dev/null 2>&1
nvm use --silent "$(cat .nvmrc)"
corepack enable
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
echo "    node $(node -v)"

# ------------------------------------------------------------------ clone
step "Clone repositories from $GIT_BASE"
for r in "${REPOS[@]}"; do
	if [ -d "$r/.git" ]; then
		skip "$r"
	elif git clone -q "$GIT_BASE/$r.git" "$r"; then
		echo "    cloned $r"
	else
		echo "Cloning $GIT_BASE/$r.git failed. Check GIT_BASE and your access (SSH key for git@github.com)." >&2
		exit 1
	fi
done

# ------------------------------------------------------------------ install
step "Install dependencies (yarn install --immutable)"
for r in "${REPOS[@]}"; do
	printf '    %-28s' "$r"
	(cd "$r" && yarn install --immutable >/dev/null 2>&1) && echo ok || { echo FAILED; (cd "$r" && yarn install --immutable | tail -20); exit 1; }
done

# ------------------------------------------------------------------ configs
step "Local config files"

f=edumeet-client/public/config/config.js
if [ -e "$f" ]; then skip "$f"; else
	cat > "$f" <<'EOF'
// Local development config (gitignored). All options: public/config/config.example.js
// eslint-disable-next-line
var config = {
	// Dev builds (yarn start) connect to the room server on this port.
	developmentPort: 8443,

	// Management server running locally (yarn dev).
	loginEnabled: true,
	managementUrl: 'http://localhost:3030',
};
EOF
	echo "    wrote $f"
fi

f=edumeet-room-server/config/config.json
if [ -e "$f" ]; then skip "$f"; else
	node - "$f" <<'EOF'
const fs = require('fs');
const out = process.argv[2];
const c = JSON.parse(fs.readFileSync('edumeet-room-server/config/config.example.json', 'utf8'));
c.prometheus.enabled = false;
// Keep c.tls: without TLS the room server speaks plain ws://, which the https:// client page may not use.
c.managementService.host = 'http://localhost:3030'; // example public key matches the mgmt dev key
c.mediaNodes = [{
	hostname: 'localhost', port: 3000, secret: 'devsecret',
	latitude: 63.430481, longitude: 10.394964, country: 'NO',
	// turnHostname is required by the config schema; '' means "no TURN servers".
	turnHostname: '', turnports: [],
}];
fs.writeFileSync(out, JSON.stringify(c, null, '\t') + '\n');
EOF
	echo "    wrote $f"
fi

f=edumeet-management-server/config/local.json
if [ -e "$f" ]; then skip "$f"; else
	cat > "$f" <<'EOF'
{
	"origins": [
		"http://localhost:3030",
		"https://localhost:4443"
	]
}
EOF
	echo "    wrote $f"
fi

f=edumeet-management-server/config/test.json
if [ -e "$f" ]; then skip "$f"; else
	cat > "$f" <<'EOF'
{
	"postgresql": {
		"connection": "postgres://postgres:edumeet@localhost:5432/edumeet_test"
	}
}
EOF
	echo "    wrote $f (tests use their own database)"
fi

# ------------------------------------------------------------------ database
if [ "${SKIP_DB:-}" = 1 ]; then
	step "Skipping Postgres (SKIP_DB=1)"
else
	step "Postgres (Docker) and migrations"
	docker compose -f dev/docker-compose.yml up -d --wait
	(cd edumeet-management-server && yarn migrate 2>&1 | grep -E "Batch|Already up to date" || true)
fi

cat <<EOF

Done. Next:
  - VS Code: open $ROOT and press Ctrl+Shift+B ("edumeet: start all").
  - Terminal: see the "Run the stack" section of edumeet/DEVELOPMENT.md.
  - Then open https://localhost:8443 once and accept the certificate,
    and join a room at https://localhost:4443/test
EOF

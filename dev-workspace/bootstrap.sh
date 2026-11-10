#!/usr/bin/env bash
# Set up an eduMEET development workspace in the directory this script lives in:
#   - Node version from .nvmrc (via nvm) and Yarn 4 (via Corepack)
#   - clone the five repos (skips ones that exist)
#   - yarn install in each
#   - make this workspace's own token key pair and super-admin password (.dev-secrets/)
#   - write the local, gitignored config files (skips ones that exist)
#   - start Postgres in Docker, run the management-server migrations, set the super-admin password
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

# ------------------------------------------------------------------ secrets
step "Development secrets (.dev-secrets/, readable by you only)"
# The management server refuses the key pair and the super-admin password published with
# eduMeet, so every workspace gets its own.
SECRETS=$ROOT/.dev-secrets
mkdir -p "$SECRETS" && chmod 700 "$SECRETS"

if [ -e "$SECRETS/mgmt-jwt.key" ]; then skip "$SECRETS/mgmt-jwt.key"; else
	node - "$SECRETS" <<'EOF'
const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const dir = process.argv[2];
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
fs.writeFileSync(`${dir}/mgmt-jwt.key`, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
fs.writeFileSync(`${dir}/mgmt-jwt.pub`, publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });
EOF
	echo "    wrote $SECRETS/mgmt-jwt.key and mgmt-jwt.pub (the management server's token key pair)"
fi

if [ -e "$SECRETS/room-server.env" ]; then skip "$SECRETS/room-server.env"; else
	password=$(node -e "process.stdout.write(require('crypto').randomBytes(18).toString('base64url'))")
	(umask 077; printf 'MANAGEMENT_USERNAME=edumeet-admin@localhost\nMANAGEMENT_PASSWORD=%s\n' "$password" > "$SECRETS/room-server.env")
	echo "    wrote $SECRETS/room-server.env (the super-admin's password, which the room server logs in with)"
fi

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
if [ -e "$f" ]; then skip "$f"; grep -qF "$(sed -n 2p "$SECRETS/mgmt-jwt.pub")" "$f" || echo "    put $SECRETS/mgmt-jwt.pub into managementService.jwtPublicKeys in $f (see DEVELOPMENT.md 4.3)"; else
	node - "$f" "$SECRETS/mgmt-jwt.pub" <<'EOF'
const fs = require('fs');
const [ out, publicKey ] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync('edumeet-room-server/config/config.example.json', 'utf8'));
c.prometheus.enabled = false;
// Keep c.tls: without TLS the room server speaks plain ws://, which the https:// client page may not use.
c.managementService.host = 'http://localhost:3030';
c.managementService.jwtPublicKeys = [ fs.readFileSync(publicKey, 'utf8') ]; // this workspace's key
c.mediaNodes = [{
	hostname: 'localhost', port: 3000, secret: 'devsecret',
	latitude: 63.430481, longitude: 10.394964, country: 'NO',
}];
fs.writeFileSync(out, JSON.stringify(c, null, '\t') + '\n');
EOF
	echo "    wrote $f"
fi

f=edumeet-management-server/config/local.json
if [ -e "$f" ]; then skip "$f"; grep -q '"authentication"' "$f" || echo "    add authentication.secret from $SECRETS/mgmt-jwt.key to $f (see DEVELOPMENT.md 4.3)"; else
	node - "$f" "$SECRETS/mgmt-jwt.key" <<'EOF'
const fs = require('fs');
const [ out, privateKey ] = process.argv.slice(2);
fs.writeFileSync(out, JSON.stringify({
	origins: [ 'http://localhost:3030', 'https://localhost:4443' ],
	authentication: { secret: fs.readFileSync(privateKey, 'utf8') },
}, null, '\t') + '\n', { mode: 0o600 });
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
	# The first migration seeds edumeet-admin@localhost with a published password, which the
	# management server refuses. Set this workspace's (set-password runs the compiled code).
	(cd edumeet-management-server && yarn compile >/dev/null &&
		sed -n 's/^MANAGEMENT_PASSWORD=//p' "$SECRETS/room-server.env" | yarn set-password edumeet-admin@localhost >/dev/null)
	echo "    set the password of edumeet-admin@localhost (see $SECRETS/room-server.env)"
fi

cat <<EOF

Done. Next:
  - VS Code: open $ROOT and press Ctrl+Shift+B ("edumeet: start all").
  - Terminal: see the "Run the stack" section of edumeet/DEVELOPMENT.md.
  - Then open https://localhost:8443 once and accept the certificate,
    and join a room at https://localhost:4443/test
  - Admin login: edumeet-admin@localhost, password in $SECRETS/room-server.env
EOF

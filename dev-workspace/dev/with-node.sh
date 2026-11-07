#!/usr/bin/env bash
# Run a command with the Node version from ../.nvmrc (management-server needs >= 24),
# without changing the user's nvm default.
set -e
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh" --no-use
nvm use --silent "$(cat "$(dirname "$0")/../.nvmrc")"
corepack enable >/dev/null 2>&1 || true
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
exec "$@"

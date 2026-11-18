#!/usr/bin/env bash
# Print the release notes for one rolling release, taken from CHANGELOG.md.
#
#   release-notes.sh [VERSION] [CHANGELOG]
#
# VERSION is a changelog heading such as 4.2-20261118-stable. Without it the
# newest *-stable release in the changelog is used. With --latest-version the
# script prints only that newest version and exits.
set -euo pipefail

if [ "${1:-}" = "--latest-version" ]; then
	changelog="${2:-CHANGELOG.md}"
	# One awk pass that stops at the first match: no pipe, so pipefail cannot
	# trip over a SIGPIPE.
	awk 'match($0, /^## \[[0-9][^]]*-stable\]/) {
		print substr($0, 5, RLENGTH - 5)
		exit
	}' "$changelog"
	exit 0
fi

changelog="${2:-CHANGELOG.md}"
version="${1:-}"
if [ -z "$version" ]; then
	version="$("$0" --latest-version "$changelog")"
fi
if [ -z "$version" ]; then
	echo "No *-stable release found in $changelog" >&2
	exit 1
fi

section="$(awk -v v="$version" '
	index($0, "## [" v "]") == 1 { found = 1; next }
	found && /^## \[/ { exit }
	found && /^This is the current stable release\.?[[:space:]]*$/ { next }
	found { print }
' "$changelog")"

if [ -z "$(printf '%s' "$section" | tr -d '[:space:]')" ]; then
	echo "No changelog section for $version in $changelog" >&2
	exit 1
fi

cat <<EOF
edumeet uses rolling releases: each release is a set of Docker images tagged \`$version\`. Install or upgrade with [edumeet-docker](https://github.com/edumeet/edumeet-docker): pull its \`main\` branch, set \`TAG=$version\` in \`.env\`, then run \`docker compose pull && docker compose up -d\`. Read the upgrade notes below first.

| Component | Docker image |
| --- | --- |
| edumeet-client | [\`edumeet/edumeet-client:$version\`](https://hub.docker.com/r/edumeet/edumeet-client/tags?name=$version) |
| edumeet-room-server | [\`edumeet/edumeet-room-server:$version\`](https://hub.docker.com/r/edumeet/edumeet-room-server/tags?name=$version) |
| edumeet-media-node | [\`edumeet/edumeet-media-node:$version\`](https://hub.docker.com/r/edumeet/edumeet-media-node/tags?name=$version) |
| edumeet-management-server | [\`edumeet/edumeet-management-server:$version\`](https://hub.docker.com/r/edumeet/edumeet-management-server/tags?name=$version) |

$section

Full history: [CHANGELOG.md](https://github.com/edumeet/edumeet/blob/main/CHANGELOG.md)
EOF

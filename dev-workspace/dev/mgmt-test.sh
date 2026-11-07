#!/usr/bin/env bash
# Run management-server tests against a separate edumeet_test database
# (config/test.json), so they don't touch the dev data in "edumeet".
set -e
cd "$(dirname "$0")/../edumeet-management-server"
docker exec edumeet-dev-db sh -c \
  "psql -U postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='edumeet_test'\" | grep -q 1 || createdb -U postgres edumeet_test"
exec ../dev/with-node.sh yarn test "$@"

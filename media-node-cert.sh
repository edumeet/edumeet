#!/bin/bash
# Creates the TLS key and certificate of the media node on this host. The room-server pins the
# certificate as the node's "ca", so it sends the media secret only to this node and not to
# whoever answers on its address. run-first.sh calls this script; run it again by hand after
# changing LISTEN_IP. A certificate that matches LISTEN_IP and is valid for 30 more days is kept.
set -e
cd "$(dirname "$0")"

if ! [ -x "$(command -v openssl)" ]; then
  echo 'Error: openssl is not installed.' >&2
  exit 1
fi

[ -f .env ] && LISTEN_IP=$(grep -E '^LISTEN_IP=' .env | tail -n 1 | cut -d= -f2- | tr -d "\"'")
if [ -z "$LISTEN_IP" ] || [ "$LISTEN_IP" = "0.0.0.0" ]; then
  echo 'Error: LISTEN_IP in .env must be the address the room-server reaches the media node on.' >&2
  exit 1
fi

dir=certs/media-node
cert=$dir/cert.pem
key=$dir/key.pem
mkdir -p "$dir"
if ! [ -w "$dir" ]; then
  echo "Error: $dir is not writable, for example because docker created it; remove it and run this script again." >&2
  exit 1
fi

if [ -f "$cert" ] && [ -f "$key" ] \
  && openssl x509 -in "$cert" -noout -checkend 2592000 >/dev/null \
  && openssl x509 -in "$cert" -noout -ext subjectAltName | grep -qE "IP Address:${LISTEN_IP//./\\.}(,|$)"; then
  echo "### Media node certificate for $LISTEN_IP kept"
  exit 0
fi

echo "### Creating media node certificate for $LISTEN_IP ..."
(umask 077; openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 3650 \
  -subj '/CN=edumeet-media-node' -addext "subjectAltName=IP:$LISTEN_IP" \
  -keyout "$key.new" -out "$cert.new" 2>/dev/null)
chmod 644 "$cert.new"

# The media node runs as its image's own user, which must be able to read the key.
if docker compose version >/dev/null 2>&1; then compose='docker compose'; else compose='docker-compose'; fi
$compose run --rm --no-deps --user 0 -v "$PWD/$dir:/out" --entrypoint chown edumeet-media-node edumeet:edumeet /out/key.pem.new

mv -f "$key.new" "$key"
mv -f "$cert.new" "$cert"
echo "### Media node certificate created; restart edumeet-media-node and edumeet-room-server to use it"

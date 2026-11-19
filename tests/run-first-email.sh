#!/bin/bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
work_dir=$(mktemp -d)
trap 'rm -rf -- "$work_dir"' EXIT

mkdir "$work_dir/bin"
cat > "$work_dir/bin/docker-compose" <<'EOF'
#!/bin/bash
if [[ "$1" == run && "$*" == *"certonly --webroot"* ]]; then
  printf '%s\n' "$@" > certbot-args
fi
EOF
printf '#!/bin/bash\nexit 0\n' > "$work_dir/bin/curl"
chmod +x "$work_dir/bin/docker-compose" "$work_dir/bin/curl"

check_email() (
  local entered_email=$1
  shift
  mkdir -p "$work_dir/$case_name/client"
  cd "$work_dir/$case_name"
  printf 'var config = { title: "Test" };\n' > client/config.js
  printf '#!/bin/bash\nexit 0\n' > media-node-cert.sh
  chmod +x media-node-cert.sh

  env -i PATH="$work_dir/bin:$PATH" \
    MAIN_DOMAIN=meet.example.test MEDIA_DOMAIN=media.example.test \
    LISTEN_IP=127.0.0.1 EXTERNAL_IP=192.0.2.1 LOCAL_IP=192.0.2.2 \
    "${environment[@]}" bash "$repo_dir/run-first.sh" <<< "$entered_email" > setup.log

  grep -Fxq -- "EMAIL=$entered_email" .env
  printf '%s\n' run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
    "$@" -d meet.example.test -d media.example.test --rsa-key-size 4096 --agree-tos \
    --force-renewal > expected-args
  diff -u expected-args certbot-args
  printf 'PASS: %s\n' "$case_name"
)

address="o'connor+\$alerts@example.test"
case_name=supplied
environment=()
check_email "$address" --email "$address"

case_name=blank
environment=(email=ignored@example.test)
check_email '' --register-unsafely-without-email

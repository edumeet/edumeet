#!/bin/bash

if ! [ -x "$(command -v curl)" ]; then
  echo 'Error: curl is not installed.' >&2
  exit 1
fi

# Check if docker-compose is installed
if ! [ -x "$(command -v docker-compose)" ]; then
  echo 'Error: docker-compose is not installed.' >&2
  exit 1
fi

# Load existing .env file if it exists
if [ -f ".env" ]; then
  export $(cat .env | xargs)
fi

# Ask for input only if variables are not already set
[ -z "$MAIN_DOMAIN" ] && read -p "Enter Main FQDN: " MAIN_DOMAIN
[ -z "$MEDIA_DOMAIN" ] && read -p "Enter Media FQDN (MUST be different from Main Domain): " MEDIA_DOMAIN
[ -z "$EMAIL" ] && read -p "Enter Email: " EMAIL
[ -z "$LISTEN_IP" ] && read -p "Enter Listen IP: " LISTEN_IP
[ -z "$EXTERNAL_IP" ] && read -p "Enter Public IP: " EXTERNAL_IP
# This host's own address, the private one behind NAT: coturn maps EXTERNAL_IP to it, so the media
# node on this host stays reachable. 0.0.0.0 would let coturn relay to every peer.
if [ -z "$LOCAL_IP" ] || [ "$LOCAL_IP" = "0.0.0.0" ]; then
  LOCAL_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1)}')
  [ -z "$LOCAL_IP" ] && LOCAL_IP=$(hostname -I | awk '{print $1}')
fi
# Always generate a new Media Secret
MEDIA_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 20)

# Save the environment variables. .env holds MEDIA_SECRET, so only its owner may read it,
# also when it already exists.
(umask 077; cat <<EOF > .env
MAIN_DOMAIN=$MAIN_DOMAIN
MEDIA_DOMAIN=$MEDIA_DOMAIN
EMAIL=$EMAIL
LISTEN_IP=$LISTEN_IP
EXTERNAL_IP=$EXTERNAL_IP
LOCAL_IP=$LOCAL_IP
MEDIA_SECRET=$MEDIA_SECRET
EOF
)
chmod 600 .env

# The media node's own TLS key and certificate, which the room-server pins
./media-node-cert.sh || exit 1

# Earlier versions built the room-server config, which holds MEDIA_SECRET, in this folder.
rm -f room-server/config.json

# Configure edumeet-client
if [[ "$(cat client/config.js)" == "var config = {};" ]]; then
    while true; do
        read -p "Do you want to configure edumeet-client now? You can do it later in client/config.js (y/n): " do_client_config
        case "$do_client_config" in
            [yY])
                [ -z "$TITLE" ] && read -p "Enter name of your edumeet: " TITLE
                echo "If you don't want to show links to your imprint or privacy notes, please skip the following questions."
                [ -z "$IMPRINT_URL" ] && read -p "Enter URL of your imprint: " IMPRINT_URL
                [ -z "$PRIVACY_URL" ] && read -p "Enter URL of your privacy notes " PRIVACY_URL

                cat <<EOF > client/config.js
var config = {
        title: "$TITLE",
        imprintUrl: "$IMPRINT_URL",
        privacyUrl: "$PRIVACY_URL",
};
EOF

                break
                ;;
            [nN])
                echo "Skipping configuration of edumeet-client."
                break
                ;;
            *)
                echo "Invalid input. Please type 'y' or 'n'."
                ;;
        esac
    done
else
    echo "Found existing configuration for edumeet-client. Skipping its config."
fi

# Define other variables
domains=("$MAIN_DOMAIN" "$MEDIA_DOMAIN")
rsa_key_size=4096
data_path="./certbot"
staging=0 # Set to 1 if you're testing your setup to avoid hitting request limits

if [ -d "$data_path" ]; then
  read -p "Existing data found for $domains. Continue and replace existing certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

# Recommended TLS parameters from Certbot. Each file is checked for text it must
# contain, so an error page saved by a failed download is replaced, and a good
# file is never overwritten.
certbot_src="https://raw.githubusercontent.com/certbot/certbot/main/certbot/src/certbot"
get_tls_file() { # <file name> <text it must contain> <URL>
  local file="$data_path/conf/$1"
  grep -q -- "$2" "$file" 2>/dev/null && return 0
  echo "### Downloading $1 ..."
  mkdir -p "$data_path/conf"
  if curl -fsSL "$3" -o "$file.tmp" && grep -q -- "$2" "$file.tmp"; then
    mv "$file.tmp" "$file"
  else
    rm -f "$file.tmp"
    echo "Error: could not download $1 from $3" >&2
    exit 1
  fi
}
get_tls_file options-ssl-nginx.conf "ssl_protocols" "$certbot_src/_internal/plugins/nginx/tls_configs/options-ssl-nginx.conf"
get_tls_file ssl-dhparams.pem "BEGIN DH PARAMETERS" "$certbot_src/ssl-dhparams.pem"
echo

# Removes the certificate of $domains with everything Certbot keeps for it. Run through
# a shell: Compose runs only the first of several commands joined with && in --entrypoint.
remove_certificate() {
  docker-compose run --rm --entrypoint sh certbot -c "\
    rm -Rf '/etc/letsencrypt/live/$domains' \
           '/etc/letsencrypt/archive/$domains' \
           '/etc/letsencrypt/renewal/$domains.conf'"
}

# An existing certificate goes first. Otherwise the dummy certificate below is written
# over its key, and Certbot later saves the new certificate under another name
# ($domains-0001), where the proxy does not look for it.
echo "### Removing an existing certificate for $domains ..."
remove_certificate
echo

echo "### Creating dummy certificate for $domains ..."
path="/etc/letsencrypt/live/$domains"
mkdir -p "$data_path/conf/live/$domains"
docker-compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo


echo "### Starting proxy ..."
docker-compose up --force-recreate -d proxy
echo

echo "### Deleting dummy certificate for $domains ..."
remove_certificate
echo


echo "### Requesting Let's Encrypt certificate for $domains ..."
# Build one -d argument pair per domain
domain_args=()
for domain in "${domains[@]}"; do
  domain_args+=(-d "$domain")
done

# Select appropriate email arg
case "$EMAIL" in
  "") email_args=(--register-unsafely-without-email) ;;
  *) email_args=(--email "$EMAIL") ;;
esac

# Enable staging mode if needed
staging_args=()
if [ "$staging" != "0" ]; then staging_args+=(--staging); fi

docker-compose run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
    "${staging_args[@]}" \
    "${email_args[@]}" \
    "${domain_args[@]}" \
    --rsa-key-size "$rsa_key_size" \
    --agree-tos \
    --force-renewal
echo

echo "### Reloading proxy ..."
docker-compose exec proxy nginx -s reload

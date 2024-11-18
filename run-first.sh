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
[ -z "$MEDIA_DOMAIN" ] && read -p "Enter Media FQDN: " MEDIA_DOMAIN
[ -z "$EMAIL" ] && read -p "Enter Email: " EMAIL
[ -z "$LISTEN_IP" ] && read -p "Enter Listen IP: " LISTEN_IP
[ -z "$EXTERNAL_IP" ] && read -p "Enter Public IP: " EXTERNAL_IP
# Always generate a new Media Secret
MEDIA_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 20)

# Save the environment variables
cat <<EOF > .env
MAIN_DOMAIN=$MAIN_DOMAIN
MEDIA_DOMAIN=$MEDIA_DOMAIN
EMAIL=$EMAIL
LISTEN_IP=$LISTEN_IP
EXTERNAL_IP=$EXTERNAL_IP
MEDIA_SECRET=$MEDIA_SECRET
EOF

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
domains=($MAIN_DOMAIN $MEDIA_DOMAIN)
rsa_key_size=4096
data_path="./certbot"
staging=0 # Set to 1 if you're testing your setup to avoid hitting request limits

if [ -d "$data_path" ]; then
  read -p "Existing data found for $domains. Continue and replace existing certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

# Downloading recommended TLS parameters
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo
fi

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
docker-compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domains && \
  rm -Rf /etc/letsencrypt/archive/$domains && \
  rm -Rf /etc/letsencrypt/renewal/$domains.conf" certbot
echo


echo "### Requesting Let's Encrypt certificate for $domains ..."
#Join $domains to -d args
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot
echo

echo "### Reloading proxy ..."
docker-compose exec proxy nginx -s reload

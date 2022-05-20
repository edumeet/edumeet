# Howto deploy a (room based) load balanced cluster

This example will show how to setup an HA proxy to provide load balancing between several
edumeet servers.

## IP and DNS

In this basic example we use the following names and ips:

### Backend

* `mm1.example.com` <=> `192.0.2.1`
* `mm2.example.com` <=> `192.0.2.2`
* `mm3.example.com` <=> `192.0.2.3`

### Redis

* `redis.example.com` <=> `192.0.2.4`

### Load balancer HAproxy

* `meet.example.com` <=> `192.0.2.5`

## Deploy multiple edumeet servers

This is most easily done using Ansible (see below), but can be done
in any way you choose (manual, Docker, Ansible).

Read more here: [mm-ansible](https://github.com/edumeet/edumeet-ansible)
[![asciicast](https://asciinema.org/a/311365.svg)](https://asciinema.org/a/311365)

## Setup Redis for central HTTP session store

### Use one Redis for all edumeet servers

* Deploy a Redis cluster for all instances.
  * We will use in our actual example `192.0.2.4` as redis HA cluster ip. It is out of scope howto deploy it.

OR

* For testing you can use Redis from one the edumeet servers. e.g. If you plan only for testing on your first edumeet server.
  * Configure Redis `redis.conf` to not only bind to your loopback but also to your global ip address too:

    ``` plaintext
    bind 192.0.2.1
    ```

    This example sets this to `192.0.2.1`, change this according to your local installation.

  * Change your firewall config to allow incoming Redis. Example (depends on the type of firewall):

    ``` plaintext
        chain INPUT {
            policy DROP;

            saddr mm2.example.com proto tcp dport 6379 ACCEPT;
            saddr mm3.example.com proto tcp dport 6379 ACCEPT;
        }
    ```

  * **Set a password, or if you don't (like in this basic example) take care to set strict firewall rules**

## Configure edumeet servers

### Server config

config.yaml
``` yaml
turnAPIKey            : "<key>"
turnAPIURI            : "<turn url>"
listeningPort         : 80
httpOnly              : true
trustProxy : "192.0.2.5"
redisOptions:
  host: "192.0.2.4"                                   
  port: "6379"                                 
  password: "passwd"
```

## Deploy HA proxy

* Configure certificate / letsencrypt for `meet.example.com`
  * In this example we put a complete chain and private key in /root/certificate.pem.
* Install and setup haproxy
```bash 
apt install haproxy
```
* Install haproxy 2.2 (recommended)
``` bash
sudo apt-get install gnupg2 curl -y
curl https://haproxy.debian.net/bernat.debian.org.gpg | sudo apt-key add -
echo deb http://haproxy.debian.net buster-backports-2.2 main | sudo tee /etc/apt/sources.list.d/haproxy.list
sudo apt-get update
apt-get install haproxy=2.2.\*

sudo systemctl start haproxy
sudo systemctl enable haproxy
```

* Add to /etc/haproxy/haproxy.cfg config

  ``` plaintext

  global
    # mult thread setup
    nbproc 1
    nbthread 4
    cpu-map auto:1/1-4 0-3

    log /dev/log    local0
    log /dev/log    local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats socket /run/haproxy.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # Default SSL material locations
    ca-base /etc/ssl/certs
    crt-base /etc/ssl/private

    # Default ciphers to use on SSL-enabled listening sockets.
    # For more information, see ciphers(1SSL). This list is from:
    #  https://hynek.me/articles/hardening-your-web-servers-ssl-ciphers/
    # An alternative list with additional directives can be obtained from
    #  https://mozilla.github.io/server-side-tls/ssl-config-generator/?server=haproxy
    ssl-default-bind-ciphers ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:RSA+AESGCM:RSA+AES:!aNULL:!MD5:!DSS
    ssl-default-bind-options no-sslv3
    tune.ssl.default-dh-param 2048
    maxconn 20000

  defaults
    log     global
    mode    http
    option  httplog
    #option  logasap
    #option dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http
    maxconn 8192

  backend letsmeet-room-backend
    fullconn 4000
    balance url_param roomId
    hash-type consistent
    stick-table type string len 1024 size 100k expire 8h
    stick store-request url_param(roomId)
    stick match url_param(roomId)
    stick match url_param(state),url_dec,b64dec,field(8,'\"')

    server edumeet1 192.0.2.1:80 check maxconn 2000 verify none
    server edumeet2 192.0.2.2:80 check maxconn 1000 verify none
    server edumeet3 192.0.2.3:80 check maxconn 1000 verify none

  backend letsmeet-backend
    fullconn 4000
    balance leastconn
    stick-table type ip size 200k expire 30m
    stick on src
    hash-type consistent

    server edumeet1 192.0.2.1:80 check maxconn 2000 verify none
    server edumeet2 192.0.2.2:80 check maxconn 1000 verify none
    server edumeet3 192.0.2.3:80 check maxconn 1000 verify none

  frontend letsmeet
    bind *:80
    bind*:443 ssl crt /etc/ssl/edumeet.example.com/edumeet.example.com.pem alpn h2,http/1.1
    http-request redirect scheme https if !{ ssl_fc }
    http-request add-header X-Forwarded-Proto https
    stats enable
    stats uri /static/stats
    #stats hide-version
    stats refresh 10s
    stats admin if TRUE
    #stats admin if LOCALHOST
    stats realm Haproxy\ Statistics
    stats auth admin:password

    maxconn 6000
    acl roomId-acl url_param(roomId) -m found 
    acl callback-acl path_beg /auth/callback
    use_backend letsmeet-room-backend if roomId-acl || callback-acl
    default_backend letsmeet-backend

  ```

* Creating cert with letsencrypt :

``` bash
sudo cat /etc/letsencrypt/live/edumeet.example.com/fullchain.pem     /etc/letsencrypt/live/edumeet.example.com/privkey.pem     | sudo tee /etc/ssl/edumeet.example.com/edumeet.example.com.pem
```

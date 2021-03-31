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

mm/configs/server/config.js

``` js
redisOptions : { host: '192.0.2.4'},
listeningPort: 80,
httpOnly: true,
trustProxy           : ['192.0.2.5'],
```

## Deploy HA proxy

* Configure certificate / letsencrypt for `meet.example.com`
  * In this example we put a complete chain and private key in /root/certificate.pem.
* Install and setup haproxy

  `apt install haproxy`

* Add to /etc/haproxy/haproxy.cfg config

  ``` plaintext
    backend edumeet
        balance url_param roomId
        hash-type consistent

        server mm1 192.0.2.1:80 check maxconn 2000 verify none
        server mm2 192.0.2.2:80 check maxconn 2000 verify none
        server mm3 192.0.2.3:80 check maxconn 2000 verify none

    frontend meet.example.com
        bind 192.0.2.5:80
        bind 192.0.2.5:443 ssl crt /root/certificate.pem
        http-request redirect scheme https unless { ssl_fc }
        reqadd X-Forwarded-Proto:\ https
        default_backend edumeet
  ```

# Howto deploy a (room based) loadbalanced cluster

We use in this example an HA proxy loadbalancer to loadbalance between 3 backend server
The static web will be loadbalanced rounrdobin, and the websocket(signaling) and the media will be loadbalnced based on roomId URL parameter.

## IP and dns

In this basic example we use the following names and ips:

### Backend

* `mm1.example.com` <=> `192.0.2.1`
* `mm2.example.com` <=> `192.0.2.2`
* `mm3.example.com` <=> `192.0.2.3`

### Redis

* `redis.example.com` <=> `192.0.2.4`

### LoadBalncer HAproxy

* `meet.example.com` <=> `192.0.2.5`

## Deploy multiple backend/worker

For example with ansible
Read more here: [mm-ansible](https://github.com/misi/mm-ansible)
[![asciicast](https://asciinema.org/a/311365.svg)](https://asciinema.org/a/311365)

## Setup redis for central session store

### Use one redis for all multiparty meeting

* Deploy a redis cluster so use one redis HA cluster for all instances.
  * We will use in our actual example `192.0.2.4` as redis HA cluster ip.
    It is out of scope howto deploy it.

OR

* Just for testing you can use one of the redis from the worker's.
e.g. If you plan only for testing on your first worker
  * Configure redis configs/redis/redis.conf to not only bind to your loopback but also to your global ip address too:

    ``` plaintext
    bind 192.0.2.1
    ```

    And use `192.0.2.1` where we use in this example `192.0.2.4`

  * modify /etc/ferm/ferm.cfg or where ever your firewall config is to allow incoming redis

    ``` plaintext
    chain INPUT {
            policy DROP;

            saddr mm2.example.com proto tcp dport 6379 ACCEPT;
            saddr mm3.example.com proto tcp dport 6379 ACCEPT;
        }
    ```

* **Use password or if you don't (like in this basic example) take care and use strict firewall rules**

## Setup backends/workers

### Setup App config

mm/configs/app/config.js

``` js
multipartyServer : 'meet.example.com',
```

### Setup Server config

mm/configs/server/config.js

``` js
redisOptions : { host: '10.0.2.4'},
listeningPort: 80,
httpOnly: true,
trustProxy           : ['10.0.2.5'],
```

## Deploy host with HA proxy

* configure cerificate / letsencrypt for your meet.example.com
  * in this example we put concat the privkey and full cert chain to /root/fullchain.pem.
* Install and setup haproxy

  `apt install haproxy`

* Add to /etc/haproxy/haproxy.cfg config

``` plaintext
backend multipartymeeting
    balance url_param roomId
    hash-type consistent

    server mm1 192.0.2.1:80 check maxconn 20 verify none
    server mm2 192.0.2.2:80 check maxconn 20 verify none
    server mm3 192.0.2.3:80 check maxconn 20 verify none

frontend meet.example.com
    bind 192.0.2.5:80
    bind 192.0.2.5:443 ssl crt /root/fullchain.pem
    http-request redirect scheme https unless { ssl_fc }
    reqadd X-Forwarded-Proto:\ https
    default_backend multipartymeeting
```

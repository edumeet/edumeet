# Running the development environment

Installing `docker-compose`:
```sh
sudo curl -L "https://github.com/docker/compose/releases/download/1.28.4/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

Starting:

```sh
CURRENT_USER=$UID:$GID docker-compose up --build -d

docker-compose logs -f --tail=50 edumeet
```

Accessing endpoints:

- Edumeet (app live dev): https://127.0.0.1:8443/
- Edumeet (app build): https://127.0.0.1:3443/
- Prometheus: http://127.0.0.1:9090/
- Grafana: http://127.0.0.1:9091/ (user:pass `admin`:`admin`)

Note: to use the https://127.0.0.1:3443/ endpoint, visit first
https://127.0.0.1:8443/ accepting the self-signed certificate exception valid 
also for the websocket connection.

Rebuild the web application bundle:

```sh
docker-compose exec -u $UID edumeet sh -c "cd app && yarn && yarn build"
```

## Known issues

The docker virtual network used by this compose configuration (`172.22.0.0/24`)
should be reacheble from all the started services. If iptables is filtering the 
INPUT chain, this rule is required to make the services communicating with each other:

```
iptables -A INPUT --src 172.22.0.0/16 -j ACCEPT
```

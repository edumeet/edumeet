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

- Edumeet: https://127.0.0.1:8443/
- Prometheus: http://127.0.0.1:9090/
- Grafana: http://127.0.0.1:9091/d/mediasoup/mediasoup (user:pass `admin`:`admin`)

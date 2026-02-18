# Architecture (TrueNAS, Public Internet, No Proxy)

## Goal

Public internet access for:

- `https://penthouse.blog` (landing + downloads + legacy `/api` path)
- `https://api.penthouse.blog` (canonical API + Socket.IO)

With:

- No Cloudflare proxy (DNS-only).
- Single TrueNAS box on home internet.
- Docker Compose for everything.

## Topology

```
Internet
  |
  | 80/443
  v
Router NAT/Port Forward
  |
  | WAN:80  -> TrueNAS:9080
  | WAN:443 -> TrueNAS:9443
  v
TrueNAS SCALE (host)
  |
  | Docker bridge network: penthouse-network
  v
Caddy container (9080/9443 exposed)
  |
  | reverse_proxy to penthouse-app:3000 (internal only)
  v
penthouse-app container (Express + Socket.IO)
  |
  | ./data volume
  v
/mnt/Storage_Pool/penthouse/app/data (db + uploads + downloads)
```

## Why These Ports

TrueNAS often uses host ports that conflict with 80/443. The pattern here is:

- **Host** listens on `9080` and `9443`
- **Router** forwards WAN `80 -> 9080` and `443 -> 9443`

Externally it still looks like normal HTTP/HTTPS.

## Domain + TLS

TLS is handled by Caddy using ACME `http-01` challenges.

This requires:

- DNS `A` records point to the *current* public IP
- WAN `80/443` are actually reachable from the internet

If either is wrong, certificate issuance/renewal fails.

## Operational Principle

Only Caddy is exposed to the internet. The app container port is **not** published; it is reachable only on the internal docker network.


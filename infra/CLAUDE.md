# infra — Docker Compose + Caddy

## Owned by: Codex (GPT-5.4)
Claude must NOT edit files in this directory.

---

## What this directory is
All infrastructure configuration for running The Penthouse on a self-hosted server.
- Docker Compose files (development, production, TrueNAS)
- Caddy reverse proxy configuration
- Environment variable templates

---

## Key files
```
infra/compose/
├── docker-compose.yml              ← Local development (PostgreSQL only)
├── docker-compose.production.yml   ← Full production stack
├── docker-compose.truenas.yml      ← TrueNAS-specific deployment
├── .env.production.example         ← Template for production secrets
├── .env.truenas.example            ← Template for TrueNAS secrets
└── caddy/
    └── Caddyfile.production        ← Reverse proxy: penthouse.blog + api.penthouse.blog
```

---

## Self-hosting constraints
- Server: commodity PC (no ECC RAM, SAS drives via HBA adapter)
- All containers use `restart: unless-stopped`
- PostgreSQL data volume must be on the SAS array, not the OS drive
- The `pg_dump` backup cron must be configured outside Docker (on the host)

---

## Port map
- `3000` — Fastify API (internal, proxied by Caddy)
- `5432` — PostgreSQL (internal only, never exposed)
- `80/443` — Caddy (public-facing)

---

## What this directory does NOT configure
- CI/CD pipelines (not applicable — manual deploy)
- Cloud services (self-hosted only)
- Application-level environment variables (those live in services/api/.env)

# Deploying The Penthouse on TrueNAS (Self-Hosted)

> Run your own private social server on a TrueNAS Scale system using Docker Compose.

---

## Prerequisites

- **TrueNAS Scale** (or any Docker-capable server)
- SSH access to your server
- A local network IP (e.g. `192.168.1.100`)
- *(Optional)* A domain name for HTTPS via reverse proxy

---

## 1. Clone the Repository

```bash
ssh root@your-truenas-ip
cd /mnt/your-pool/apps  # or wherever you store apps
git clone https://github.com/AIMDaAlien/The-Penthouse.git
cd The-Penthouse
```

---

## 2. Configure Environment

```bash
cp server/.env.example .env
```

Edit `.env` with your values:

```env
# REQUIRED — generate a secure secret
JWT_SECRET=$(openssl rand -base64 32)

# Production mode
NODE_ENV=production

# Your server's local IP or domain
DOMAIN=192.168.1.100

# CORS — allow all for mobile app, or restrict to your domain
CORS_ORIGIN=*

# Optional: GIF APIs
GIPHY_API_KEY=your-key
KLIPY_API_KEY=your-key

# Optional: Email for password recovery
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=The Penthouse <your-email@gmail.com>
```

> ⚠️ **Never use the default JWT_SECRET in production.**

---

## 3. Build & Start

```bash
docker compose up -d --build
```

Verify it's running:

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","app":"The Penthouse","version":"1.0.0"}
```

View logs:

```bash
docker compose logs -f penthouse-app
```

---

## 4. Connect Mobile App

On your phone, update the API URL in the mobile app to point to your TrueNAS server:

```
http://192.168.1.100:3000
```

Replace `192.168.1.100` with your TrueNAS IP address.

> **Finding your TrueNAS IP**: Go to TrueNAS Web UI → Network → Interfaces, or run `hostname -I` via SSH.

---

## 5. Data Persistence

Your database and uploaded files are stored in `./data/` on the host, mapped to `/app/data` inside the container.

| Host Path              | Container Path    | Contents              |
|------------------------|-------------------|-----------------------|
| `./data/penthouse.db`  | `/app/data/penthouse.db` | SQLite database |
| `./data/uploads/`      | `/app/data/uploads/`     | Media files     |

To back up:

```bash
cp -r ./data ./data-backup-$(date +%Y%m%d)
```

---

## 6. (Optional) HTTPS with Reverse Proxy

For secure access outside your local network, set up a reverse proxy with SSL.

### Using Nginx Proxy Manager (recommended for TrueNAS)

> **Note**: If Nginx Proxy Manager freezes or fails to install (common on some TrueNAS setups), **skip this step**. You can use the app directly via `http://192.168.0.120:3000`.

1. Install Nginx Proxy Manager from TrueNAS Apps catalog
2. Add a new Proxy Host:
   - **Domain**: `chat.yourdomain.com`
   - **Forward Hostname/IP**: `penthouse-app` (or your TrueNAS IP)
   - **Forward Port**: `3000`
   - **Websocket Support**: ✅ Enabled (critical for real-time chat)
3. Request an SSL certificate via Let's Encrypt
4. Update your `.env`:
   ```
   DOMAIN=chat.yourdomain.com
   CORS_ORIGIN=https://chat.yourdomain.com
   ```

### Using Caddy (alternative)

Create a `Caddyfile`:

```
chat.yourdomain.com {
    reverse_proxy penthouse-app:3000
}
```

---

## 7. Updating

```bash
cd /mnt/your-pool/apps/The-Penthouse
git pull
docker compose up -d --build
```

---

## 8. Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` | Check if container is running: `docker ps` |
| WebSocket not connecting | Ensure port 3000 is open and WSS is supported by proxy |
| Push notifications not working | Must use a physical device with Expo Go; check `docker compose logs` for errors |
| Database locked | Only one instance should access the SQLite file at a time |
| Media not loading | Check `./data/uploads/` permissions: `chmod -R 755 ./data/uploads` |

---

## Architecture

```
┌────────────────────┐
│   Mobile App       │  (Expo / React Native)
│   (your phone)     │
└────────┬───────────┘
         │  HTTP + WebSocket
         ▼
┌────────────────────┐
│  TrueNAS Server    │
│  ┌──────────────┐  │
│  │  Docker       │  │
│  │  ┌──────────┐ │  │
│  │  │ Penthouse│ │  │
│  │  │  :3000   │ │  │
│  │  └──────────┘ │  │
│  └──────────────┘  │
│  📁 ./data/         │  (SQLite + uploads)
└────────────────────┘
```

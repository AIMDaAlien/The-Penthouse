# IP Drift + DDNS (Cloudflare DNS-Only)

## The Problem

Home internet public IPs change.

If your `A` records point at an old IP:

- `http-01` ACME challenges fail
- TLS issuance/renewal fails
- your app is effectively down from the internet

This happened on **2026-02-17** and was fixed by updating Cloudflare `A` records to the correct public IP.

## The Fix

Add a Cloudflare DDNS updater that:

- discovers the current public IP
- checks current DNS record IPs
- only updates when drift is detected

And run it every 5 minutes via cron.

## Configuration

On the host:

```bash
cd /mnt/Storage_Pool/penthouse/app
cp .cloudflare-ddns.env.example .cloudflare-ddns.env
chmod 600 .cloudflare-ddns.env
```

Set:

```env
CF_API_TOKEN=...
```

The token should have:

- Zone:Zone Read
- Zone:DNS Edit

Scope it to only the `penthouse.blog` zone.

## Cron

`./scripts/enable_autostart.sh` installs:

`*/5 * * * * [ -f /mnt/Storage_Pool/penthouse/app/.cloudflare-ddns.env ] && cd /mnt/Storage_Pool/penthouse/app && ./scripts/cloudflare_ddns.sh >> /var/log/penthouse-ddns.log 2>&1`

## Verification

Manual run:

```bash
./scripts/cloudflare_ddns.sh
tail -n 50 /var/log/penthouse-ddns.log
```

Expected logs:

- `... penthouse.blog already <ip>`
- `... api.penthouse.blog already <ip>`

or on drift:

- `updating ... <old> -> <new>`

## Safety Note (Token Hygiene)

Never paste API tokens into chat/screenshots.

If a token leaks:

1. Revoke it immediately.
2. Create a new scoped token.
3. Update `.cloudflare-ddns.env`.


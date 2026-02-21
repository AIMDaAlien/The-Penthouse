# Penthouse Production Notes (TrueNAS + Docker Compose)

These notes document a real-world hardening and production rollout of a small self-hosted chat/social app on **TrueNAS SCALE** using **Docker Compose** and **Caddy**.

They are written to be useful to other people doing something similar: self-hosted, public internet, small-concurrent-user scale, minimal ops overhead.

## Notes

- [[01-Architecture]]
- [[02-TrueNAS-Deploy-Runbook]]
- [[03-Backend-Hardening-Checklist]]
- [[04-IP-Drift-DDNS-Cloudflare]]
- [[05-Git-Push-Autodeploy-TrueNAS-Runner]]
- [[06-Deploy-Downtime-Minimization]]
- [[07-Security-Gotchas]]
- [[08-SSH-Hardening-TrueNAS]]
- [[09-Disk-Exhaustion-Prevention]]
- [[10-Mobile-Update-Versioning-Protocol]]

## Timeline (Concrete Dates)

- **2026-02-17**: DNS IP drift caused ACME timeouts and downtime until Cloudflare `A` records were corrected to the actual public IP. Added DDNS to prevent recurrence.
- **2026-02-17 to 2026-02-18**: Backend hardening pass (auth, invites, message/WS authorization, rate limits, upload safety, token hashing) + production deployment automation and downtime reduction.
- **2026-02-21**: Mobile update system added: automated APK publish with changelog manifest, OTA workflow for `mobile/**`, and in-app update prompts for binary + OTA updates.

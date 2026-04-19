# Temporary Cloud Hosting Options

Date noted: 2026-04-18

This note captures the temporary hosting research after the TrueNAS host showed reliability issues. Penthouse needs more than static hosting: Node/Fastify API, Socket.IO/WebSockets, PostgreSQL, uploads, custom TLS domains, and enough RAM to run the current Docker Compose stack.

## Best Free Fit: Oracle Cloud Always Free

Oracle Cloud Always Free is the strongest free candidate for a full temporary lift-and-shift.

Why:

- Always Free Ampere A1 can provide up to 4 OCPUs and 24 GB RAM across free ARM instances.
- Always Free block volumes can cover up to 200 GB total storage.
- The app can keep the existing Compose shape: `postgres`, `api`, and `caddy`.
- Suitable for restoring a Postgres dump and copying uploads/secrets from TrueNAS.

Caveats:

- Signup and regional capacity can be frustrating.
- Ampere is ARM, so the production Docker build needs an ARM smoke test.
- Oracle can reclaim idle Always Free resources under its idle rules.
- Still needs basic firewall/security-list setup for `80/443`.
- Privacy tradeoff: Oracle becomes a third-party processor for app data, system logs, account metadata, backups, and support/operations access. This is acceptable only as a temporary continuity host unless the app adds stronger client-side or application-layer encryption.

Recommended shape:

- Ubuntu on Ampere A1
- Start with 2 OCPU / 12 GB RAM / 100 GB disk
- Install Docker + Compose
- Restore latest Postgres dump
- Copy uploads/downloads/Firebase secret
- Point `penthouse.blog` and `api.penthouse.blog` DNS at the VM
- Use the same Caddy/Compose deployment pattern plus a watchdog

## Fallback Free Trials

Azure and AWS can work as temporary trial hosts, but they are not clean long-term free homes.

- Azure Free Account has 12-month free VM/database allowances, depending on eligible services and region.
- AWS Free Tier depends on account age and the newer free/credit model. It can work, but billing surprises are easier to trigger.

Use these only if Oracle signup or capacity blocks the move.

## Too Small Or Poor Fit For This App

Google Cloud Always Free `e2-micro` is likely too small for the current Compose stack. Docker + Postgres + Node on 1 GB RAM is fragile, and the free outbound allowance is tight.

Koyeb Free and Render Free are poor fits for a chat app:

- tiny memory/CPU limits
- free database/storage limits are small
- Render free services spin down after idle time, which is bad for WebSockets and chat availability

Neon or Supabase free Postgres can help only if the architecture is split. Their free storage/compute limits are better for testing than for a direct production replacement.

## Pragmatic Non-Free Backup

If free-tier friction wastes too much time, a small paid VPS is likely saner:

- Hetzner, DigitalOcean, Vultr, or similar
- around $5-$7/month
- one small VM running the same Docker Compose stack

For true $0, try Oracle first. For least drama, use a cheap VPS.

## Privacy Reality Check

Oracle's official cloud privacy posture is normal enterprise-cloud language, not privacy-maximal hosting.

What is good:

- Oracle says customer service data is processed to provide the service and on documented customer instructions.
- Oracle says employees and subprocessors are bound by confidentiality and security obligations.
- OCI storage encryption is on by default for block/object/file storage, and customer-managed keys are available.
- Oracle says production customer data is returned or deleted after termination, subject to the service terms and law.

What still matters for Penthouse:

- Oracle can process systems operations data for security, fraud prevention, license/terms compliance, service improvement, legal compliance, and business operations.
- Oracle may use affiliates and third-party subprocessors, including global processing where needed to operate the service.
- Legal disclosure requests are a real exposure; Oracle says it notifies customers unless prohibited by law.
- Always Free compute can be reclaimed when Oracle deems it idle, and free/trial retrieval windows are not a substitute for independent backups.
- Server-side encryption protects against some storage and hardware disposal risks, but it does not make Oracle blind to a running VM, support access paths, metadata, IP logs, traffic patterns, or any plaintext the app stores.

Privacy conclusion:

Use Oracle only as a temporary "keep the app alive" host, not as the long-term privacy posture. If it is used, keep independent encrypted backups off Oracle, minimize uploaded/user data, restrict SSH and cloud IAM hard, and plan to return to on-prem or a provider where the privacy tradeoff is explicitly accepted.

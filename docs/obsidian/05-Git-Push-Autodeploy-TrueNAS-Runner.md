# Git Push Auto-Deploy (GitHub Actions Self-Hosted Runner on TrueNAS)

## Goal

Deploy on `git push` without SSHing into the server.

## Model

- TrueNAS host runs a **self-hosted GitHub Actions runner**.
- Workflow runs on push to `main`.
- Workflow pulls latest `main` and rebuilds/restarts the compose stack.

## Workflow Location

- `.github/workflows/deploy-truenas.yml`

## Runner Labels

Configured to run on:

`runs-on: [self-hosted, truenas, penthouse]`

## What It Does (High Level)

1. `git fetch`
2. `git reset --hard origin/main`
3. normalize data permissions (`./scripts/prepare_data_dirs.sh`)
4. build and recreate only the app container
5. health check inside the container

## Verifying It Works

Practical proof: bump a visible value (like `/api/health` version) on a commit to `main` and confirm the value changes externally after the workflow runs.

## What Can Still Break It

- Runner not starting on boot
- Runner machine offline
- Disk full (build fails)
- `.env` missing required vars (compose fails)
- Bad permissions in the `./data` mount

## Tips

- Keep `docker compose ps` and `/api/health` checks in the workflow so failures are obvious.
- Use `concurrency` so you don't stack deployments.


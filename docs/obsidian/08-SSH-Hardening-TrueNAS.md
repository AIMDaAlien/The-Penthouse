# SSH Hardening (TrueNAS SCALE)

## Goal

- Key-only admin login (non-root)
- Disable root SSH login
- Disable password authentication

## Why This Matters

On a public internet host, SSH is the #1 brute-force target.

The two most valuable changes are:

- no password auth
- no root SSH

## Safe Procedure (Avoid Lockout)

1. Create a new admin user and add your SSH public key.
2. Open a *new* SSH session as that user and confirm it works.
3. Only then disable root login and password auth.

## Option A: TrueNAS UI (Recommended)

1. Credentials -> Local Users:
   - Add user `pentadmin` (or similar)
   - Enable sudo/admin as appropriate
   - Add SSH public key
2. System Settings -> Services -> SSH:
   - Disable "Log in as Root"
   - Disable "Password Authentication"
3. Restart SSH service.

## Option B: Script (Dry-Run by Default)

This repo includes:

- `scripts/truenas_ssh_hardening.sh`

Example:

```bash
cd /mnt/Storage_Pool/penthouse/app
chmod +x scripts/truenas_ssh_hardening.sh

# dry run
./scripts/truenas_ssh_hardening.sh --admin-user pentadmin --pubkey-file /root/pentadmin.pub

# apply user creation/key update only
./scripts/truenas_ssh_hardening.sh --admin-user pentadmin --pubkey-file /root/pentadmin.pub --apply

# after confirming admin login works, harden sshd
./scripts/truenas_ssh_hardening.sh --admin-user pentadmin --pubkey-file /root/pentadmin.pub --apply --disable-root --disable-password
```

## Notes

- TrueNAS stores persistent SSH config in middleware. Editing `/etc/ssh/sshd_config` directly is not the right long-term solution on TrueNAS.


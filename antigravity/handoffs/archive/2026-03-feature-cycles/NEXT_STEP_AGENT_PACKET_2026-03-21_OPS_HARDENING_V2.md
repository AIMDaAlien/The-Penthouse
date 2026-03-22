# Ops Hardening v2 Agent Packet

## Summary

This is the next pre-design slice.

Unlike the earlier member/admin work, `Ops Hardening v2` does **not** split cleanly across two parallel implementers without creating merge collisions in the same operator-summary seam. The honest shape here is:

1. `Opencode` implements the slice end to end
2. `Claude / Opus` performs a bounded hard review after it lands

That is still the fastest path that protects quality.

Important instruction for both agents:
- take your time
- prefer truthful diagnostics over flashy metrics
- do not invent fake certainty
- keep the operator surface read-only

## Goal

Expand the existing read-only operator summary into a more trustworthy self-hosted operations panel that helps answer:

- is this server healthy right now?
- what build is running?
- when was it deployed / started?
- how big is uploads storage getting?
- are push sends failing?
- are stale tokens getting cleaned up?
- do we know anything about backup freshness?

## What belongs in this slice

- build / deploy metadata
- process uptime / started-at
- uploads storage stats
- recent activity or recent error counters if they can be measured honestly
- push delivery diagnostics that reflect actual runtime behavior
- backup status only if it comes from a real, explicit source

## What does not belong

- restart/deploy buttons
- shell command execution
- raw logs viewer
- “AI ops” or speculative automation
- fake backup health if no backup source exists

## Deliverables

- implementation prompt:
  - `OPENCODE_OPS_HARDENING_V2_2026-03-21.md`
- review prompt:
  - `OPUS_OPS_HARDENING_V2_REVIEW_2026-03-21.md`

## Success Criteria

- the operator panel becomes more useful without becoming misleading
- every new metric is either:
  - directly measured
  - explicitly configured
  - or labeled as unavailable / unconfigured
- no secret material is exposed
- no write controls are added

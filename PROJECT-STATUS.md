# RigHouse AV & Lighting — Data Faucet: Project Status

_Last updated: 2026-08-12 by Claude (Cowork session)_

This file is a plain-text status log kept directly in the repo so it's
visible to anyone (or any future Claude session) opening this folder — not
hidden inside a memory system you can't see. Update it at the end of
working sessions.

## What this is
A Cloudflare Worker "data faucet" for a fictional AV/lighting retailer
("RigHouse AV & Lighting"). It generates synthetic leads and orders on a
cron schedule and POSTs them as webhooks to Make and/or Zapier, so there's
always a live data stream to build/demo automations against. Uses
Cloudflare D1 for tiny bookkeeping (which leads have converted to orders).
All data is synthetic (`.example` emails, 555-01xx phone numbers, invented
brands/orgs). See `README.md` for full architecture and setup docs.

## Current deploy status
(Per a prior Cowork session's transcript, pasted back to Claude on
2026-08-12 — not independently re-verified against Cloudflare in this
session. Worth spot-checking with `npx wrangler deployments list`, hitting
the live URL, and `npx wrangler secret list` if it's been a while.)

- **Live** at `rh-j2j3p.j2analytics.ai` — a Cloudflare Custom Domain,
  intentionally unlisted (noindex headers + robots.txt, no link from the
  main site).
- D1 database created and migrated remotely (`npm run db:migrate:remote`
  has been run against the real DB).
- Cron trigger confirmed generating real lead/order data on schedule.
- Dashboard (`GET /`) verified working at the live URL.
- Repo pushed to GitHub: `JSJ-AI/Righthouse-AV`.

## Outstanding
- `MAKE_WEBHOOK_URL` / `ZAPIER_WEBHOOK_URL` secrets are **not yet set** —
  waiting on the actual Make scenario / Zapier Zap catch-hook trigger to
  be built first. Once it is: `npm run secrets:make` and/or
  `npm run secrets:zapier`, then `npm run deploy`.

## Recent work log
- **2026-08-11** (prior session): reskinned from generic "J2 Analytics"
  faucet to RigHouse AV & Lighting; added noindex headers, robots.txt, and
  BASE_PATH support for unlisted subdomain/path deployment; created and
  migrated the D1 database; deployed live to
  `rh-j2j3p.j2analytics.ai`; pushed to GitHub.
- **2026-08-12** (this session): found local, uncommitted changes left
  over from the prior session — the real D1 `database_id` had been filled
  into `wrangler.jsonc` and used for the actual deploy, plus webhook
  dispatch logging improvements in `src/index.js`, neither committed to
  git. Committed both (`38a0e87`), added a missing `package-lock.json`
  that had never been tracked (`18c1dea`), and pushed both to GitHub.

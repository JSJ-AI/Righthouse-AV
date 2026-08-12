# Wiring RigHouse AV up to Make and/or Zapier

Consolidated runbook for the one remaining step on this project — building
the actual Make scenario / Zapier Zap and pointing the live Worker at it.
(Condensed from README.md's "Wiring it into Make" / "Wiring it into
Zapier" sections — see those for more detail/screenshynonyms.)

Prereqs already done: Worker is live at `rh-j2j3p.j2analytics.ai`, D1 is
migrated, cron is confirmed generating leads/orders (verified 2026-08-12).

## Option A — Make

1. In Make, create a new scenario.
2. Add a **Webhooks -> Custom webhook** trigger module, click "Add" to
   generate a webhook URL. Copy it.
3. In PowerShell, from the project folder:
   ```powershell
   cd D:\Claude-Projects\Righthouse-AV
   npm run secrets:make
   ```
   Paste the webhook URL when prompted.
4. Redeploy: `npm run deploy`
5. Back in Make, click "Run once" so it captures a sample payload.
6. Force an event instead of waiting for the 3-minute cron:
   open `https://rh-j2j3p.j2analytics.ai/fire` in a browser (or `curl` it)
   — this fires one tick immediately and returns the generated event as
   JSON. Confirm Make received it.
7. Add a **Filter** after the trigger on `{{1.event}} = lead.created` or
   `order.created` to branch the scenario by event type, and/or on
   `{{1.customer_type}}` to branch consumer vs. business.

## Option B — Zapier

1. Create a new Zap, choose **Webhooks by Zapier -> Catch Hook** as the
   trigger, copy the webhook URL it gives you.
2. In PowerShell:
   ```powershell
   cd D:\Claude-Projects\Righthouse-AV
   npm run secrets:zapier
   ```
   Paste the webhook URL when prompted.
3. Redeploy: `npm run deploy`
4. Hit `https://rh-j2j3p.j2analytics.ai/fire` (or wait for the cron) so
   Zapier has a sample payload to test against, then continue building
   the Zap.
5. Use a **Filter by Zapier** or **Paths by Zapier** step to branch on
   `event` (`lead.created` vs `order.created`) and/or `customer_type`.

## You can wire up both at once
Both `MAKE_WEBHOOK_URL` and `ZAPIER_WEBHOOK_URL` can be set at the same
time — every event goes to both, useful for building parallel demos.

## Verifying it worked
- `GET https://rh-j2j3p.j2analytics.ai/recent` — JSON of the last 20
  leads/orders, for debugging without relying on Make/Zapier's own logs.
- `GET https://rh-j2j3p.j2analytics.ai/health` — uptime check.
- Note: the live site is intentionally noindex/robots-blocked (unlisted),
  so tools that respect robots.txt (including Claude's own WebFetch) can't
  check it directly — this is by design, not a bug. curl/browser access
  still works fine since those ignore robots.txt.

## Still pending as of 2026-08-12
- Neither `MAKE_WEBHOOK_URL` nor `ZAPIER_WEBHOOK_URL` is set yet.
- The local repo has one unpushed commit (`318faa6`) — run
  `git push origin master` from PowerShell when convenient.
- Cloudflare/Make/Zapier Claude connectors are not yet connected (see
  earlier discussion in PROJECT-STATUS.md's session log) — connecting
  Cloudflare would let Claude check secret/deploy state directly instead
  of you reporting it back.

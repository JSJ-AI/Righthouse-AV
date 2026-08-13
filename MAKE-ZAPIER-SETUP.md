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

## Progress — 2026-08-13
Make scenario "Integration Webhooks" (in Jeff's Make account, jeff@j2analytics.ai,
us2 region) is built and working end to end:
- Custom Webhook trigger connected and receiving real events from
  `rh-j2j3p.j2analytics.ai` (confirmed via repeated `/fire` tests).
- `MAKE_WEBHOOK_URL` secret set and deployed
  (`https://hook.us2.make.com/31z883nkr340xymxof2gtn9o0vkgkbyy`).
- Router added with 4 working routes, filtering on live webhook data:
  1. Business lead (`event`=`lead.created` AND `customer_type`=`business`)
  2. Consumer lead (`event`=`lead.created` AND `customer_type`=`consumer`)
  3. Card order → fulfillment (`event`=`order.created` AND `payment_terms`=`card`)
  4. Net-30 order → invoicing (`event`=`order.created` AND `payment_terms`=`net_30`)

Gotcha hit and resolved: Make's webhook field picker only reflects whichever
sample shape (lead vs. order) it most recently captured — since this webhook
receives two different event shapes, the picker would go "stale" and miss
fields from the other shape (e.g. `payment_terms` invisible while showing a
lead sample). Fix: re-trigger listening ("Run once"/wait-for-new) and fire a
fresh event of the needed shape via `/fire`; also note that leaving the
scenario page cancels the listening state, so "Run once" needs to be
re-clicked after navigating back in.

Not yet done: no actual destination actions wired to any route (no Slack/
CRM/email yet) — routes filter correctly but don't take action. Also
considered but not yet added: a 5th route for "big-deal alert"
(`amount_total` > 3000).

There is also an empty, unused second scenario in the same Make account
called "RigHouse AV Events" — 0 activity, safe to ignore or delete.

## Progress — 2026-08-13 (Zapier side)
Built the same 4-route logic in Zapier as a learning/demo exercise, using
**Paths by Zapier** (Zapier's equivalent of Make's Router) on a **Catch Hook**
trigger (`https://hooks.zapier.com/hooks/catch/28541192/4tbic0o/`):
- Path A — Business Lead: `event` (Exactly) matches `lead.created` AND
  `customer_type` (Exactly) matches `business`
- Path B — Consumer Lead: `event` (Exactly) matches `lead.created` AND
  `customer_type` (Exactly) matches `consumer`
- Path C — Card Order: `event` (Exactly) matches `order.created` AND
  `payment_terms` (Exactly) matches `card`
- Path D — Net-30 Order: `event` (Exactly) matches `order.created` AND
  `payment_terms` (Exactly) matches `net_30`

Same field-picker gotcha as Make hit here too (payment_terms invisible
until an order.created sample was captured) — same fix worked: fire more
test events via `/fire` until Zapier's trigger caught an order-shaped
sample.

Each path needed *some* configured action to satisfy Zapier's publish
validation (unlike Make, which allows a Router branch to dead-end with no
module attached) — added a trivial **Formatter by Zapier → Text →
Capitalize** step per path, mapped to the `event` field, purely as a
placeholder action. All four were individually tested successfully (each
shows real "Data out," e.g. "Order.Created").

**BLOCKED — not resolved as of 2026-08-13**: Despite all four Formatter
steps showing fully green (Setup/Configure/Test all checked, real test
output), the Zap's Status panel and the main diagram still flag all four
with "!" / "Please add an action," and the **Publish** button stays
disabled. Tried: reloading the browser page (no change), retesting each
step individually (no change), checking step 2 ("Split into paths," the
parent Paths container) — it shows the same warning, most likely just
rolling up the same child-step status rather than being a separate issue.
Not yet tried: Zapier support/community forum, deleting and re-adding one
of the action steps from scratch, or trying a different placeholder
action type (e.g. Delay by Zapier) in case Formatter specifically has a
bug.

**Net effect: Make integration is fully live and verified working
end-to-end (real webhook traffic routing through all 4 routes, confirmed
via Make's History log). Zapier integration is fully built but stuck in
Draft — cannot go live until the "Please add an action" publish block is
resolved.**

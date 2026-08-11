# J2 Analytics Data Faucet

A fake business ("J2 Analytics", a fictional SaaS analytics product) that
generates realistic **leads** and **orders** on a schedule, forever, and
POSTs them to Make and/or Zapier as webhooks -- so you always have a live
data stream to build and demo automations against, without a real business
behind it.

Runs on **Cloudflare Workers** (free tier is plenty) with **D1** for tiny
bits of internal bookkeeping (which leads have already "converted" to an
order). Nothing here depends on any AI session staying open -- once
deployed, the Cron Trigger keeps firing on Cloudflare's infrastructure
indefinitely.

All generated data is synthetic:
- Emails resolve under `*.example`, a domain suffix reserved by
  [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606) specifically so it can
  never be a real, deliverable address.
- Phone numbers use the `555-0100`-`555-0199` block, which NANPA reserves
  for fictional use in exactly this kind of scenario.
- Names and companies are randomly combined from generic word lists; any
  resemblance to a real company is coincidental.

## What it generates

Every cron tick (default: every 3 minutes), the Worker randomly decides
whether to:

- emit a **new lead** (`lead.created`) -- a contact + company inquiring
  about J2 Analytics, with a source channel (Google Ads, referral, webinar,
  etc.) and a plan they're interested in
- emit a **new order** (`order.created`) -- either converting a
  previously-generated, not-yet-converted lead (70% of orders) or a
  brand-new "direct" self-serve purchase with no prior lead record (30%)

This gives you a realistic mixed feed: some orders will reference a lead
you saw a few minutes earlier (good for demoing "match incoming order to
CRM record" automations), others won't (good for demoing "create a new CRM
record from scratch" automations).

### Payload shapes

```jsonc
// lead.created
{
  "event": "lead.created",
  "id": "lead_...",
  "timestamp": "2026-08-11T16:18:17.265Z",
  "contact": { "first_name": "Amelia", "last_name": "Kowalski", "email": "amelia.kowalski@redstonetechnologies.example", "phone": "(415) 555-0116" },
  "company": { "name": "Redstone Technologies", "domain": "redstonetechnologies.example", "industry": "SaaS", "employee_band": "1-10" },
  "source": "LinkedIn Ads",
  "interest_plan": "scale", // or null
  "message": "Exploring options after a webinar on funnel analytics.",
  "status": "new"
}
```

```jsonc
// order.created
{
  "event": "order.created",
  "id": "order_...",
  "timestamp": "2026-08-11T16:18:17.301Z",
  "lead_id": "lead_..." /* or null for a direct order */,
  "customer": { "first_name": "Emma", "last_name": "Thomas", "email": "emma.thomas@sequoiadigital.example", "company_name": "Sequoia Digital" },
  "plan": { "id": "growth", "name": "Growth", "billing_cycle": "monthly", "price": 99 },
  "addons": [{ "id": "priority_support", "name": "Priority Support", "price": 79 }],
  "amount_total": 178,
  "currency": "USD",
  "status": "paid"
}
```

## Deploy it

Prerequisites: a Cloudflare account (you have one), Node 18+, and the
Wrangler CLI (installed as a dev dependency below).

```bash
npm install
npx wrangler login          # opens a browser to authorize your Cloudflare account

# 1. Create the D1 database
npx wrangler d1 create j2analytics-faucet
# copy the "database_id" it prints into wrangler.jsonc, replacing
# REPLACE_WITH_YOUR_D1_DATABASE_ID

# 2. Apply the schema
npm run db:migrate:remote

# 3. Set your webhook targets as secrets (set either or both)
npm run secrets:make      # paste your Make "Custom Webhook" URL when prompted
npm run secrets:zapier    # paste your Zapier "Catch Hook" URL when prompted
npm run secrets:shared    # optional: a shared secret, sent as the
                           # X-Faucet-Secret header on every webhook POST, so
                           # your Make/Zapier scenario can verify the request
                           # actually came from your faucet. Also required as
                           # ?key=... on /fire once set.

# 4. Deploy
npm run deploy
```

Wrangler will print your live URL, something like
`https://j2analytics-data-faucet.<your-subdomain>.workers.dev`.

### Put it on your own domain (optional)

Since `j2analytics.ai` is on Cloudflare, the cleanest option is:
Cloudflare Dashboard -> Workers & Pages -> `j2analytics-data-faucet` ->
Settings -> Domains & Routes -> **Add Custom Domain** -> e.g.
`events.j2analytics.ai`. No config file changes needed.

### Endpoints once deployed

- `GET /` -- a live dashboard: totals, conversion rate, last 20 leads and
  orders. Good to leave open in a tab during a demo.
- `GET /fire` (or `?key=...` if you set `WEBHOOK_SHARED_SECRET`) -- fires
  one tick immediately, returns the generated event(s) as JSON. Use this to
  force a lead/order to appear on demand instead of waiting for the cron.
- `GET /recent` -- JSON of the last 20 leads/orders (for debugging).
- `GET /health` -- uptime check.

### Adjusting the pace

Edit the `crons` array in `wrangler.jsonc` (standard cron syntax,
UTC), e.g. `*/1 * * * *` for every minute or `0 * * * *` for hourly, then
`npm run deploy` again. Keep the `CRON_SCHEDULE` constant at the top of
`src/index.js` in sync -- it's display-only (shown on the dashboard) but
should match reality.

## Wiring it into Make

1. In Make, create a new scenario, add a **Webhooks -> Custom webhook**
   trigger module, and click "Add" to generate a webhook URL.
2. Paste that URL in as `MAKE_WEBHOOK_URL` (`npm run secrets:make`),
   redeploy.
3. Click "Run once" in Make so it captures a sample payload -- wait for the
   next cron tick, or hit `/fire` to force one immediately.
4. Add a **Filter** after the trigger on `{{1.event}} = lead.created` or
   `order.created` to branch your scenario by event type.

## Wiring it into Zapier

1. Create a new Zap, choose **Webhooks by Zapier -> Catch Hook** as the
   trigger, copy the custom webhook URL it gives you.
2. Paste that URL in as `ZAPIER_WEBHOOK_URL` (`npm run secrets:zapier`),
   redeploy.
3. Hit `/fire` (or wait for the cron) so Zapier has a sample payload to
   test against, then continue building the Zap.
4. Use a **Filter by Zapier** or **Paths by Zapier** step to branch on
   `event` (`lead.created` vs `order.created`).

## Example automations to demo

- **Lead routing**: `lead.created` -> Filter by `source` -> post to a
  Slack channel formatted differently per channel (paid ads vs referral vs
  webinar).
- **Instant lead follow-up**: `lead.created` -> create/update a row in a
  Google Sheet or CRM -> send a templated "thanks for your interest"
  email.
- **Order -> welcome sequence**: `order.created` -> if `lead_id` is
  present, update that lead's CRM row to "Closed Won"; if `lead_id` is
  null, create a new customer record from scratch -> send a receipt email
  with `amount_total` and `plan.name`.
- **Revenue notifications**: `order.created` -> Filter `amount_total > 200`
  -> post a "big deal closed" alert to Slack with the company name and
  plan.
- **Daily rollup**: use Make/Zapier's own schedule trigger (independent of
  this faucet) to hit `GET /recent` once a day and post a summary of the
  day's leads/orders.

## Local development

```bash
npm install
npm test                       # pure-logic tests for the data generators, no wrangler needed
cp .dev.vars.example .dev.vars # fill in local test webhook URLs (optional)
npm run db:migrate:local
npx wrangler dev --local --test-scheduled
# then, in another terminal:
curl "http://localhost:8787/fire"
curl "http://localhost:8787/__scheduled?cron=*/3+*+*+*+*"   # simulate the real cron trigger
```

## Notes / limits

- Cloudflare's free plan Cron Triggers and D1 usage are both far more than
  this needs (a few dozen rows/day at the default 3-minute cadence).
- `WEBHOOK_SHARED_SECRET` is optional but recommended once this is
  reachable on the public internet -- without it, anyone who finds the
  Worker's URL could hit `/fire` and spam your Make/Zapier scenarios.
- If you set both `MAKE_WEBHOOK_URL` and `ZAPIER_WEBHOOK_URL`, every event
  goes to both, so you can build parallel demos in each tool from the same
  feed.

# RigHouse AV & Lighting -- Data Faucet

A fake business ("RigHouse AV & Lighting", a fictional pro audio/video/
lighting retailer for the entertainment industry) that generates realistic
**leads** and **orders** on a schedule, forever, and POSTs them to Make
and/or Zapier as webhooks -- so you always have a live data stream to build
and demo automations against, without a real business behind it.

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
- Product brands, company names, and people are invented from generic word
  lists; any resemblance to a real business or manufacturer is
  coincidental.

## The simulated business

RigHouse sells pro AV, lighting, and staging gear across five categories
(Lighting, Audio, Video, Rigging & Staging, Cabling & Power) to two very
different kinds of customer:

- **Consumers** -- home enthusiasts building out a home studio or party
  room, content creators/streamers, home theater enthusiasts. Orders skew
  small (1-3 items), pay by card, ship free over $150.
- **Businesses** -- sound companies, AV installers, churches, and event
  planning companies. Orders skew larger (3-7 line items, often multiple
  units of each), sometimes pay net-30 with a PO number instead of a card,
  ship free over $1,000.

This mix is deliberate: it gives you realistic variety in order size and
customer type to branch automations on (e.g. route business/net-30 orders
to an invoicing flow, route consumer/card orders straight to fulfillment).

## What it generates

Every cron tick (default: every 3 minutes), the Worker randomly decides
whether to:

- emit a **new lead** (`lead.created`) -- a consumer or business contact
  inquiring about a product category, with a source channel and budget band
- emit a **new order** (`order.created`) -- either converting a
  previously-generated, not-yet-converted lead (70% of orders) or a
  brand-new "direct" purchase with no prior lead record (30%)

Some orders will reference a lead you saw a few minutes earlier (good for
demoing "match incoming order to CRM record" automations), others won't
(good for demoing "create a new customer record from scratch" automations).

### Payload shapes

```jsonc
// lead.created (business)
{
  "event": "lead.created",
  "id": "lead_8f615bec-...",
  "timestamp": "2026-08-11T16:47:30.867Z",
  "customer_type": "business",
  "contact": { "first_name": "Priya", "last_name": "Clark", "email": "priya.clark@meridianeventgroup.example", "phone": "(212) 555-0132", "title": "Facilities Manager" },
  "organization": { "name": "Meridian Event Group", "type": "Event Planning Company" },
  "role": null,
  "source": "Partner Program",
  "interest_category": "Rigging & Staging",
  "budget_band": "$5,000 - $15,000",
  "message": "Standardizing on one vendor for our install jobs going forward.",
  "status": "new"
}
```

```jsonc
// lead.created (consumer)
{
  "event": "lead.created",
  "id": "lead_265263b6-...",
  "timestamp": "2026-08-11T16:47:19.632Z",
  "customer_type": "consumer",
  "contact": { "first_name": "Priya", "last_name": "Okafor", "email": "priya.okafor@priyaokafor.example", "phone": "(415) 555-0132", "title": null },
  "organization": null,
  "role": "Home Theater Enthusiast",
  "source": "RFP / Bid Site",
  "interest_category": "Cabling & Power",
  "budget_band": "Under $500",
  "message": "Setting up a home studio and need help picking a mixer.",
  "status": "new"
}
```

```jsonc
// order.created (business, net-30)
{
  "event": "order.created",
  "id": "order_7bb40814-...",
  "timestamp": "2026-08-11T16:47:19.835Z",
  "lead_id": null,
  "customer_type": "business",
  "customer": { "first_name": "Yuki", "last_name": "Jackson", "email": "yuki.jackson@vertexintegrationgroup.example", "organization_name": "Vertex Integration Group" },
  "shipping": { "city": "Phoenix", "state": "AZ" },
  "items": [
    { "sku": "VLB-PAR64-4PK", "brand": "Voltbeam", "name": "LED PAR64 (4-Pack)", "category": "Lighting", "unit_price": 429, "qty": 4, "line_total": 1716 },
    { "sku": "SFG-LA12", "brand": "SonicForge", "name": "LA-12 Line Array Speaker", "category": "Audio", "unit_price": 1299, "qty": 1, "line_total": 1299 }
  ],
  "item_count": 5,
  "subtotal": 3015,
  "shipping_cost": 0,
  "tax": 218.59,
  "amount_total": 3233.59,
  "currency": "USD",
  "payment_terms": "net_30",
  "po_number": "PO-48213",
  "status": "invoiced"
}
```

## Deploy it

Prerequisites: a Cloudflare account (you have one), Node 18+, and the
Wrangler CLI (installed as a dev dependency below).

```bash
npm install
npx wrangler login          # opens a browser to authorize your Cloudflare account

# 1. Create the D1 database
npx wrangler d1 create righouse-faucet
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
`https://righouse-data-faucet.<your-subdomain>.workers.dev`.

### Put it on your own domain (optional)

Since `j2analytics.ai` is on Cloudflare, the cleanest option is:
Cloudflare Dashboard -> Workers & Pages -> `righouse-data-faucet` ->
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
   `order.created` to branch your scenario by event type, and/or on
   `{{1.customer_type}}` to branch consumer vs business.

## Wiring it into Zapier

1. Create a new Zap, choose **Webhooks by Zapier -> Catch Hook** as the
   trigger, copy the custom webhook URL it gives you.
2. Paste that URL in as `ZAPIER_WEBHOOK_URL` (`npm run secrets:zapier`),
   redeploy.
3. Hit `/fire` (or wait for the cron) so Zapier has a sample payload to
   test against, then continue building the Zap.
4. Use a **Filter by Zapier** or **Paths by Zapier** step to branch on
   `event` (`lead.created` vs `order.created`) and/or `customer_type`.

## Example automations to demo

- **Lead routing by customer type**: `lead.created` -> Filter on
  `customer_type` -> business leads go to a sales rep's CRM queue with the
  `organization.type` (sound company, AV installer, church, event planner)
  and `budget_band`; consumer leads go straight to an email nurture
  sequence.
- **Instant lead follow-up**: `lead.created` -> create/update a row in a
  Google Sheet or CRM -> send a templated reply referencing their
  `interest_category`.
- **Order -> fulfillment vs. invoicing split**: `order.created` -> Filter
  on `payment_terms` -> `card`/`paid` orders go straight to a pick-pack-ship
  Slack channel; `net_30`/`invoiced` orders go to an AR queue with the
  `po_number`.
- **Order -> CRM match**: `order.created` -> if `lead_id` is present,
  update that lead's CRM row to "Closed Won"; if `lead_id` is null, create
  a new customer record from scratch.
- **Big-deal alerts**: `order.created` -> Filter `amount_total > 3000` ->
  post an alert to Slack with the organization name and item list.
- **Daily rollup**: use Make/Zapier's own schedule trigger (independent of
  this faucet) to hit `GET /recent` once a day and post a summary of the
  day's leads/orders.

## Reskinning to a different business

Everything specific to "RigHouse AV & Lighting" -- the name, the five
product categories, the 29-item catalog, consumer roles, business org
types, job titles, lead source channels, and lead message copy -- lives in
one file: **`src/business-config.js`**. To turn this into a completely
different simulated business (e-commerce, SaaS, local services, wholesale,
whatever), edit that file:

- `BUSINESS_NAME` / `BUSINESS_TAGLINE`
- `CATEGORIES` -- your product/service categories
- `PRODUCTS` -- your catalog; each item needs `sku`, `brand`, `name`,
  `category`, `price`, and a `tier` (`"consumer"`, `"business"`, or
  `"both"`) that biases which customer type typically buys it
- `CONSUMER_ROLES` / `ORG_TYPES` / `TITLES` -- who your leads/customers are
- `CONSUMER_BUDGET_BANDS` / `BUSINESS_BUDGET_BANDS`
- `CONSUMER_LEAD_MESSAGES` / `BUSINESS_LEAD_MESSAGES` -- what a lead's
  inquiry sounds like
- `SOURCES` -- marketing/sales channels leads come from
- `SHIP_LOCATIONS` -- cities/states orders ship to
- `randomOrgName()` -- naming templates per organization type

`src/data.js` (the generation logic), `src/db.js` (D1 storage), and
`src/dashboard.js` (the live status page) are all generic and read from
this config -- you shouldn't need to touch them for a reskin. If your new
business needs materially different fields (e.g. physical shipping carriers,
subscription billing cycles), those three files are still where the
mechanics live.

After editing `business-config.js`, update `wrangler.jsonc`'s `vars.BUSINESS_NAME`
to match, then `npm test` to sanity-check your new catalog before deploying.

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
- The 7.25% tax rate in `data.js` is a flat placeholder for demo purposes,
  not tied to any real jurisdiction -- adjust or remove it if that matters
  for your demo.

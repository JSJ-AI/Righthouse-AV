# Plan: analytics/charts for RigHouse AV, and where they'd live

Written 2026-08-12 while thinking through "graphing of leads, dollars sold
by category, and other visually interesting metrics" for the j2analytics.ai
site. This is a plan to review, not something deployed yet — no schema or
production changes have been made.

## What's already chartable, zero changes needed
The `leads` and `orders` tables (see `migrations/0001_init.sql`) already
store enough to chart, with no schema change:
- Leads per day / orders per day (time series, from `created_at`)
- Cumulative revenue over time (running sum of `orders.amount_total`)
- Consumer vs. business split, for leads and for orders (`customer_type`)
- Lead source breakdown (`leads.source`)
- Leads by interest category — i.e. Lighting/Audio/Video/Rigging/Cabling
  interest volume (`leads.interest_category`)
- Business lead org-type breakdown — sound company / AV installer /
  church / event planner (`leads.organization_type`)
- Payment terms split: card vs. net-30 (`orders.payment_terms`)
- Order status split: paid vs. invoiced (`orders.status`)
- Average order value by customer type
- Lead → order conversion rate (already shown as one number on the
  dashboard; could chart as a trend over time too)

## What needs a small schema change first
The one metric explicitly asked for — **dollars sold by product category**
— is NOT currently possible. Here's why: the generated `order.created`
event payload includes a full `items` array (sku, brand, category,
unit_price, qty, line_total per line item), but `saveOrder()` in `src/db.js`
only persists the order-level totals (`subtotal`, `amount_total`,
`item_count`) — the per-item detail is discarded once the webhook fires.
Same story for two other useful cuts:
- **Budget band distribution** — `budget_band` is on the lead event
  payload, not persisted to the `leads` table.
- **Geographic distribution** (state/city) — `shipping.city`/`shipping.state`
  is on the order event payload, not persisted to the `orders` table.

Proposed migration (`migrations/0002_add_analytics_fields.sql`,
additive/backward-compatible, doesn't touch existing rows):

```sql
CREATE TABLE IF NOT EXISTS order_items (
  order_id     TEXT NOT NULL,
  sku          TEXT NOT NULL,
  brand        TEXT NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  unit_price   REAL NOT NULL,
  qty          INTEGER NOT NULL,
  line_total   REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
CREATE INDEX IF NOT EXISTS idx_order_items_category ON order_items(category);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

ALTER TABLE leads  ADD COLUMN budget_band     TEXT;
ALTER TABLE orders ADD COLUMN shipping_city   TEXT;
ALTER TABLE orders ADD COLUMN shipping_state  TEXT;
```

Plus small additions to `saveLead()`/`saveOrder()` in `src/db.js` (persist
the new fields) and a new `saveOrderItems()` call from `runTick()` in
`src/index.js`. Low-risk, additive — existing rows just have NULL/no rows
in the new places, nothing breaks.

## A new endpoint to serve the aggregates
`GET /stats` (name open to bikeshedding) — runs a handful of D1 `GROUP BY`
queries server-side and returns one JSON blob for a chart page to consume,
e.g. `revenueByDay`, `revenueByCategory`, `leadsBySource`,
`leadsByCustomerType`, `ordersByPaymentTerms`, `conversionRate`. Same
pattern as the existing `/recent` endpoint, just aggregated instead of raw
rows.

## Where the page actually lives — three options
This is the real open question, not really an engineering one.

**Option A — a new route on this same Worker** (e.g. `GET /analytics`),
right alongside the existing dashboard at `/`. Reuses the same D1 binding,
zero new infrastructure, fastest to ship. Stays wherever this Worker is
mounted (`rh-j2j3p.j2analytics.ai`) — unlisted/noindex by default, same as
now, unless that's deliberately changed for this page.

**Option B — mount it onto the real `j2analytics.ai` site via the
already-built path-Route mechanism** (`BASE_PATH`, e.g.
`j2analytics.ai/av/analytics`). This plumbing already exists in the repo
(added for exactly this kind of path-mount scenario) — so this becomes an
actual page on the main site's domain without touching that site's own
codebase at all.

**Option C — build it natively into the j2analytics.ai site itself**, next
to the existing "Interactive Demonstrations" section (the live traffic/
transit/grid/computer-vision visualizations already on that site) — client-
side JS fetching from a public JSON endpoint on the Worker. This is the
most natural fit stylistically since it matches an existing pattern on the
site, but Claude doesn't have visibility into what platform/codebase
j2analytics.ai actually runs on, so this option can't be scoped without
more information from you.

**The real decision underneath all three**: RigHouse was deliberately made
unlisted/noindex earlier (your call, at the time). Does an analytics page
change that — do you want this to become a public showcase (like the
traffic/transit demos), or stay a private tool you walk prospects through
one-on-one? That answer picks the option above, more than any technical
constraint does.

## Chart library
Chart.js via CDN — lightweight, canvas-based, covers line/bar/donut
without a build step, consistent with how `dashboard.js` and everything
else in this repo is plain HTML/CSS with no bundler.

## Open questions for Jeff
1. Public showcase vs. private-only tool — which is this?
2. If public: Option B (fast, path-mounted on j2analytics.ai) or Option C
   (native to the main site, needs more info about that site's platform)?
3. OK to run the small additive D1 migration above?
4. Of the metrics listed, which matter most for a demo — all of them, or
   a tighter set?

A rough mockup of what the charts could look like (illustrative numbers,
not live data) was generated separately — see the delivered artifact.

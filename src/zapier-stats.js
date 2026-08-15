// Pulls the four per-path counters the RigHouse AV Zap increments via
// Storage by Zapier (one "Increment Value" step per Path: Business Lead,
// Consumer Lead, Card Order, Net Order). This lets the dashboard show, at a
// glance, how many events each Zapier path has actually processed --
// alongside the D1-backed totals that already come from Make's side and
// from the faucet's own records.
//
// Storage by Zapier's REST API (https://store.zapier.com) isn't fully
// documented publicly -- Zapier's own help articles and community posts
// describe the endpoint and auth but don't publish an exact response
// schema, and this Worker's outbound fetch couldn't be test-verified
// against the live API from the dev sandbox this was written in (network
// egress there is allowlisted and store.zapier.com wasn't reachable from
// it). So this parses defensively: it accepts a few plausible response
// shapes and falls back to "unavailable" rather than throwing, so a
// Zapier-side hiccup never breaks the rest of the dashboard. If the real
// shape turns out to differ once this is live, tweak `extractRecords`
// below -- everything else (fetch, keys, rendering) should keep working.

export const ZAPIER_STORE_KEYS = [
  "business_leads_count",
  "consumer_leads_count",
  "card_orders_count",
  "net30_orders_count",
];

const LABELS = {
  business_leads_count: "Business leads",
  consumer_leads_count: "Consumer leads",
  card_orders_count: "Card orders",
  net30_orders_count: "Net-30 orders",
};

function extractRecords(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.records)) return body.records;
  return [];
}

// Returns an array of { key, label, value } for the 4 known counters, or
// null if ZAPIER_STORAGE_SECRET isn't configured or the fetch/parse fails
// for any reason. Never throws.
export async function getZapierStats(secret, fetchImpl = fetch) {
  if (!secret) return null;

  const qs = ZAPIER_STORE_KEYS.map((k) => `key=${encodeURIComponent(k)}`).join("&");
  const url = `https://store.zapier.com/api/records?${qs}`;

  try {
    const res = await fetchImpl(url, {
      headers: { "X-Secret": secret },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`Storage by Zapier fetch failed: HTTP ${res.status}`);
      return null;
    }

    const body = await res.json();
    const records = extractRecords(body);

    const values = Object.fromEntries(ZAPIER_STORE_KEYS.map((k) => [k, 0]));
    for (const rec of records) {
      const key = rec?.key ?? rec?.name;
      if (key && key in values) {
        const num = Number(rec.value);
        values[key] = Number.isFinite(num) ? num : rec.value;
      }
    }

    return ZAPIER_STORE_KEYS.map((key) => ({ key, label: LABELS[key], value: values[key] }));
  } catch (err) {
    console.error("Storage by Zapier fetch error:", err);
    return null;
  }
}

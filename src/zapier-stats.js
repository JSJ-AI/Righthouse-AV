// Pulls the four per-path counters the RigHouse AV Zap increments via
// Storage by Zapier (one "Increment Value" step per Path: Business Lead,
// Consumer Lead, Card Order, Net Order). This lets the dashboard show, at a
// glance, how many events each Zapier path has actually processed --
// alongside the D1-backed totals that already come from Make's side and
// from the faucet's own records.
//
// Confirmed live response shape (2026-08-14, via a direct GET against
// https://store.zapier.com/api/records?secret=... with the real project
// secret): a flat object mapping key -> value directly, e.g.
//   { "business_leads_count": 8, "card_orders_count": 9, ... }
// -- not an array of {key, value} records as Zapier's own docs/community
// posts vaguely suggested. This parses that flat-map shape as the primary
// case, with a couple of array-shaped fallbacks kept just in case Zapier
// ever changes it, and degrades to "unavailable" (never throws) on
// anything unrecognized so a Zapier-side hiccup never breaks the rest of
// the dashboard.

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

function extractArrayRecords(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.records)) return body.records;
  return null;
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
    const values = Object.fromEntries(ZAPIER_STORE_KEYS.map((k) => [k, 0]));

    const arrayRecords = extractArrayRecords(body);
    if (arrayRecords) {
      // Fallback shape: [{ key, value }, ...]
      for (const rec of arrayRecords) {
        const key = rec?.key ?? rec?.name;
        if (key && key in values) {
          const num = Number(rec.value);
          values[key] = Number.isFinite(num) ? num : rec.value;
        }
      }
    } else if (body && typeof body === "object") {
      // Confirmed live shape: flat { key: value, ... } map.
      for (const key of ZAPIER_STORE_KEYS) {
        if (key in body) {
          const num = Number(body[key]);
          values[key] = Number.isFinite(num) ? num : body[key];
        }
      }
    }

    return ZAPIER_STORE_KEYS.map((key) => ({ key, label: LABELS[key], value: values[key] }));
  } catch (err) {
    console.error("Storage by Zapier fetch error:", err);
    return null;
  }
}

// Pulls the four per-path counters the RigHouse AV Make scenario increments
// in the "RigHouse AV Path Counters" Data Store (one Get-a-record ->
// Update-a-record pair per Router route: Business Lead, Consumer Lead,
// Card Order, Net-30 Order). Mirrors zapier-stats.js so the dashboard can
// show both automation platforms' counters side by side.
//
// Verified live (2026-08-15) against the real Make API:
//   GET https://us2.make.com/api/v2/data-stores/{dataStoreId}/data
//   Header: Authorization: Token <MAKE_API_TOKEN>
// Response shape: { records: [ { key, data: { count, path } }, ... ], count, ... }
// (confirmed via Make's own API reference docs -- developers.make.com --
// and by inspecting the actual "RigHouse AV Path Counters" data store,
// org 2193870, store ID 132225, zone us2).
//
// The data store ID and zone are specific to this Make org's setup, not
// secrets, so they're hardcoded here the same way the Storage-by-Zapier
// base URL is hardcoded in zapier-stats.js. Only the API token is secret.

export const MAKE_STORE_KEYS = [
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

const MAKE_ZONE = "us2";
const MAKE_DATA_STORE_ID = "132225";

// Returns an array of { key, label, value } for the 4 known counters, or
// null if MAKE_API_TOKEN isn't configured or the fetch/parse fails for any
// reason. Never throws.
export async function getMakeStats(token, fetchImpl = fetch) {
  if (!token) return null;

  const url = `https://${MAKE_ZONE}.make.com/api/v2/data-stores/${MAKE_DATA_STORE_ID}/data?pg[limit]=50`;

  try {
    const res = await fetchImpl(url, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`Make data store fetch failed: HTTP ${res.status}`);
      return null;
    }

    const body = await res.json();
    const values = Object.fromEntries(MAKE_STORE_KEYS.map((k) => [k, 0]));

    const records = Array.isArray(body?.records) ? body.records : null;
    if (records) {
      for (const rec of records) {
        const key = rec?.key;
        if (key && key in values) {
          const num = Number(rec?.data?.count);
          values[key] = Number.isFinite(num) ? num : rec?.data?.count ?? 0;
        }
      }
    }

    return MAKE_STORE_KEYS.map((key) => ({ key, label: LABELS[key], value: values[key] }));
  } catch (err) {
    console.error("Make data store fetch error:", err);
    return null;
  }
}

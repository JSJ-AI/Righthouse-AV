// Plain Node test -- exercises the response parsing in zapier-stats.js.
// Covers the confirmed live shape (a flat { key: value } map, verified
// 2026-08-14 against the real store.zapier.com API) plus a couple of
// array-shaped fallbacks kept for defense. Run with:
//   node test/zapier-stats.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { getZapierStats, ZAPIER_STORE_KEYS } from "../src/zapier-stats.js";

function fakeFetch(body, ok = true, status = 200) {
  return async () => ({
    ok,
    status,
    json: async () => body,
  });
}

test("returns null when no secret is configured", async () => {
  const stats = await getZapierStats(undefined, fakeFetch({ results: [] }));
  assert.equal(stats, null);
});

test("returns null (not throws) on a non-2xx response", async () => {
  const stats = await getZapierStats("secret123", fakeFetch({}, false, 500));
  assert.equal(stats, null);
});

test("returns null (not throws) when fetch itself rejects", async () => {
  const throwingFetch = async () => {
    throw new Error("network down");
  };
  const stats = await getZapierStats("secret123", throwingFetch);
  assert.equal(stats, null);
});

test("parses the confirmed live flat { key: value } map shape", async () => {
  const body = {
    business_leads_count: 8,
    card_orders_count: 9,
    consumer_leads_count: 10,
    net30_orders_count: 4,
  };
  const stats = await getZapierStats("secret123", fakeFetch(body));
  const byKey = Object.fromEntries(stats.map((s) => [s.key, s.value]));
  assert.equal(byKey.business_leads_count, 8);
  assert.equal(byKey.card_orders_count, 9);
  assert.equal(byKey.consumer_leads_count, 10);
  assert.equal(byKey.net30_orders_count, 4);
});

test("parses a bare-array response shape (fallback)", async () => {
  const body = [
    { key: "business_leads_count", value: "5" },
    { key: "consumer_leads_count", value: "2" },
  ];
  const stats = await getZapierStats("secret123", fakeFetch(body));
  assert.ok(stats);
  assert.equal(stats.length, ZAPIER_STORE_KEYS.length);
  const byKey = Object.fromEntries(stats.map((s) => [s.key, s.value]));
  assert.equal(byKey.business_leads_count, 5);
  assert.equal(byKey.consumer_leads_count, 2);
  // Keys with no matching record still show up, defaulted to 0.
  assert.equal(byKey.card_orders_count, 0);
  assert.equal(byKey.net30_orders_count, 0);
});

test("parses a { results: [...] } response shape", async () => {
  const body = { results: [{ key: "card_orders_count", value: 3 }] };
  const stats = await getZapierStats("secret123", fakeFetch(body));
  const byKey = Object.fromEntries(stats.map((s) => [s.key, s.value]));
  assert.equal(byKey.card_orders_count, 3);
});

test("parses a { records: [...] } response shape", async () => {
  const body = { records: [{ key: "net30_orders_count", value: 7 }] };
  const stats = await getZapierStats("secret123", fakeFetch(body));
  const byKey = Object.fromEntries(stats.map((s) => [s.key, s.value]));
  assert.equal(byKey.net30_orders_count, 7);
});

test("unrecognized response shape degrades to all-zero rather than throwing", async () => {
  const stats = await getZapierStats("secret123", fakeFetch({ totally: "unexpected" }));
  assert.ok(stats);
  for (const s of stats) assert.equal(s.value, 0);
});

// Plain Node test -- exercises the response parsing in make-stats.js.
// Covers the confirmed live shape (verified 2026-08-15 against Make's own
// API reference docs and the real "RigHouse AV Path Counters" data store):
// { records: [ { key, data: { count, path } }, ... ] }. Run with:
//   node test/make-stats.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { getMakeStats, MAKE_STORE_KEYS } from "../src/make-stats.js";

function fakeFetch(body, ok = true, status = 200) {
  return async () => ({
    ok,
    status,
    json: async () => body,
  });
}

test("returns null when no token is configured", async () => {
  const stats = await getMakeStats(undefined, fakeFetch({ records: [] }));
  assert.equal(stats, null);
});

test("returns null (not throws) on a non-2xx response", async () => {
  const stats = await getMakeStats("token123", fakeFetch({}, false, 500));
  assert.equal(stats, null);
});

test("returns null (not throws) when fetch itself rejects", async () => {
  const throwingFetch = async () => {
    throw new Error("network down");
  };
  const stats = await getMakeStats("token123", throwingFetch);
  assert.equal(stats, null);
});

test("parses the confirmed live { records: [{ key, data: { count, path } }] } shape", async () => {
  const body = {
    records: [
      { key: "business_leads_count", data: { count: 4, path: "business_leads_count" } },
      { key: "consumer_leads_count", data: { count: 1, path: "consumer_leads_count" } },
      { key: "card_orders_count", data: { count: 8, path: "card_orders_count" } },
      { key: "net30_orders_count", data: { count: 2, path: "net30_orders_count" } },
    ],
    count: 4,
  };
  const stats = await getMakeStats("token123", fakeFetch(body));
  const byKey = Object.fromEntries(stats.map((s) => [s.key, s.value]));
  assert.equal(byKey.business_leads_count, 4);
  assert.equal(byKey.consumer_leads_count, 1);
  assert.equal(byKey.card_orders_count, 8);
  assert.equal(byKey.net30_orders_count, 2);
});

test("keys missing from the response default to 0", async () => {
  const body = { records: [{ key: "card_orders_count", data: { count: 6 } }] };
  const stats = await getMakeStats("token123", fakeFetch(body));
  assert.ok(stats);
  assert.equal(stats.length, MAKE_STORE_KEYS.length);
  const byKey = Object.fromEntries(stats.map((s) => [s.key, s.value]));
  assert.equal(byKey.card_orders_count, 6);
  assert.equal(byKey.business_leads_count, 0);
  assert.equal(byKey.consumer_leads_count, 0);
  assert.equal(byKey.net30_orders_count, 0);
});

test("unrecognized response shape degrades to all-zero rather than throwing", async () => {
  const stats = await getMakeStats("token123", fakeFetch({ totally: "unexpected" }));
  assert.ok(stats);
  for (const s of stats) assert.equal(s.value, 0);
});

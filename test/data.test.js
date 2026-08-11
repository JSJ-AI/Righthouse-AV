// Plain Node test -- no wrangler/Workers runtime needed, since data.js has
// no Cloudflare-specific dependencies. Run with: node test/data.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { generateLead, generateOrder, PLANS, ADDONS } from "../src/data.js";

const PLAN_IDS = new Set(PLANS.map((p) => p.id));

test("generateLead produces a well-formed lead.created event", () => {
  const lead = generateLead();

  assert.equal(lead.event, "lead.created");
  assert.match(lead.id, /^lead_[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(lead.timestamp)));

  assert.ok(lead.contact.first_name.length > 0);
  assert.ok(lead.contact.last_name.length > 0);
  assert.match(lead.contact.email, /^[a-z]+\.[a-z]+@[a-z0-9]+\.example$/);
  assert.match(lead.contact.phone, /^\(\d{3}\) 555-01\d{2}$/);

  assert.ok(lead.company.name.length > 0);
  assert.match(lead.company.domain, /\.example$/);

  assert.ok(lead.interest_plan === null || PLAN_IDS.has(lead.interest_plan));
  assert.equal(lead.status, "new");
});

test("generateOrder(null) produces a direct order with no lead_id", () => {
  const order = generateOrder(null);

  assert.equal(order.event, "order.created");
  assert.match(order.id, /^order_[0-9a-f-]{36}$/);
  assert.equal(order.lead_id, null);
  assert.ok(PLAN_IDS.has(order.plan.id));
  assert.ok(["monthly", "annual"].includes(order.plan.billing_cycle));
  assert.ok(order.customer.email.endsWith(".example"));
  assert.equal(order.status, "paid");

  const addonTotal = order.addons.reduce((s, a) => s + a.price, 0);
  assert.equal(order.amount_total, Number((order.plan.price + addonTotal).toFixed(2)));
});

test("generateOrder(lead) reuses the lead's contact info and sets lead_id", () => {
  const lead = generateLead();
  const order = generateOrder(lead);

  assert.equal(order.lead_id, lead.id);
  assert.equal(order.customer.email, lead.contact.email);
  assert.equal(order.customer.company_name, lead.company.name);
});

test("no exceptions and reasonable variety across many generations", () => {
  const emails = new Set();
  let nullInterestCount = 0;

  for (let i = 0; i < 500; i++) {
    const lead = generateLead();
    emails.add(lead.contact.email);
    if (lead.interest_plan === null) nullInterestCount++;
    generateOrder(Math.random() < 0.5 ? lead : null);
  }

  // Expect meaningful variety, not the same 2-3 names repeating.
  assert.ok(emails.size > 300, `expected high email variety, got ${emails.size}/500`);
  // ~15% of leads should have no plan interest -- allow a wide tolerance
  // since this is a random draw, just guarding against a logic inversion.
  assert.ok(
    nullInterestCount > 20 && nullInterestCount < 150,
    `interest_plan null rate looked off: ${nullInterestCount}/500`
  );
});

test("ADDONS and PLANS catalogs are non-empty and priced", () => {
  assert.ok(PLANS.length >= 2);
  assert.ok(ADDONS.length >= 1);
  for (const p of PLANS) {
    assert.ok(p.price_monthly > 0);
    assert.ok(p.price_annual > 0);
  }
});

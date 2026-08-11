// Plain Node test -- no wrangler/Workers runtime needed, since data.js has
// no Cloudflare-specific dependencies. Run with: node test/data.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { generateLead, generateOrder } from "../src/data.js";
import { PRODUCTS, ORG_TYPES, CATEGORIES } from "../src/business-config.js";

const SKUS = new Set(PRODUCTS.map((p) => p.sku));
const ORG_TYPE_SET = new Set(ORG_TYPES);
const CATEGORY_SET = new Set(CATEGORIES);

test("generateLead produces a well-formed lead.created event (consumer or business)", () => {
  const lead = generateLead();

  assert.equal(lead.event, "lead.created");
  assert.match(lead.id, /^lead_[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(lead.timestamp)));
  assert.ok(["consumer", "business"].includes(lead.customer_type));
  assert.ok(CATEGORY_SET.has(lead.interest_category));
  assert.equal(lead.status, "new");

  assert.ok(lead.contact.first_name.length > 0);
  assert.ok(lead.contact.last_name.length > 0);
  assert.match(lead.contact.email, /^[a-z]+\.[a-z]+@[a-z0-9]+\.example$/);
  assert.match(lead.contact.phone, /^\(\d{3}\) 555-01\d{2}$/);

  if (lead.customer_type === "business") {
    assert.ok(lead.organization);
    assert.ok(ORG_TYPE_SET.has(lead.organization.type));
    assert.ok(lead.organization.name.length > 0);
    assert.ok(lead.contact.title);
    assert.equal(lead.role, null);
  } else {
    assert.equal(lead.organization, null);
    assert.equal(lead.contact.title, null);
    assert.ok(lead.role);
  }
});

test("generateOrder(null) produces a direct order with no lead_id", () => {
  const order = generateOrder(null);

  assert.equal(order.event, "order.created");
  assert.match(order.id, /^order_[0-9a-f-]{36}$/);
  assert.equal(order.lead_id, null);
  assert.ok(["consumer", "business"].includes(order.customer_type));
  assert.ok(order.items.length >= 1);
  assert.ok(["card", "net_30"].includes(order.payment_terms));
  assert.ok(["paid", "invoiced"].includes(order.status));
  assert.equal(order.status, order.payment_terms === "net_30" ? "invoiced" : "paid");
  assert.ok(order.customer.email.endsWith(".example"));

  for (const item of order.items) {
    assert.ok(SKUS.has(item.sku), `unknown sku ${item.sku}`);
    assert.equal(item.line_total, Number((item.unit_price * item.qty).toFixed(2)));
  }

  const subtotal = Number(order.items.reduce((s, it) => s + it.line_total, 0).toFixed(2));
  assert.equal(order.subtotal, subtotal);
  assert.equal(
    order.amount_total,
    Number((order.subtotal + order.shipping_cost + order.tax).toFixed(2))
  );

  if (order.payment_terms === "net_30") {
    assert.match(order.po_number, /^PO-\d{5}$/);
  } else {
    assert.equal(order.po_number, null);
  }
});

test("generateOrder(lead) reuses the lead's contact info and sets lead_id", () => {
  const lead = generateLead();
  const order = generateOrder(lead);

  assert.equal(order.lead_id, lead.id);
  assert.equal(order.customer_type, lead.customer_type);
  assert.equal(order.customer.email, lead.contact.email);
  assert.equal(
    order.customer.organization_name,
    lead.organization ? lead.organization.name : null
  );
});

test("business orders tend to have larger baskets than consumer orders", () => {
  let consumerItemCounts = [];
  let businessItemCounts = [];

  for (let i = 0; i < 200; i++) {
    const order = generateOrder(null);
    if (order.customer_type === "consumer") consumerItemCounts.push(order.items.length);
    else businessItemCounts.push(order.items.length);
  }

  assert.ok(consumerItemCounts.length > 20 && businessItemCounts.length > 20);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  assert.ok(
    avg(businessItemCounts) > avg(consumerItemCounts),
    `expected business baskets to average larger: consumer=${avg(consumerItemCounts)} business=${avg(businessItemCounts)}`
  );
});

test("no exceptions and reasonable variety across many generations", () => {
  const emails = new Set();
  let businessCount = 0;

  for (let i = 0; i < 500; i++) {
    const lead = generateLead();
    emails.add(lead.contact.email);
    if (lead.customer_type === "business") businessCount++;
    generateOrder(Math.random() < 0.5 ? lead : null);
  }

  assert.ok(emails.size > 300, `expected high email variety, got ${emails.size}/500`);
  // ~45% of leads should be business -- wide tolerance, just guards against
  // a logic inversion (e.g. all-consumer or all-business).
  assert.ok(
    businessCount > 100 && businessCount < 350,
    `business lead rate looked off: ${businessCount}/500`
  );
});

test("PRODUCTS catalog is well-formed", () => {
  assert.ok(PRODUCTS.length >= 10);
  for (const p of PRODUCTS) {
    assert.ok(p.sku && p.brand && p.name && p.category && p.price > 0);
    assert.ok(["consumer", "business", "both"].includes(p.tier));
    assert.ok(CATEGORY_SET.has(p.category));
  }
});

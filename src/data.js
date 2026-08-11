// Fake-data generation for the simulated business. All business-specific
// facts (name, product catalog, customer archetypes) live in
// business-config.js -- this file is just the generic machinery that turns
// that config into realistic lead/order events. Swap business-config.js to
// reskin the whole generator for a different business.
//
// No Cloudflare-specific APIs here except crypto.randomUUID, which is
// standard Web Crypto -- available in Workers AND in Node.js (18.17+,
// global, no import needed) -- so this file is unit-testable with plain
// `node test/data.test.js`, no wrangler required.

import {
  BUSINESS_NAME,
  CATEGORIES,
  PRODUCTS,
  CONSUMER_ROLES,
  CONSUMER_BUDGET_BANDS,
  CONSUMER_LEAD_MESSAGES,
  ORG_TYPES,
  TITLES,
  BUSINESS_BUDGET_BANDS,
  BUSINESS_LEAD_MESSAGES,
  SOURCES,
  SHIP_LOCATIONS,
  randomOrgName,
} from "./business-config.js";

export const FIRST_NAMES = [
  "Olivia", "Liam", "Emma", "Noah", "Ava", "Elijah", "Sophia", "James",
  "Isabella", "Benjamin", "Mia", "Lucas", "Charlotte", "Henry", "Amelia",
  "Alexander", "Harper", "Daniel", "Evelyn", "Michael", "Abigail", "Ethan",
  "Emily", "Jacob", "Elizabeth", "Priya", "Rohan", "Wei", "Fatima", "Diego",
  "Sofia", "Kwame", "Yuki", "Aisha", "Carlos", "Nadia", "Omar", "Ingrid",
  "Sana", "Mateo",
];

export const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Patel", "Kim", "Chen", "Nguyen",
  "Okafor", "Kowalski", "Haddad", "Larsen", "Rossi", "Dubois",
];

// NANPA reserves the 555-0100 through 555-0199 range for fictional use
// (film, TV, testing) -- combined with a real area code this guarantees
// the generated numbers can never collide with an in-service line.
const AREA_CODES = ["212", "310", "415", "512", "617", "702", "206", "303", "404", "602"];

const CONSUMER_LEAD_RATE = 0.55; // share of leads that are individual consumers vs. businesses
const LEAD_TICK_RATE = 0.55; // chance any given tick emits a lead
const ORDER_TICK_RATE = 0.35; // chance any given tick emits an order
const ORDER_FROM_LEAD_RATE = 0.7; // of orders, share that convert an existing lead vs. a fresh direct order
const CROSSOVER_PRODUCT_RATE = 0.12; // chance an order includes a product outside its usual tier

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function randomPhone() {
  const area = pick(AREA_CODES);
  const line = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `(${area}) 555-01${line}`;
}

// All generated emails resolve under the .example TLD, which RFC 2606
// reserves specifically for documentation/testing so it can never be a
// real, deliverable inbox -- important since this data flows into real
// Make/Zapier automations that might otherwise try to email it.
function emailFor(first, last, domain) {
  return `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
}

function domainFor(name) {
  return `${slugify(name)}.example`;
}

function randomPerson() {
  return { first: pick(FIRST_NAMES), last: pick(LAST_NAMES) };
}

export function generateLead() {
  const isConsumer = Math.random() < CONSUMER_LEAD_RATE;
  const { first, last } = randomPerson();
  const timestamp = new Date().toISOString();
  const id = `lead_${crypto.randomUUID()}`;

  if (isConsumer) {
    const domain = domainFor(`${first}${last}`);
    return {
      event: "lead.created",
      id,
      timestamp,
      customer_type: "consumer",
      contact: {
        first_name: first,
        last_name: last,
        email: emailFor(first, last, domain),
        phone: randomPhone(),
        title: null,
      },
      organization: null,
      role: pick(CONSUMER_ROLES),
      source: pick(SOURCES),
      interest_category: pick(CATEGORIES),
      budget_band: pick(CONSUMER_BUDGET_BANDS),
      message: pick(CONSUMER_LEAD_MESSAGES),
      status: "new",
    };
  }

  const orgType = pick(ORG_TYPES);
  const orgName = randomOrgName(orgType, pick);
  const domain = domainFor(orgName);
  return {
    event: "lead.created",
    id,
    timestamp,
    customer_type: "business",
    contact: {
      first_name: first,
      last_name: last,
      email: emailFor(first, last, domain),
      phone: randomPhone(),
      title: pick(TITLES),
    },
    organization: { name: orgName, type: orgType },
    role: null,
    source: pick(SOURCES),
    interest_category: pick(CATEGORIES),
    budget_band: pick(BUSINESS_BUDGET_BANDS),
    message: pick(BUSINESS_LEAD_MESSAGES),
    status: "new",
  };
}

function pickItemsForOrder(customerType) {
  const primaryPool = PRODUCTS.filter((p) => p.tier === customerType || p.tier === "both");
  const crossoverPool = PRODUCTS.filter((p) => p.tier !== customerType && p.tier !== "both");
  const itemCount = customerType === "consumer" ? randInt(1, 3) : randInt(3, 7);

  const items = [];
  const used = new Set();

  for (let i = 0; i < itemCount; i++) {
    const useCrossover = Math.random() < CROSSOVER_PRODUCT_RATE && crossoverPool.length > 0;
    const product = pick(useCrossover ? crossoverPool : primaryPool);
    if (used.has(product.sku)) continue;
    used.add(product.sku);

    let qty;
    if (customerType === "business") {
      qty = product.price > 500 ? randInt(1, 3) : randInt(2, 8);
    } else {
      qty = product.price < 50 ? randInt(1, 3) : 1;
    }

    items.push({
      sku: product.sku,
      brand: product.brand,
      name: product.name,
      category: product.category,
      unit_price: product.price,
      qty,
      line_total: Number((product.price * qty).toFixed(2)),
    });
  }

  // Guarantee at least one item even if every draw collided.
  if (items.length === 0) {
    const product = pick(primaryPool);
    items.push({
      sku: product.sku,
      brand: product.brand,
      name: product.name,
      category: product.category,
      unit_price: product.price,
      qty: 1,
      line_total: product.price,
    });
  }

  return items;
}

function generateDirectCustomer(customerType) {
  const { first, last } = randomPerson();
  if (customerType === "consumer") {
    const domain = domainFor(`${first}${last}`);
    return {
      first_name: first,
      last_name: last,
      email: emailFor(first, last, domain),
      organization_name: null,
    };
  }
  const orgType = pick(ORG_TYPES);
  const orgName = randomOrgName(orgType, pick);
  const domain = domainFor(orgName);
  return {
    first_name: first,
    last_name: last,
    email: emailFor(first, last, domain),
    organization_name: orgName,
  };
}

// If `lead` is provided, the order is that lead's conversion (same person /
// organization). If omitted, it's a "direct" order with no prior lead
// record -- useful for demoing flows that don't assume a CRM match exists.
export function generateOrder(lead = null) {
  const customerType = lead ? lead.customer_type : Math.random() < CONSUMER_LEAD_RATE ? "consumer" : "business";

  const customer = lead
    ? {
        first_name: lead.contact.first_name,
        last_name: lead.contact.last_name,
        email: lead.contact.email,
        organization_name: lead.organization ? lead.organization.name : null,
      }
    : generateDirectCustomer(customerType);

  const items = pickItemsForOrder(customerType);
  const subtotal = Number(items.reduce((s, it) => s + it.line_total, 0).toFixed(2));

  const shippingCost =
    customerType === "consumer" ? (subtotal > 150 ? 0 : 19.99) : subtotal > 1000 ? 0 : 89;

  // Flat example rate for demo purposes -- swap for your actual jurisdiction's rate.
  const tax = Number((subtotal * 0.0725).toFixed(2));
  const amountTotal = Number((subtotal + shippingCost + tax).toFixed(2));

  const isNet30 = customerType === "business" && Math.random() < 0.4;
  const paymentTerms = isNet30 ? "net_30" : "card";
  const poNumber = isNet30 ? `PO-${randInt(10000, 99999)}` : null;

  const shipTo = pick(SHIP_LOCATIONS);

  return {
    event: "order.created",
    id: `order_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    lead_id: lead ? lead.id : null,
    customer_type: customerType,
    customer,
    shipping: { city: shipTo.city, state: shipTo.state },
    items,
    item_count: items.reduce((s, it) => s + it.qty, 0),
    subtotal,
    shipping_cost: shippingCost,
    tax,
    amount_total: amountTotal,
    currency: "USD",
    payment_terms: paymentTerms,
    po_number: poNumber,
    status: isNet30 ? "invoiced" : "paid",
  };
}

export {
  BUSINESS_NAME,
  CATEGORIES,
  PRODUCTS,
  LEAD_TICK_RATE,
  ORDER_TICK_RATE,
  ORDER_FROM_LEAD_RATE,
};

// Pure fake-data generation for the "J2 Analytics" simulated business.
// No Cloudflare-specific APIs here except crypto.randomUUID, which is a
// standard Web Crypto API available in Workers, modern browsers, AND
// Node.js (18.17+ globally, no import needed) -- so this file can be
// unit-tested with plain `node test/data.test.js`, no wrangler required.

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

export const COMPANY_PREFIXES = [
  "Bright Path", "Northwind", "Vertex", "Summit", "Clearwater", "Ironclad",
  "Bluepeak", "Cascade", "Redstone", "Silverline", "Evergreen", "Foundry",
  "Lighthouse", "Anchor", "Meridian", "Outpost", "Harbor", "Granite",
  "Windward", "Junction", "Beacon", "Cobalt", "Pinnacle", "Tidewater",
  "Sequoia", "Waypoint", "Ember", "Fieldstone", "Highline", "Northgate",
];

export const COMPANY_SUFFIXES = [
  "Analytics", "Systems", "Labs", "Group", "Partners", "Solutions",
  "Ventures", "Collective", "Works", "Technologies", "Logistics",
  "Digital", "Studio", "Industries", "Networks",
];

export const INDUSTRIES = [
  "SaaS", "E-commerce", "Healthcare", "Logistics", "Fintech", "EdTech",
  "Manufacturing", "Marketing Agency", "Real Estate", "Nonprofit",
];

export const EMPLOYEE_BANDS = ["1-10", "11-50", "51-200", "201-500", "500+"];

export const SOURCES = [
  "Google Ads", "LinkedIn Ads", "Organic Search", "Referral", "Webinar",
  "Content Download", "Cold Outreach", "Product Hunt", "Partner Program",
];

// NANPA reserves the 555-0100 through 555-0199 range for fictional use
// (film, TV, testing) -- combined with a real area code this guarantees
// the generated numbers can never collide with an in-service line.
const AREA_CODES = [
  "212", "310", "415", "512", "617", "702", "206", "303", "404", "602",
];

export const PLANS = [
  { id: "starter", name: "Starter", price_monthly: 29, price_annual: 290 },
  { id: "growth", name: "Growth", price_monthly: 99, price_annual: 990 },
  { id: "scale", name: "Scale", price_monthly: 299, price_annual: 2990 },
];

export const ADDONS = [
  { id: "extra_seats", name: "Extra Seats (5-pack)", price: 49 },
  { id: "priority_support", name: "Priority Support", price: 79 },
  { id: "custom_dashboards", name: "Custom Dashboard Build", price: 199 },
];

export const LEAD_MESSAGES = [
  "Looking to consolidate our reporting into one dashboard.",
  "Evaluating analytics tools ahead of next quarter's rollout.",
  "Referred by a colleague, interested in a demo.",
  "Downloaded the benchmarking whitepaper and want to learn more.",
  "Comparing J2 Analytics against our current BI tool.",
  "Need better real-time visibility into product usage.",
  "Our current dashboard can't keep up with our data volume.",
  "Exploring options after a webinar on funnel analytics.",
  "Free trial ended and the team wants to talk pricing.",
  "Board asked for better reporting before the next review.",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function randomPhone() {
  const area = pick(AREA_CODES);
  const line = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `(${area}) 555-01${line}`;
}

export function randomCompanyName() {
  return `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`;
}

// All generated emails resolve under the .example TLD, which RFC 2606
// reserves specifically for documentation/testing so it can never be a
// real, deliverable inbox -- important since this data flows into real
// Make/Zapier automations that might otherwise try to email it.
function emailFor(first, last, domain) {
  return `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
}

export function generateLead() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const company = randomCompanyName();
  const domain = `${slugify(company)}.example`;
  const interestPlan = Math.random() < 0.15 ? null : pick(PLANS).id;

  return {
    event: "lead.created",
    id: `lead_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    contact: {
      first_name: first,
      last_name: last,
      email: emailFor(first, last, domain),
      phone: randomPhone(),
    },
    company: {
      name: company,
      domain,
      industry: pick(INDUSTRIES),
      employee_band: pick(EMPLOYEE_BANDS),
    },
    source: pick(SOURCES),
    interest_plan: interestPlan,
    message: pick(LEAD_MESSAGES),
    status: "new",
  };
}

function generateDirectCustomer() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const company = randomCompanyName();
  const domain = `${slugify(company)}.example`;
  return {
    first_name: first,
    last_name: last,
    email: emailFor(first, last, domain),
    company_name: company,
  };
}

// If `lead` is provided, the order is that lead's conversion (same person,
// same company). If omitted, it's a "direct" self-serve order with no
// prior lead record -- useful for demoing flows that don't assume a CRM
// match already exists.
export function generateOrder(lead = null) {
  const plan = lead?.interest_plan
    ? PLANS.find((p) => p.id === lead.interest_plan) ?? pick(PLANS)
    : pick(PLANS);

  const billingCycle = Math.random() < 0.3 ? "annual" : "monthly";
  const planPrice = billingCycle === "annual" ? plan.price_annual : plan.price_monthly;
  const addons = ADDONS.filter(() => Math.random() < 0.25);
  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);

  const customer = lead
    ? {
        first_name: lead.contact.first_name,
        last_name: lead.contact.last_name,
        email: lead.contact.email,
        company_name: lead.company.name,
      }
    : generateDirectCustomer();

  return {
    event: "order.created",
    id: `order_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    lead_id: lead ? lead.id : null,
    customer,
    plan: { id: plan.id, name: plan.name, billing_cycle: billingCycle, price: planPrice },
    addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
    amount_total: Number((planPrice + addonsTotal).toFixed(2)),
    currency: "USD",
    status: "paid",
  };
}

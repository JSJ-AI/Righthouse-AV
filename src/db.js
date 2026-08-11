// Thin D1 helpers. This is internal bookkeeping only (so the generator
// remembers which leads have already converted) -- Make/Zapier never touch
// this database, they only ever see the webhook payloads.

export async function saveLead(db, lead) {
  await db
    .prepare(
      `INSERT INTO leads (id, created_at, first_name, last_name, email, company_name, source, interest_plan, converted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(
      lead.id,
      lead.timestamp,
      lead.contact.first_name,
      lead.contact.last_name,
      lead.contact.email,
      lead.company.name,
      lead.source,
      lead.interest_plan
    )
    .run();
}

export async function saveOrder(db, order) {
  await db
    .prepare(
      `INSERT INTO orders (id, created_at, lead_id, plan_id, billing_cycle, amount_total)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      order.id,
      order.timestamp,
      order.lead_id,
      order.plan.id,
      order.plan.billing_cycle,
      order.amount_total
    )
    .run();
}

export async function pickUnconvertedLead(db) {
  const row = await db
    .prepare(`SELECT * FROM leads WHERE converted = 0 ORDER BY RANDOM() LIMIT 1`)
    .first();
  if (!row) return null;

  // Reconstruct a lead-shaped object matching generateLead()'s output
  // closely enough for generateOrder() to consume.
  return {
    id: row.id,
    contact: {
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
    },
    company: { name: row.company_name },
    interest_plan: row.interest_plan,
  };
}

export async function markLeadConverted(db, leadId) {
  await db.prepare(`UPDATE leads SET converted = 1 WHERE id = ?`).bind(leadId).run();
}

export async function recentLeads(db, limit = 20) {
  const { results } = await db
    .prepare(`SELECT * FROM leads ORDER BY created_at DESC LIMIT ?`)
    .bind(limit)
    .all();
  return results ?? [];
}

export async function recentOrders(db, limit = 20) {
  const { results } = await db
    .prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`)
    .bind(limit)
    .all();
  return results ?? [];
}

export async function counts(db) {
  const leadRow = await db.prepare(`SELECT COUNT(*) AS n FROM leads`).first();
  const orderRow = await db.prepare(`SELECT COUNT(*) AS n FROM orders`).first();
  const convertedRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM leads WHERE converted = 1`)
    .first();
  return {
    leads: leadRow?.n ?? 0,
    orders: orderRow?.n ?? 0,
    converted: convertedRow?.n ?? 0,
  };
}

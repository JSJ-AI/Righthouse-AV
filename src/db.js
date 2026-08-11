// Thin D1 helpers. This is internal bookkeeping only (so the generator
// remembers which leads have already converted) -- Make/Zapier never touch
// this database, they only ever see the webhook payloads.

export async function saveLead(db, lead) {
  await db
    .prepare(
      `INSERT INTO leads (id, created_at, customer_type, first_name, last_name, email, organization_name, organization_type, source, interest_category, converted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(
      lead.id,
      lead.timestamp,
      lead.customer_type,
      lead.contact.first_name,
      lead.contact.last_name,
      lead.contact.email,
      lead.organization ? lead.organization.name : null,
      lead.organization ? lead.organization.type : null,
      lead.source,
      lead.interest_category
    )
    .run();
}

export async function saveOrder(db, order) {
  await db
    .prepare(
      `INSERT INTO orders (id, created_at, lead_id, customer_type, item_count, subtotal, amount_total, payment_terms, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      order.id,
      order.timestamp,
      order.lead_id,
      order.customer_type,
      order.item_count,
      order.subtotal,
      order.amount_total,
      order.payment_terms,
      order.status
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
    customer_type: row.customer_type,
    contact: {
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
    },
    organization: row.organization_name
      ? { name: row.organization_name, type: row.organization_type }
      : null,
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

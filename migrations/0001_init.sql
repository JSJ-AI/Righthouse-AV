-- Internal bookkeeping only. Make/Zapier never read this database directly --
-- they receive events via webhook. This just lets the generator remember
-- which leads have already "converted" to an order.

CREATE TABLE IF NOT EXISTS leads (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  source        TEXT NOT NULL,
  interest_plan TEXT,
  converted     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  lead_id       TEXT,
  plan_id       TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount_total  REAL NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(converted);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

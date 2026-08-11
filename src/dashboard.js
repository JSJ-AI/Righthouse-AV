function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export function renderDashboard({ businessName, stats, leads, orders, cronSchedule }) {
  const conversionRate = stats.leads > 0 ? ((stats.converted / stats.leads) * 100).toFixed(1) : "0.0";

  const leadRows = leads
    .map(
      (l) => `<tr>
        <td>${esc(l.created_at)}</td>
        <td>${esc(l.first_name)} ${esc(l.last_name)}</td>
        <td>${esc(l.company_name)}</td>
        <td>${esc(l.source)}</td>
        <td>${l.converted ? "converted" : "new"}</td>
      </tr>`
    )
    .join("");

  const orderRows = orders
    .map(
      (o) => `<tr>
        <td>${esc(o.created_at)}</td>
        <td>${esc(o.plan_id)}</td>
        <td>${esc(o.billing_cycle)}</td>
        <td>$${esc(o.amount_total)}</td>
        <td>${o.lead_id ? "from lead" : "direct"}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(businessName)} -- Data Faucet</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 960px; margin: 40px auto; padding: 0 20px; line-height: 1.5; }
  h1 { margin-bottom: 4px; }
  .sub { color: #6b7280; margin-top: 0; }
  .stats { display: flex; gap: 16px; margin: 24px 0; flex-wrap: wrap; }
  .stat { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px; min-width: 120px; }
  .stat .n { font-size: 28px; font-weight: 700; }
  .stat .l { color: #6b7280; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 32px; font-size: 14px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
  th { color: #6b7280; font-weight: 600; }
  code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; }
  .badge { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
</style>
</head>
<body>
  <h1>${esc(businessName)} <span class="badge">simulated business</span></h1>
  <p class="sub">Fake leads &amp; orders generated automatically every cron tick (<code>${esc(cronSchedule)}</code>) for Make/Zapier demos. Fire one on demand: <code>GET /fire</code>.</p>

  <div class="stats">
    <div class="stat"><div class="n">${stats.leads}</div><div class="l">total leads</div></div>
    <div class="stat"><div class="n">${stats.orders}</div><div class="l">total orders</div></div>
    <div class="stat"><div class="n">${conversionRate}%</div><div class="l">lead &rarr; order conversion</div></div>
  </div>

  <h2>Recent leads</h2>
  <table>
    <thead><tr><th>Time</th><th>Contact</th><th>Company</th><th>Source</th><th>Status</th></tr></thead>
    <tbody>${leadRows || `<tr><td colspan="5">No leads yet -- wait for the next cron tick or hit /fire.</td></tr>`}</tbody>
  </table>

  <h2>Recent orders</h2>
  <table>
    <thead><tr><th>Time</th><th>Plan</th><th>Billing</th><th>Amount</th><th>Origin</th></tr></thead>
    <tbody>${orderRows || `<tr><td colspan="5">No orders yet -- wait for the next cron tick or hit /fire.</td></tr>`}</tbody>
  </table>
</body>
</html>`;
}

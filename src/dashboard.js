function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function whoLead(l) {
  if (l.organization_name) return `${esc(l.first_name)} ${esc(l.last_name)} @ ${esc(l.organization_name)}`;
  return `${esc(l.first_name)} ${esc(l.last_name)}`;
}

const STYLE = `
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 1040px; margin: 40px auto; padding: 0 20px; line-height: 1.5; }
  h1 { margin-bottom: 4px; }
  .sub { color: #6b7280; margin-top: 0; }
  .nav { display: flex; gap: 4px; margin: 18px 0 28px; border-bottom: 1px solid #e5e7eb; }
  .nav a { display: inline-block; padding: 8px 14px; text-decoration: none; color: #6b7280; font-size: 14px; border-bottom: 2px solid transparent; }
  .nav a.active { color: #4338ca; border-bottom-color: #4338ca; font-weight: 600; }
  .nav a:hover { color: #111827; }
  .stats { display: flex; gap: 16px; margin: 24px 0; flex-wrap: wrap; }
  .stat { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px; min-width: 120px; }
  .stat .n { font-size: 28px; font-weight: 700; }
  .stat .l { color: #6b7280; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 32px; font-size: 14px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
  th { color: #6b7280; font-weight: 600; }
  code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; }
  .badge { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
  .cross-link { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
`;

function navBar(active) {
  const links = [
    { href: "/", label: "Overview", key: "overview" },
    { href: "/zapier", label: "Zapier", key: "zapier" },
    { href: "/make", label: "Make", key: "make" },
  ];
  return `<div class="nav">${links
    .map(
      (l) =>
        `<a href="${l.href}"${l.key === active ? ' class="active"' : ""}>${esc(l.label)}</a>`
    )
    .join("")}</div>`;
}

function pageShell(title, businessName, navHtml, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
  <h1>${esc(businessName)} <span class="badge">simulated business</span></h1>
  ${navHtml}
  ${bodyHtml}
</body>
</html>`;
}

function statsBlock(stats, notConfiguredMsg) {
  if (!stats) return `<p class="sub">${notConfiguredMsg}</p>`;
  return `<div class="stats">${stats
    .map(
      (s) =>
        `<div class="stat"><div class="n">${esc(s.value)}</div><div class="l">${esc(s.label)}</div></div>`
    )
    .join("")}</div>`;
}

const ZAPIER_NOT_CONFIGURED =
  'Not configured yet &mdash; set the <code>ZAPIER_STORAGE_SECRET</code> secret (<code>npm run secrets:zapier-storage</code>) to show live counts from the Zap\'s Storage by Zapier counters here.';
const MAKE_NOT_CONFIGURED =
  'Not configured yet &mdash; set the <code>MAKE_API_TOKEN</code> secret (<code>npm run secrets:make-token</code>) to show live counts from the Make Data Store counters here.';

export function renderDashboard({
  businessName,
  stats,
  leads,
  orders,
  cronSchedule,
  zapierStats,
  makeStats,
}) {
  const conversionRate = stats.leads > 0 ? ((stats.converted / stats.leads) * 100).toFixed(1) : "0.0";

  const leadRows = leads
    .map(
      (l) => `<tr>
        <td>${esc(l.created_at)}</td>
        <td>${l.customer_type === "business" ? "business" : "consumer"}</td>
        <td>${whoLead(l)}</td>
        <td>${esc(l.organization_type || "-")}</td>
        <td>${esc(l.source)}</td>
        <td>${l.converted ? "converted" : "new"}</td>
      </tr>`
    )
    .join("");

  const orderRows = orders
    .map(
      (o) => `<tr>
        <td>${esc(o.created_at)}</td>
        <td>${o.customer_type === "business" ? "business" : "consumer"}</td>
        <td>${o.item_count}</td>
        <td>$${esc(o.amount_total)}</td>
        <td>${esc(o.payment_terms)}</td>
        <td>${esc(o.status)}</td>
        <td>${o.lead_id ? "from lead" : "direct"}</td>
      </tr>`
    )
    .join("");

  const body = `
  <p class="sub">Fake leads &amp; orders generated automatically every cron tick (<code>${esc(cronSchedule)}</code>) for Make/Zapier demos. Fire one on demand: <code>GET /fire</code>.</p>

  <div class="stats">
    <div class="stat"><div class="n">${stats.leads}</div><div class="l">total leads</div></div>
    <div class="stat"><div class="n">${stats.orders}</div><div class="l">total orders</div></div>
    <div class="stat"><div class="n">${conversionRate}%</div><div class="l">lead &rarr; order conversion</div></div>
  </div>

  <h2>Zapier path counters <span class="badge">Storage by Zapier</span></h2>
  <p class="sub">How many events each Zap path (Business Lead / Consumer Lead / Card Order / Net Order) has actually processed, straight from the Zap's own counters. <a href="/zapier">View Zapier-only page &rarr;</a></p>
  ${statsBlock(zapierStats, ZAPIER_NOT_CONFIGURED)}

  <h2>Make path counters <span class="badge">Make Data Store</span></h2>
  <p class="sub">Same four routes (Business Lead / Consumer Lead / Card Order / Net-30 Order), this time from the Make scenario's Router paths and its Data Store counters. <a href="/make">View Make-only page &rarr;</a></p>
  ${statsBlock(makeStats, MAKE_NOT_CONFIGURED)}

  <h2>Recent leads</h2>
  <table>
    <thead><tr><th>Time</th><th>Type</th><th>Contact</th><th>Org type</th><th>Source</th><th>Status</th></tr></thead>
    <tbody>${leadRows || `<tr><td colspan="6">No leads yet -- wait for the next cron tick or hit /fire.</td></tr>`}</tbody>
  </table>

  <h2>Recent orders</h2>
  <table>
    <thead><tr><th>Time</th><th>Type</th><th>Items</th><th>Total</th><th>Terms</th><th>Status</th><th>Origin</th></tr></thead>
    <tbody>${orderRows || `<tr><td colspan="7">No orders yet -- wait for the next cron tick or hit /fire.</td></tr>`}</tbody>
  </table>`;

  return pageShell(`${businessName} -- Data Faucet`, businessName, navBar("overview"), body);
}

// Single-platform pages (/zapier, /make) -- deliberately lighter than the
// combined overview: just the overall funnel numbers for context plus that
// one platform's path counters, so the two pages can be opened side by side
// (or bookmarked separately) to watch whether the two automations' counts
// stay in sync or start to diverge over time.
export function renderPlatformDashboard({
  businessName,
  platformKey, // "zapier" | "make"
  platformLabel, // "Zapier" | "Make"
  badge, // "Storage by Zapier" | "Make Data Store"
  description,
  stats,
  platformStats,
  notConfiguredMsg,
  jsonEndpoint, // "/zapier-stats" | "/make-stats"
  otherPlatformPath, // "/make" | "/zapier"
  otherPlatformLabel, // "Make" | "Zapier"
}) {
  const conversionRate = stats.leads > 0 ? ((stats.converted / stats.leads) * 100).toFixed(1) : "0.0";

  const body = `
  <p class="sub">Overall funnel, for context (shared across both platforms):</p>
  <div class="stats">
    <div class="stat"><div class="n">${stats.leads}</div><div class="l">total leads</div></div>
    <div class="stat"><div class="n">${stats.orders}</div><div class="l">total orders</div></div>
    <div class="stat"><div class="n">${conversionRate}%</div><div class="l">lead &rarr; order conversion</div></div>
  </div>

  <h2>${esc(platformLabel)} path counters <span class="badge">${esc(badge)}</span></h2>
  <p class="sub">${description}</p>
  ${statsBlock(platformStats, notConfiguredMsg)}

  <p class="sub">Raw numbers as JSON: <a href="${jsonEndpoint}"><code>${jsonEndpoint}</code></a></p>

  <div class="cross-link">
    <p class="sub">Comparing against the other platform? <a href="${otherPlatformPath}">View the ${esc(otherPlatformLabel)}-only page &rarr;</a> or see both side by side on the <a href="/">Overview</a> page.</p>
  </div>`;

  return pageShell(
    `${businessName} -- ${platformLabel} counters`,
    businessName,
    navBar(platformKey),
    body
  );
}

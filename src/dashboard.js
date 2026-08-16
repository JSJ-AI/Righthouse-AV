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

  /* -- path-counter bar chart: colors are a validated colorblind-safe
     categorical palette (see dataviz skill), fixed order across every
     section so the same counter is always the same color. -- */
  .viz-root {
    color-scheme: light;
    --chart-surface:  #fcfcfb;
    --text-secondary: #52514e;
    --muted:          #898781;
    --grid:           #e1e0d9;
    --baseline:       #c3c2b7;
    --series-1: #2a78d6; /* blue   -- business leads */
    --series-2: #eb6834; /* orange -- consumer leads */
    --series-3: #1baf7a; /* aqua   -- card orders */
    --series-4: #eda100; /* yellow -- net-30 orders */
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) .viz-root {
      color-scheme: dark;
      --chart-surface:  #1a1a19;
      --text-secondary: #c3c2b7;
      --muted:          #898781;
      --grid:           #2c2c2a;
      --baseline:       #383835;
      --series-1: #3987e5;
      --series-2: #d95926;
      --series-3: #199e70;
      --series-4: #c98500;
    }
  }
  .platform-row { display: flex; gap: 24px; align-items: stretch; margin: 12px 0 20px; flex-wrap: wrap; }
  .platform-row .counters { flex: 1 1 320px; }
  .platform-row .chart-card {
    flex: 1 1 340px;
    background: var(--chart-surface);
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 14px 18px 10px;
  }
  .chart-card h3 { margin: 0 0 10px; font-size: 13px; color: var(--text-secondary); font-weight: 600; }
  .bar-chart { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: grid; grid-template-columns: 108px 1fr 40px; align-items: center; gap: 10px; }
  .bar-row .bar-label { font-size: 12px; color: var(--text-secondary); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-track { position: relative; height: 20px; border-bottom: 1px solid var(--baseline); }
  .bar-fill { position: absolute; left: 0; bottom: 0; height: 14px; border-radius: 4px 4px 0 0; }
  .bar-row .bar-value { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .legend { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--grid); }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
  .legend-swatch { width: 10px; height: 10px; border-radius: 2px; flex: none; }
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

// Fixed key -> chart-color-slot mapping, independent of array order, so the
// same counter is always the same color on every page (overview, /zapier,
// /make) -- "color follows the entity, never its rank/order".
const CHART_KEY_TO_SERIES = {
  business_leads_count: "--series-1",
  consumer_leads_count: "--series-2",
  card_orders_count: "--series-3",
  net30_orders_count: "--series-4",
};

// Right-side bar-chart card: same counters as statsBlock, shown as
// horizontal bars so the four numbers can be compared at a glance instead
// of read one by one. Bars are scaled relative to the largest of the four
// (not a fixed axis) since these are small demo counts, not a metric with a
// meaningful absolute ceiling.
function chartCard(stats, notConfiguredMsg) {
  if (!stats) {
    return `<div class="chart-card"><h3>Path counters, at a glance</h3><p class="sub" style="margin:0;">${notConfiguredMsg}</p></div>`;
  }
  const maxValue = Math.max(0, ...stats.map((s) => Number(s.value) || 0));
  const bars = stats
    .map((s) => {
      const value = Number(s.value) || 0;
      const seriesVar = CHART_KEY_TO_SERIES[s.key] || "--muted";
      let pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
      if (value > 0 && pct < 4) pct = 4; // keep a visible sliver for small-but-nonzero counts
      return `<div class="bar-row">
        <div class="bar-label">${esc(s.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${pct}%; background: var(${seriesVar});"></div></div>
        <div class="bar-value">${esc(s.value)}</div>
      </div>`;
    })
    .join("");
  const legend = stats
    .map((s) => {
      const seriesVar = CHART_KEY_TO_SERIES[s.key] || "--muted";
      return `<div class="legend-item"><span class="legend-swatch" style="background: var(${seriesVar});"></span>${esc(s.label)}</div>`;
    })
    .join("");
  return `<div class="chart-card">
    <h3>Path counters, at a glance</h3>
    <div class="bar-chart">${bars}</div>
    <div class="legend">${legend}</div>
  </div>`;
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
  <div class="platform-row viz-root">
    <div class="counters">${statsBlock(zapierStats, ZAPIER_NOT_CONFIGURED)}</div>
    ${chartCard(zapierStats, ZAPIER_NOT_CONFIGURED)}
  </div>

  <h2>Make path counters <span class="badge">Make Data Store</span></h2>
  <p class="sub">Same four routes (Business Lead / Consumer Lead / Card Order / Net-30 Order), this time from the Make scenario's Router paths and its Data Store counters. <a href="/make">View Make-only page &rarr;</a></p>
  <div class="platform-row viz-root">
    <div class="counters">${statsBlock(makeStats, MAKE_NOT_CONFIGURED)}</div>
    ${chartCard(makeStats, MAKE_NOT_CONFIGURED)}
  </div>

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
  <div class="platform-row viz-root">
    <div class="counters">${statsBlock(platformStats, notConfiguredMsg)}</div>
    ${chartCard(platformStats, notConfiguredMsg)}
  </div>

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

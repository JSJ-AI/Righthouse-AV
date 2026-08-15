import {
  generateLead,
  generateOrder,
  BUSINESS_NAME,
  LEAD_TICK_RATE,
  ORDER_TICK_RATE,
  ORDER_FROM_LEAD_RATE,
} from "./data.js";
import {
  saveLead,
  saveOrder,
  pickUnconvertedLead,
  markLeadConverted,
  recentLeads,
  recentOrders,
  counts,
} from "./db.js";
import { renderDashboard, renderPlatformDashboard } from "./dashboard.js";
import { getZapierStats } from "./zapier-stats.js";
import { getMakeStats } from "./make-stats.js";

const CRON_SCHEDULE = "*/3 * * * *"; // keep in sync with wrangler.jsonc, dashboard display only

async function dispatchWebhooks(env, evt) {
  const targets = [env.MAKE_WEBHOOK_URL, env.ZAPIER_WEBHOOK_URL].filter(Boolean);
  const headers = { "content-type": "application/json" };
  if (env.WEBHOOK_SHARED_SECRET) headers["x-faucet-secret"] = env.WEBHOOK_SHARED_SECRET;

  if (targets.length === 0) {
    console.log(`generated ${evt.event} ${evt.id} (no webhook targets configured, not sent anywhere)`);
    return;
  }

  const results = await Promise.allSettled(
    targets.map((url) => fetch(url, { method: "POST", headers, body: JSON.stringify(evt) }))
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`webhook dispatch failed for ${targets[i]}:`, r.reason);
    } else if (!r.value.ok) {
      console.error(`webhook dispatch to ${targets[i]} returned ${r.value.status}`);
    } else {
      console.log(`sent ${evt.event} ${evt.id} -> ${targets[i]}`);
    }
  });
}

// One "tick" of the simulated business: maybe a new lead, maybe a new
// order (either converting an existing lead or a fresh direct purchase).
export async function runTick(env) {
  const events = [];

  if (Math.random() < LEAD_TICK_RATE) {
    const lead = generateLead();
    await saveLead(env.DB, lead);
    events.push(lead);
  }

  if (Math.random() < ORDER_TICK_RATE) {
    let sourceLead = null;
    if (Math.random() < ORDER_FROM_LEAD_RATE) {
      sourceLead = await pickUnconvertedLead(env.DB);
    }
    const order = generateOrder(sourceLead);
    if (sourceLead) await markLeadConverted(env.DB, sourceLead.id);
    await saveOrder(env.DB, order);
    events.push(order);
  }

  for (const evt of events) {
    await dispatchWebhooks(env, evt);
  }

  return events;
}

async function handleFire(env) {
  const events = await runTick(env);
  return new Response(JSON.stringify({ fired: events.length, events }, null, 2), {
    headers: { "content-type": "application/json" },
  });
}

async function handleRecent(env) {
  const [leads, orders] = await Promise.all([recentLeads(env.DB, 20), recentOrders(env.DB, 20)]);
  return new Response(JSON.stringify({ leads, orders }, null, 2), {
    headers: { "content-type": "application/json" },
  });
}

async function handleDashboard(env) {
  const [stats, leads, orders, zapierStats, makeStats] = await Promise.all([
    counts(env.DB),
    recentLeads(env.DB, 20),
    recentOrders(env.DB, 20),
    getZapierStats(env.ZAPIER_STORAGE_SECRET),
    getMakeStats(env.MAKE_API_TOKEN),
  ]);
  const html = renderDashboard({
    businessName: env.BUSINESS_NAME || BUSINESS_NAME,
    stats,
    leads,
    orders,
    cronSchedule: CRON_SCHEDULE,
    zapierStats,
    makeStats,
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// Single-platform pages, so Zapier and Make can each be watched (or
// bookmarked) independently -- e.g. to eyeball whether the two automations'
// counters stay in sync or start to diverge over time.
async function handleZapierDashboard(env) {
  const [stats, zapierStats] = await Promise.all([
    counts(env.DB),
    getZapierStats(env.ZAPIER_STORAGE_SECRET),
  ]);
  const html = renderPlatformDashboard({
    businessName: env.BUSINESS_NAME || BUSINESS_NAME,
    platformKey: "zapier",
    platformLabel: "Zapier",
    badge: "Storage by Zapier",
    description:
      "How many events each Zap path (Business Lead / Consumer Lead / Card Order / Net Order) has actually processed, straight from the Zap's own counters.",
    stats,
    platformStats: zapierStats,
    notConfiguredMsg:
      'Not configured yet &mdash; set the <code>ZAPIER_STORAGE_SECRET</code> secret (<code>npm run secrets:zapier-storage</code>) to show live counts from the Zap\'s Storage by Zapier counters here.',
    jsonEndpoint: "/zapier-stats",
    otherPlatformPath: "/make",
    otherPlatformLabel: "Make",
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

async function handleMakeDashboard(env) {
  const [stats, makeStats] = await Promise.all([
    counts(env.DB),
    getMakeStats(env.MAKE_API_TOKEN),
  ]);
  const html = renderPlatformDashboard({
    businessName: env.BUSINESS_NAME || BUSINESS_NAME,
    platformKey: "make",
    platformLabel: "Make",
    badge: "Make Data Store",
    description:
      "Same four routes (Business Lead / Consumer Lead / Card Order / Net-30 Order), this time from the Make scenario's Router paths and its Data Store counters.",
    stats,
    platformStats: makeStats,
    notConfiguredMsg:
      'Not configured yet &mdash; set the <code>MAKE_API_TOKEN</code> secret (<code>npm run secrets:make-token</code>) to show live counts from the Make Data Store counters here.',
    jsonEndpoint: "/make-stats",
    otherPlatformPath: "/zapier",
    otherPlatformLabel: "Zapier",
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// Debug/verification endpoint: returns the raw Zapier path-counter fetch so
// it can be checked directly (the real store.zapier.com response shape
// couldn't be verified from the dev sandbox this was written in -- see
// zapier-stats.js). Hit this after deploying to confirm the numbers look
// right; if they don't, the parsing in zapier-stats.js is the place to fix.
async function handleZapierStats(env) {
  const zapierStats = await getZapierStats(env.ZAPIER_STORAGE_SECRET);
  return new Response(
    JSON.stringify(
      { configured: Boolean(env.ZAPIER_STORAGE_SECRET), stats: zapierStats },
      null,
      2
    ),
    { headers: { "content-type": "application/json" } }
  );
}

// Debug/verification endpoint for the Make-side counters, same purpose as
// handleZapierStats above: hit this after deploying to confirm the numbers
// coming back from the Make Data Store API look right.
async function handleMakeStats(env) {
  const makeStats = await getMakeStats(env.MAKE_API_TOKEN);
  return new Response(
    JSON.stringify({ configured: Boolean(env.MAKE_API_TOKEN), stats: makeStats }, null, 2),
    { headers: { "content-type": "application/json" } }
  );
}

// "Blind page" posture: this is an unlisted demo page, not an
// access-controlled one. Nothing here stops someone who has the exact URL
// from viewing the dashboard -- these headers just keep it out of search
// engines and crawlers so it doesn't surface on its own. Real access
// control (if you ever want it) is a Cloudflare Access policy in front of
// the custom domain, or gating every route behind WEBHOOK_SHARED_SECRET.
const NOINDEX_HEADERS = { "x-robots-tag": "noindex, nofollow, noarchive" };

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runTick(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    // Lets this Worker be mounted either at a domain/subdomain root (Cloudflare
    // "Custom Domain", e.g. av.j2analytics.ai) or under a path prefix on an
    // existing site via a Cloudflare "Route" (e.g. j2analytics.ai/av*). Set
    // BASE_PATH (no trailing slash, e.g. "/av") only for the path-prefix case;
    // leave it unset for a dedicated subdomain.
    const basePath = (env.BASE_PATH || "").replace(/\/+$/, "");
    let pathname = url.pathname;
    if (basePath) {
      if (pathname === basePath) pathname = "/";
      else if (pathname.startsWith(`${basePath}/`)) pathname = pathname.slice(basePath.length);
      else return new Response("Not found", { status: 404, headers: NOINDEX_HEADERS });
    }

    if (pathname === "/robots.txt") {
      // Note: this only matters if the Worker owns the domain root (the
      // subdomain/Custom Domain setup). If mounted under a path prefix via a
      // Route, real crawlers only ever check the *site's* root robots.txt,
      // which lives outside this Worker -- add "Disallow: /av" (or whatever
      // BASE_PATH is) there instead. See README.
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "content-type": "text/plain", ...NOINDEX_HEADERS },
      });
    }

    if (pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
        headers: { "content-type": "application/json", ...NOINDEX_HEADERS },
      });
    }

    if (pathname === "/fire") {
      // Optional lightweight protection: if WEBHOOK_SHARED_SECRET is set,
      // require it as ?key=... so this endpoint can't be spammed by anyone
      // who finds the URL.
      if (env.WEBHOOK_SHARED_SECRET && url.searchParams.get("key") !== env.WEBHOOK_SHARED_SECRET) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json", ...NOINDEX_HEADERS },
        });
      }
      const res = await handleFire(env);
      Object.entries(NOINDEX_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    if (pathname === "/recent") {
      const res = await handleRecent(env);
      Object.entries(NOINDEX_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    if (pathname === "/zapier") {
      const res = await handleZapierDashboard(env);
      Object.entries(NOINDEX_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    if (pathname === "/make") {
      const res = await handleMakeDashboard(env);
      Object.entries(NOINDEX_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    if (pathname === "/zapier-stats") {
      const res = await handleZapierStats(env);
      Object.entries(NOINDEX_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    if (pathname === "/make-stats") {
      const res = await handleMakeStats(env);
      Object.entries(NOINDEX_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    if (pathname === "/") {
      const res = await handleDashboard(env);
      Object.entries(NOINDEX_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    return new Response("Not found", { status: 404, headers: NOINDEX_HEADERS });
  },
};

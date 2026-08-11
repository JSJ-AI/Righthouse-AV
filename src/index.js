import { generateLead, generateOrder } from "./data.js";
import {
  saveLead,
  saveOrder,
  pickUnconvertedLead,
  markLeadConverted,
  recentLeads,
  recentOrders,
  counts,
} from "./db.js";
import { renderDashboard } from "./dashboard.js";

const CRON_SCHEDULE = "*/3 * * * *"; // keep in sync with wrangler.jsonc, dashboard display only

async function dispatchWebhooks(env, evt) {
  const targets = [env.MAKE_WEBHOOK_URL, env.ZAPIER_WEBHOOK_URL].filter(Boolean);
  const headers = { "content-type": "application/json" };
  if (env.WEBHOOK_SHARED_SECRET) headers["x-faucet-secret"] = env.WEBHOOK_SHARED_SECRET;

  const results = await Promise.allSettled(
    targets.map((url) => fetch(url, { method: "POST", headers, body: JSON.stringify(evt) }))
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`webhook dispatch failed for ${targets[i]}:`, r.reason);
    } else if (!r.value.ok) {
      console.error(`webhook dispatch to ${targets[i]} returned ${r.value.status}`);
    }
  });
}

// One "tick" of the simulated business: maybe a new lead, maybe a new
// order (either converting an existing lead or a fresh direct purchase).
export async function runTick(env) {
  const events = [];

  if (Math.random() < 0.55) {
    const lead = generateLead();
    await saveLead(env.DB, lead);
    events.push(lead);
  }

  if (Math.random() < 0.35) {
    let sourceLead = null;
    if (Math.random() < 0.7) {
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
  const [stats, leads, orders] = await Promise.all([
    counts(env.DB),
    recentLeads(env.DB, 20),
    recentOrders(env.DB, 20),
  ]);
  const html = renderDashboard({
    businessName: env.BUSINESS_NAME || "J2 Analytics",
    stats,
    leads,
    orders,
    cronSchedule: CRON_SCHEDULE,
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runTick(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (url.pathname === "/fire") {
      // Optional lightweight protection: if WEBHOOK_SHARED_SECRET is set,
      // require it as ?key=... so this endpoint can't be spammed by anyone
      // who finds the URL.
      if (env.WEBHOOK_SHARED_SECRET && url.searchParams.get("key") !== env.WEBHOOK_SHARED_SECRET) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return handleFire(env);
    }

    if (url.pathname === "/recent") {
      return handleRecent(env);
    }

    if (url.pathname === "/") {
      return handleDashboard(env);
    }

    return new Response("Not found", { status: 404 });
  },
};

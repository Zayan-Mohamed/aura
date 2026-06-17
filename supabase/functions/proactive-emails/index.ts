/**
 * proactive-emails - Aura's scheduled outreach.
 *
 * Invoked by pg_cron (hourly) over pg_net with an `x-cron-secret` header. Runs
 * three jobs and emails due shoppers via SendGrid, respecting the free-tier
 * 100/day cap and never emailing the same thing twice:
 *   1. abandoned_cart    - non-empty basket untouched 24h+
 *   2. occasion          - a saved date within the next 5 days
 *   3. delivery_followup - an order whose delivery date has passed
 *
 * Auth is a shared secret, not a JWT (so verify_jwt is disabled at deploy). If
 * SendGrid isn't configured yet the function safely no-ops, so deploying before
 * secrets are set can't misfire.
 *
 * All emails use a plain, branded, emoji-free HTML template.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const MAIL_FROM = Deno.env.get("MAIL_FROM");
const MAIL_FROM_NAME = Deno.env.get("MAIL_FROM_NAME") ?? "Aura";
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://aura-theta-orpin.vercel.app";

const DAILY_CAP = 100;

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// --------------------------------------------------------------- email template

const COLORS = {
  bg: "#f3ede3",
  card: "#ffffff",
  ink: "#2a2018",
  muted: "#7a6f63",
  gold: "#b07b1e",
  goldInk: "#ffffff",
  line: "#e7ddcf",
};

function money(p?: { amount?: number | null; currency?: string } | null): string {
  if (!p || p.amount == null) return "";
  const cur = p.currency ?? "LKR";
  const n = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(p.amount);
  return cur === "LKR" ? `Rs ${n}` : `${cur} ${n}`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** Branded, inline-styled, emoji-free shell. */
function shell(opts: {
  preheader: string;
  heading: string;
  body: string; // pre-built inner HTML
  ctaText: string;
  ctaUrl: string;
}): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
  <span style="display:none;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:18px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:24px 28px 8px 28px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:${COLORS.ink};letter-spacing:.2px;">Aura</div>
          <div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">Your Kapruka concierge</div>
        </td></tr>
        <tr><td style="padding:8px 28px 0 28px;">
          <h1 style="margin:12px 0 8px 0;font-size:20px;line-height:1.3;color:${COLORS.ink};">${esc(opts.heading)}</h1>
          <div style="font-size:15px;line-height:1.6;color:${COLORS.ink};">${opts.body}</div>
        </td></tr>
        <tr><td style="padding:22px 28px 4px 28px;">
          <a href="${esc(opts.ctaUrl)}" style="display:inline-block;background:${COLORS.gold};color:${COLORS.goldInk};text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px;">${esc(opts.ctaText)}</a>
        </td></tr>
        <tr><td style="padding:24px 28px 26px 28px;">
          <hr style="border:none;border-top:1px solid ${COLORS.line};margin:0 0 14px 0;">
          <div style="font-size:12px;line-height:1.6;color:${COLORS.muted};">
            You're receiving this because you have an Aura account and shop the live Kapruka catalogue.
            Prices in LKR. Reply to this email if you'd rather not hear from us.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// --------------------------------------------------------------- send via SendGrid

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: MAIL_FROM, name: MAIL_FROM_NAME },
      subject,
      content: [{ type: "text/html", value: html }],
      mail_settings: { bypass_list_management: { enable: false } },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[proactive-emails] SendGrid ${res.status}: ${detail.slice(0, 300)}`);
    return false;
  }
  return true;
}

async function logEmail(userId: string | null, kind: string, ref: string | null, email: string) {
  await db.from("email_log").insert({ user_id: userId, kind, ref, email });
}

// --------------------------------------------------------------- the three jobs

type Counters = { sent: number; budget: number };

async function runAbandonedCart(c: Counters) {
  if (c.budget <= 0) return;
  const { data } = await db.rpc("due_abandoned_carts");
  for (const row of (data ?? []) as { user_id: string; email: string; items: unknown[] }[]) {
    if (c.budget <= 0) break;
    const items = Array.isArray(row.items) ? row.items : [];
    const count = items.reduce((n: number, i) => n + (Number((i as { quantity?: number }).quantity) || 1), 0);
    const list = items
      .slice(0, 6)
      .map((i) => {
        const it = i as { name?: string; quantity?: number; price?: { amount?: number; currency?: string } };
        const price = money(it.price);
        return `<tr><td style="padding:6px 0;font-size:14px;color:${COLORS.ink};">${(it.quantity ?? 1)}&times; ${esc(it.name ?? "Item")}</td><td align="right" style="padding:6px 0;font-size:14px;color:${COLORS.muted};">${esc(price)}</td></tr>`;
      })
      .join("");
    const body = `
      <p style="margin:0 0 12px 0;">You left ${count} item${count === 1 ? "" : "s"} in your basket. They're still here whenever you're ready - I can confirm delivery to your area and walk you through a secure checkout in one go.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.line};border-bottom:1px solid ${COLORS.line};margin:8px 0;">${list}</table>`;
    const html = shell({
      preheader: `${count} item${count === 1 ? "" : "s"} waiting in your Aura basket`,
      heading: "Your basket is waiting",
      body,
      ctaText: "Return to your basket",
      ctaUrl: SITE_URL,
    });
    if (await sendEmail(row.email, "Your Aura basket is waiting", html)) {
      await db.from("baskets").update({ reminded_at: new Date().toISOString() }).eq("user_id", row.user_id);
      await logEmail(row.user_id, "abandoned_cart", null, row.email);
      c.sent++;
      c.budget--;
    }
  }
}

async function runOccasions(c: Counters) {
  if (c.budget <= 0) return;
  const { data } = await db.rpc("due_occasions");
  for (const row of (data ?? []) as {
    id: string; user_id: string; email: string; label: string;
    next_date: string; recipient_name: string; recipient_city: string;
  }[]) {
    if (c.budget <= 0) break;
    const when = new Date(`${row.next_date}T00:00:00+05:30`);
    const dateLabel = isNaN(when.getTime())
      ? row.next_date
      : new Intl.DateTimeFormat("en-LK", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Colombo" }).format(when);
    const who = row.recipient_name ? ` for ${esc(row.recipient_name)}` : "";
    const place = row.recipient_city ? ` in ${esc(row.recipient_city)}` : "";
    const body = `
      <p style="margin:0 0 12px 0;"><strong>${esc(row.label)}</strong> is coming up on ${esc(dateLabel)}. Want me to line up a gift${who}${place} that's certain to arrive in time? Tell me a budget and I'll do the rest.</p>`;
    const html = shell({
      preheader: `${row.label} is on ${dateLabel}`,
      heading: `${row.label} is coming up`,
      body,
      ctaText: "Plan a gift with Aura",
      ctaUrl: SITE_URL,
    });
    if (await sendEmail(row.email, `${row.label} is coming up`, html)) {
      const year = new Date(`${row.next_date}T00:00:00+05:30`).getFullYear();
      await db.from("occasions").update({ last_notified_year: year }).eq("id", row.id);
      await logEmail(row.user_id, "occasion", row.id, row.email);
      c.sent++;
      c.budget--;
    }
  }
}

async function runDeliveryFollowups(c: Counters) {
  if (c.budget <= 0) return;
  const { data } = await db.rpc("due_delivery_followups");
  for (const row of (data ?? []) as {
    id: string; user_id: string; email: string; order_ref: string; delivery: { city?: string } | null;
  }[]) {
    if (c.budget <= 0) break;
    const city = row.delivery?.city ? ` to ${esc(row.delivery.city)}` : "";
    const body = `
      <p style="margin:0 0 12px 0;">Your order <strong>${esc(row.order_ref)}</strong> was scheduled to arrive${city}. I hope it landed beautifully. If anything wasn't right, just reply and I'll help sort it - or tap below to reorder or track it.</p>`;
    const html = shell({
      preheader: `How was order ${row.order_ref}?`,
      heading: "How was your delivery?",
      body,
      ctaText: "Reorder or track",
      ctaUrl: SITE_URL,
    });
    if (await sendEmail(row.email, "How was your Kapruka delivery?", html)) {
      await db.from("orders").update({ followup_sent_at: new Date().toISOString() }).eq("id", row.id);
      await logEmail(row.user_id, "delivery_followup", row.order_ref, row.email);
      c.sent++;
      c.budget--;
    }
  }
}

// --------------------------------------------------------------- handler

Deno.serve(async (req) => {
  // Shared-secret auth (this function is cron-invoked, not user-facing).
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Not configured yet → safe no-op (so deploying before secrets can't misfire).
  if (!SENDGRID_API_KEY || !MAIL_FROM) {
    return new Response(
      JSON.stringify({ skipped: "SendGrid not configured (set SENDGRID_API_KEY and MAIL_FROM)" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data: sentToday } = await db.rpc("emails_sent_today");
  const budget = Math.max(0, DAILY_CAP - (Number(sentToday) || 0));
  const c: Counters = { sent: 0, budget };

  try {
    await runAbandonedCart(c);
    await runOccasions(c);
    await runDeliveryFollowups(c);
  } catch (err) {
    console.error("[proactive-emails] error", err);
    return new Response(JSON.stringify({ error: String(err), sent: c.sent }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ sent: c.sent, remainingBudget: c.budget, sentToday: Number(sentToday) || 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

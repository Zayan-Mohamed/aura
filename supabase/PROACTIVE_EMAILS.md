# Proactive emails - setup runbook

Scheduled outreach for Aura, sent by the `proactive-emails` Supabase Edge
Function via SendGrid (free tier, 100 emails/day). All templates are branded and
emoji-free.

**What's already deployed (by code):**
- Migration `20260616120000_aura_proactive_emails.sql` - `occasions` + `email_log`
  tables, `reminded_at`/`followup_sent_at` columns, the `due_*` query functions,
  and `pg_cron` + `pg_net` enabled.
- Edge Function `proactive-emails` (ACTIVE, `verify_jwt = false`, custom
  `x-cron-secret` auth). It **safely no-ops until the secrets below are set**, so
  nothing sends by accident.
- The in-app **Occasion reminders** UI (profile drawer → "Occasion reminders").

**What needs you (the steps below):** a SendGrid sender, four secrets, and one
SQL statement to turn on the schedule. Until you do these, no emails are sent.

Function URL: `https://bpailohmluateqfohetz.supabase.co/functions/v1/proactive-emails`

---

## 1. SendGrid - verify a sender (no domain needed)

You do **not** need a domain. Use Single Sender Verification:

1. Create a free SendGrid account.
2. **Settings → Sender Authentication → "Verify a Single Sender"** (NOT "Authenticate
   your domain" - that's the one that asks for DNS records).
3. Fill the form with an email you control (e.g. your Gmail). SendGrid emails it a
   confirmation link - click it. That address is now your verified "from".
4. **Settings → API Keys → Create API Key** (Restricted, "Mail Send" only). Copy it.

> Single Sender deliverability is slightly lower than domain auth (mail may land in
> Promotions/Spam occasionally) - fine for the challenge. Upgrade to domain auth
> later if you get a domain.

---

## 2. Set the Edge Function secrets

Dashboard → **Project Settings → Edge Functions → Secrets** (or CLI:
`supabase secrets set KEY=value`). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are injected automatically - do **not** add them.

| Secret | Value |
|---|---|
| `SENDGRID_API_KEY` | the API key from step 1 |
| `MAIL_FROM` | your verified single-sender email |
| `MAIL_FROM_NAME` | `Aura` |
| `CRON_SECRET` | a long random string you invent (used in step 4) |
| `SITE_URL` | your deployed app URL, e.g. `https://aura-theta-orpin.vercel.app` (optional) |

---

## 3. Test it manually (before scheduling)

There's already 1 abandoned cart in the DB, so this should send one email:

```bash
curl -X POST 'https://bpailohmluateqfohetz.supabase.co/functions/v1/proactive-emails' \
  -H 'x-cron-secret: YOUR_CRON_SECRET' \
  -H 'Content-Type: application/json' -d '{}'
```

- `{"sent":1,...}` → success, check the inbox.
- `{"skipped":"SendGrid not configured"}` → secrets from step 2 aren't set yet.
- `401 unauthorized` → the `x-cron-secret` header doesn't match the `CRON_SECRET` secret.

(Re-running won't re-email the same cart - `reminded_at` dedupes it.)

---

## 4. Turn on the hourly schedule

Run this once in the **SQL Editor** (replace the secret with your real `CRON_SECRET`):

```sql
select cron.schedule(
  'aura-proactive-emails',
  '0 * * * *',                                  -- top of every hour
  $$
  select net.http_post(
    url     := 'https://bpailohmluateqfohetz.supabase.co/functions/v1/proactive-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

Manage it later:
```sql
select * from cron.job;                          -- view
select cron.unschedule('aura-proactive-emails'); -- turn off
```

> Prefer not to inline the secret? Store it in Vault
> (`select vault.create_secret('YOUR_CRON_SECRET','aura_cron_secret');`) and read it
> in the header with
> `(select decrypted_secret from vault.decrypted_secrets where name='aura_cron_secret')`.

---

## The three jobs

| Job | Fires when | De-dupes via |
|---|---|---|
| Abandoned cart | Signed-in user's basket is non-empty and untouched ≥ 24h | `baskets.reminded_at` (re-arms if they change the basket) |
| Occasion reminder | A saved occasion's next annual date is within 5 days | `occasions.last_notified_year` (once/year) |
| Delivery follow-up | An order's delivery date passed (within last 14 days) | `orders.followup_sent_at` |

Every send is recorded in `public.email_log`, which also enforces the **100/day**
cap (the function stops once the day's count hits 100, Asia/Colombo).

---

## 5. Fix the verify-email issue (separate, but same SendGrid)

Right now Supabase's built-in email doesn't reliably deliver signup confirmations
(why there are 0 email/password users). Two options:

**A. Proper fix - point Supabase Auth at SendGrid SMTP**
Dashboard → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
- Host: `smtp.sendgrid.net`
- Port: `587`
- Username: `apikey` (literally the word)
- Password: your SendGrid API key
- Sender email: your verified single sender · Sender name: `Aura`

Confirmation/reset emails will then deliver (and look branded).

**B. Quick demo fix - skip confirmation**
Dashboard → **Authentication → Providers → Email** → turn **off** "Confirm email".
Email/password signup then works instantly with no email. (Google sign-in already
works regardless - it's auto-confirmed.)

---

## Notes
- Security advisor flags `pg_net` installed in the `public` schema (WARN, cosmetic)
  and `email_log` RLS-enabled-no-policy (INFO, intentional - service-role only).
- To change cadence, edit the cron expression in step 4 (e.g. `0 */6 * * *` = every
  6 hours) to conserve the daily budget.

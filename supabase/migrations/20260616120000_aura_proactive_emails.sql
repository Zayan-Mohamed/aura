-- Proactive emails: scheduled nudges sent by a Supabase Edge Function (SendGrid).
-- This migration adds the schema + security-definer query functions the function
-- calls; the cron schedule itself is created separately (after secrets are set -
-- see supabase/PROACTIVE_EMAILS.md) so deploying never fires a half-configured job.

-- --------------------------------------------------------------- extensions
-- pg_cron schedules the job; pg_net lets the schedule POST to the Edge Function.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- --------------------------------------------------------------- new schema

-- Saved gifting occasions the shopper wants reminding about (birthdays, etc.).
create table if not exists public.occasions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  label            text not null,                 -- "Amma's birthday"
  occasion_date    date not null,                 -- the day (recurs annually)
  recipient_name   text not null default '',
  recipient_city   text not null default '',
  notes            text not null default '',
  -- The calendar year we last emailed about this occasion, so we nudge once a year.
  last_notified_year int,
  created_at       timestamptz not null default now()
);
create index if not exists occasions_user_idx on public.occasions (user_id);

-- Append-only record of every proactive email sent: powers de-duplication and
-- the daily send cap (SendGrid free tier = 100/day).
create table if not exists public.email_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users (id) on delete set null,
  kind      text not null,        -- 'abandoned_cart' | 'occasion' | 'delivery_followup'
  ref       text,                 -- occasion id / order_ref / null
  email     text not null,
  sent_at   timestamptz not null default now()
);
create index if not exists email_log_sent_idx on public.email_log (sent_at desc);

-- Track when we last nudged an abandoned basket / followed up on an order.
alter table public.baskets add column if not exists reminded_at timestamptz;
alter table public.orders  add column if not exists followup_sent_at timestamptz;

-- ---------------------------------------------------------- grants + RLS
-- Occasions are owner-only (same pattern as the rest of the app). email_log is
-- service-role only (no authenticated grants) - the Edge Function writes it.
grant select, insert, update, delete on public.occasions to authenticated;

alter table public.occasions enable row level security;
alter table public.email_log enable row level security;

drop policy if exists "occasions_owner" on public.occasions;
create policy "occasions_owner" on public.occasions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- email_log: RLS on, no policy → authenticated/anon cannot read or write it.

-- ------------------------------------------------ due-item query functions
-- security definer so the Edge Function (service role) can join auth.users for
-- the recipient email without exposing that schema. search_path pinned to ''.

-- Abandoned carts: non-empty baskets untouched for >= 24h that we haven't nudged
-- since they were last changed.
create or replace function public.due_abandoned_carts()
returns table (user_id uuid, email text, items jsonb)
language sql
security definer
set search_path = ''
as $$
  select b.user_id, u.email, b.items
  from public.baskets b
  join auth.users u on u.id = b.user_id
  where jsonb_array_length(b.items) > 0
    and b.updated_at < now() - interval '24 hours'
    and (b.reminded_at is null or b.reminded_at < b.updated_at)
    and u.email is not null
  limit 100;
$$;

-- Occasions whose next annual occurrence is within the next 5 days and which we
-- haven't already emailed about this calendar year.
create or replace function public.due_occasions()
returns table (
  id uuid, user_id uuid, email text, label text,
  occasion_date date, recipient_name text, recipient_city text, next_date date
)
language sql
security definer
set search_path = ''
as $$
  with shifted as (
    select o.*, u.email,
      -- map the occasion's day-of-year into the current year
      (date_trunc('year', current_date)::date
        + (o.occasion_date - date_trunc('year', o.occasion_date)::date)) as this_year
    from public.occasions o
    join auth.users u on u.id = o.user_id
    where u.email is not null
  )
  select id, user_id, email, label, occasion_date, recipient_name, recipient_city,
    (case when this_year >= current_date then this_year else this_year + 365 end) as next_date
  from shifted
  where (case when this_year >= current_date then this_year else this_year + 365 end)
          between current_date and current_date + 5
    and coalesce(last_notified_year, 0)
        <> extract(year from (case when this_year >= current_date then this_year else this_year + 365 end))::int
  limit 100;
$$;

-- Orders whose delivery date has passed and we haven't followed up on.
create or replace function public.due_delivery_followups()
returns table (id uuid, user_id uuid, email text, order_ref text, delivery jsonb)
language sql
security definer
set search_path = ''
as $$
  select o.id, o.user_id, u.email, o.order_ref, o.delivery
  from public.orders o
  join auth.users u on u.id = o.user_id
  where o.followup_sent_at is null
    and o.status <> 'cancelled'
    and o.delivery ? 'date'
    and (o.delivery->>'date')::date < current_date
    and (o.delivery->>'date')::date > current_date - interval '14 days'
    and u.email is not null
  limit 100;
$$;

-- How many proactive emails we've sent today (Asia/Colombo) - for the daily cap.
create or replace function public.emails_sent_today()
returns int
language sql
security definer
set search_path = ''
as $$
  select count(*)::int from public.email_log
  where sent_at >= (current_date at time zone 'Asia/Colombo');
$$;

-- Lock these helpers down to the service role (Edge Function) only.
revoke all on function public.due_abandoned_carts()      from public, anon, authenticated;
revoke all on function public.due_occasions()            from public, anon, authenticated;
revoke all on function public.due_delivery_followups()   from public, anon, authenticated;
revoke all on function public.emails_sent_today()        from public, anon, authenticated;
grant execute on function public.due_abandoned_carts()    to service_role;
grant execute on function public.due_occasions()          to service_role;
grant execute on function public.due_delivery_followups() to service_role;
grant execute on function public.emails_sent_today()      to service_role;

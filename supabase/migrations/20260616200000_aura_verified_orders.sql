-- Aura Prestige counts only PAID orders, and Kapruka exposes no payment webhook:
-- track_order needs the post-payment ORDER NUMBER (emailed to the customer), not
-- the pre-payment order_ref our checkout link carries. So a tier credit is earned
-- when the shopper brings that number back and Aura confirms it live via
-- track_order. Each confirmed number is recorded here and the tier is the count
-- of these rows — so unpaid checkout links never inflate a tier.

create table if not exists public.verified_orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  -- Globally unique: a given paid Kapruka order can credit exactly one account
  -- (first to verify it owns it), so a number can't be farmed across accounts.
  order_number   text not null unique,
  status         text not null default '',
  amount         text,
  recipient_name text,
  verified_at    timestamptz not null default now()
);
create index if not exists verified_orders_user_idx
  on public.verified_orders (user_id);

grant select, insert, update, delete on public.verified_orders to authenticated;
alter table public.verified_orders enable row level security;
create policy "verified_orders_owner" on public.verified_orders for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Tier = number of the caller's verified (paid) orders.
create or replace function public.order_count()
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::int
  from public.verified_orders
  where user_id = (select auth.uid());
$$;

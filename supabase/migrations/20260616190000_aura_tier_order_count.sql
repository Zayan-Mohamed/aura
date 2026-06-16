-- Aura Prestige tiers are derived from how many orders a shopper has placed.
-- This adds a small security-definer helper that returns the CALLER's own order
-- count in one round-trip, so both the header tier badge and the chat route can
-- read it without a broad row select. Additive only — no tables or data change.

create or replace function public.order_count()
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::int
  from public.orders
  where user_id = (select auth.uid());
$$;

-- Only signed-in users may call it; it scopes strictly to their own rows.
revoke all on function public.order_count() from public;
grant execute on function public.order_count() to authenticated;

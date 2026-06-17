-- Aura Prestige - Silver perk (Proactive Concierge) enforcement.
--
-- The proactive occasion-reminder email is the *earned* Silver benefit: only
-- shoppers who've reached Silver (>= 1 verified PAID order) get Aura reaching out
-- before their saved dates. Memory itself stays free for everyone, and the
-- transactional nudges (abandoned-cart recovery, delivery follow-up) remain
-- ungated - only this enrichment email is tier-gated.
--
-- We enforce it at the source: due_occasions() (called by the proactive-emails
-- Edge Function as service_role) now skips users below the Silver threshold, so a
-- Bronze user is never even returned as due. Threshold mirrors
-- TIER_GATES.proactiveConcierge (= 1) in lib/tiers.ts.

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
      -- Silver+ only: at least one verified (paid) order.
      and (select count(*) from public.verified_orders v where v.user_id = o.user_id) >= 1
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

-- create or replace preserves grants, but re-assert them so a fresh apply is safe.
revoke all on function public.due_occasions() from public, anon, authenticated;
grant execute on function public.due_occasions() to service_role;

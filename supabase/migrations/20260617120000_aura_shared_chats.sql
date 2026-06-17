-- Shareable chats. The owner mints an unguessable token that snapshots the
-- conversation at share time (frozen - later messages never leak). Anyone with
-- the link can view that snapshot and check out the products in it via a public
-- form; they cannot see the owner, their other chats, or future messages.

create table if not exists public.shared_chats (
  token      text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default 'Shared chat',
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists shared_chats_user_idx on public.shared_chats (user_id);

grant select, insert, update, delete on public.shared_chats to authenticated;
alter table public.shared_chats enable row level security;

-- Owners manage their own shares.
create policy "shared_chats_owner" on public.shared_chats for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Public read by EXACT token only - returns just the snapshot, never user_id.
-- Security definer so an anonymous viewer can read it past the owner-only RLS.
create or replace function public.get_shared_chat(p_token text)
returns table (title text, messages jsonb, created_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select title, messages, created_at
  from public.shared_chats
  where token = p_token;
$$;

revoke all on function public.get_shared_chat(text) from public;
grant execute on function public.get_shared_chat(text) to anon, authenticated;

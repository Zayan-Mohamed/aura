-- Aura schema: per-user profile, basket, chat history and orders.
-- All tables are private to the signed-in user via RLS (auth.uid() = user_id).
-- No service-role access is needed; the app writes with the user's session.

-- ---------------------------------------------------------------- tables

-- Extends auth.users with the shopper details Aura reuses.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  phone      text not null default '',
  city       text not null default '',
  address    text not null default '',
  language   text not null default 'auto',
  notes      text not null default '',
  updated_at timestamptz not null default now()
);

-- One basket per user (items mirror the client-side basket shape).
create table if not exists public.baskets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- A chat thread shown in the left sidebar.
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

-- A single message. `id` is the AI SDK message id (a string, not a uuid) so
-- re-saving a turn is an idempotent upsert. `parts` is the UIMessage parts jsonb.
-- user_id is denormalized so RLS needs no join.
create table if not exists public.messages (
  id              text primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  parts           jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- A Kapruka checkout created via the createOrder tool.
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  order_ref       text not null unique,
  checkout_url    text,
  status          text not null default 'pending',
  items           jsonb not null default '[]'::jsonb,
  summary         jsonb,
  recipient       jsonb,
  delivery        jsonb,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);

-- ------------------------------------------------- new-user provisioning

-- Create an empty profile + basket whenever a new auth user appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.baskets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------- grants + RLS

grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.profiles, public.baskets, public.conversations, public.messages, public.orders
  to authenticated;

alter table public.profiles      enable row level security;
alter table public.baskets       enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.orders        enable row level security;

-- Owner-only access. `for all` = select/insert/update/delete; USING + WITH CHECK
-- together also satisfy the UPDATE requirement and prevent reassigning ownership.
create policy "profiles_owner" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "baskets_owner" on public.baskets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "conversations_owner" on public.conversations for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "messages_owner" on public.messages for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "orders_owner" on public.orders for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

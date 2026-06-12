-- Proactive Visual Search: cache product image embeddings (Voyage multimodal-3, 1024-d)
-- and rank candidates by cosine similarity. The table is server-cache only —
-- RLS is on with NO public policies; all access goes through the SECURITY DEFINER
-- functions below, which the anon/publishable key may call (no service-role key).

create extension if not exists vector with schema extensions;

create table if not exists public.product_embeddings (
  product_id text primary key,
  embedding  extensions.vector(1024) not null,
  image_url  text,
  updated_at timestamptz not null default now()
);

alter table public.product_embeddings enable row level security;

-- ANN index for cosine distance (helps once the cache grows).
create index if not exists product_embeddings_embedding_idx
  on public.product_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Upsert one product's embedding. Embedding arrives as pgvector text form
-- ("[0.1,0.2,...]") so the cast is unambiguous from supabase-js.
create or replace function public.upsert_product_embedding(
  p_product_id text,
  p_embedding  text,
  p_image_url  text default null
) returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.product_embeddings (product_id, embedding, image_url, updated_at)
  values (p_product_id, p_embedding::extensions.vector, p_image_url, now())
  on conflict (product_id) do update
    set embedding  = excluded.embedding,
        image_url  = excluded.image_url,
        updated_at = now();
$$;

-- Rank a candidate id set by cosine similarity to a query embedding (1 = identical).
create or replace function public.match_product_embeddings(
  p_query text,
  p_ids   text[],
  p_limit int default 12
) returns table(product_id text, score real)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select pe.product_id,
         (1 - (pe.embedding <=> p_query::extensions.vector))::real as score
  from public.product_embeddings pe
  where pe.product_id = any(p_ids)
  order by pe.embedding <=> p_query::extensions.vector
  limit p_limit;
$$;

-- Which of these ids are already cached (so we only embed the misses)?
create or replace function public.product_embeddings_have(p_ids text[])
returns table(product_id text)
language sql
stable
security definer
set search_path = public
as $$
  select product_id from public.product_embeddings where product_id = any(p_ids);
$$;

grant execute on function public.upsert_product_embedding(text, text, text)        to anon, authenticated;
grant execute on function public.match_product_embeddings(text, text[], int)        to anon, authenticated;
grant execute on function public.product_embeddings_have(text[])                    to anon, authenticated;

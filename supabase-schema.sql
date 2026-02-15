-- Reddit posts cache for r/LinkedInLunatics
-- Run this in Supabase SQL editor

-- Enable trigram extension for fuzzy name search
create extension if not exists pg_trgm;

create table if not exists reddit_posts (
  id text primary key,
  title text not null,
  url text not null,
  score integer default 0,
  created_utc bigint default 0,
  author text,
  image_url text,
  extracted_name text,
  extracted_headline text,
  title_search tsvector generated always as (to_tsvector('english', title)) stored,
  synced_at timestamptz default now()
);

create index if not exists idx_reddit_posts_search on reddit_posts using gin(title_search);

-- Trigram index on extracted_name for fuzzy matching
create index if not exists idx_reddit_posts_name_trgm
  on reddit_posts using gin(extracted_name gin_trgm_ops);

-- RPC function for fuzzy name search using trigram similarity
create or replace function search_reddit_posts(query text)
returns table (title text, url text, score integer, created_utc bigint)
language sql stable
as $$
  select rp.title, rp.url, rp.score, rp.created_utc
  from reddit_posts rp
  where rp.extracted_name is not null
    and similarity(lower(rp.extracted_name), lower(query)) > 0.3
  order by similarity(lower(rp.extracted_name), lower(query)) desc, rp.score desc
  limit 10;
$$;

-- Migration for existing tables (run if table already exists):
-- alter table reddit_posts add column if not exists image_url text;
-- alter table reddit_posts add column if not exists extracted_name text;
-- alter table reddit_posts add column if not exists extracted_headline text;

-- Optional: schedule daily sync via pg_cron (enable the extension first in Supabase dashboard)
-- select cron.schedule(
--   'sync-reddit-daily',
--   '0 6 * * *',
--   $$select net.http_get('https://<project-ref>.supabase.co/functions/v1/sync-reddit', headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb)$$
-- );

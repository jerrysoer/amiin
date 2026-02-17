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
  synced_at timestamptz default now(),
  hidden boolean default false
);

create index if not exists idx_reddit_posts_search on reddit_posts using gin(title_search);

-- Partial index on hidden posts (small since most posts are NOT hidden)
create index if not exists idx_reddit_posts_hidden on reddit_posts(hidden) where hidden = true;

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
    and (rp.hidden is not true)
    and similarity(lower(rp.extracted_name), lower(query)) > 0.3
  order by similarity(lower(rp.extracted_name), lower(query)) desc, rp.score desc
  limit 10;
$$;

-- Migration for existing tables (run if table already exists):
-- alter table reddit_posts add column if not exists image_url text;
-- alter table reddit_posts add column if not exists extracted_name text;
-- alter table reddit_posts add column if not exists extracted_headline text;
-- alter table reddit_posts add column if not exists hidden boolean default false;
-- create index if not exists idx_reddit_posts_hidden on reddit_posts(hidden) where hidden = true;

-- Leaderboard RPC: returns each person's peak post + stats
create or replace function get_leaderboard(
  sort_by text default 'peak_score',
  page_size int default 50
)
returns table (
  name text,
  post_count bigint,
  peak_score integer,
  peak_post_title text,
  peak_post_url text,
  latest_post_date bigint
)
language sql stable
as $$
  with ranked as (
    select
      rp.extracted_name,
      rp.title,
      rp.url,
      rp.score,
      rp.created_utc,
      row_number() over (
        partition by lower(trim(rp.extracted_name))
        order by rp.score desc
      ) as rn
    from reddit_posts rp
    where rp.extracted_name is not null
      and trim(rp.extracted_name) != ''
      and (rp.hidden is not true)
  ),
  person_stats as (
    select
      lower(trim(r.extracted_name)) as name_key,
      max(r.extracted_name) as display_name,
      count(*) as post_count,
      max(r.score) as peak_score,
      max(r.created_utc) as latest_post_date
    from reddit_posts r
    where r.extracted_name is not null
      and trim(r.extracted_name) != ''
      and (r.hidden is not true)
    group by lower(trim(r.extracted_name))
  )
  select
    ps.display_name as name,
    ps.post_count,
    ps.peak_score,
    r.title as peak_post_title,
    r.url as peak_post_url,
    ps.latest_post_date
  from person_stats ps
  join ranked r
    on lower(trim(r.extracted_name)) = ps.name_key
    and r.rn = 1
  order by
    case sort_by
      when 'frequency' then ps.post_count
      when 'recent' then ps.latest_post_date
      else ps.peak_score
    end desc
  limit page_size;
$$;

-- Optional: schedule daily sync via pg_cron (enable the extension first in Supabase dashboard)
-- select cron.schedule(
--   'sync-reddit-daily',
--   '0 6 * * *',
--   $$select net.http_get('https://<project-ref>.supabase.co/functions/v1/sync-reddit', headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb)$$
-- );

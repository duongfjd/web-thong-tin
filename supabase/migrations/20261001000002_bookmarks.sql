create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  url text not null,
  title text,
  description text,
  image_url text,
  favicon_url text,
  category text,
  tags text[] not null default '{}',
  status text not null default 'unread' check (status in ('unread','read','archived')),
  fts tsvector generated always as (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(description, '')), 'B')) stored,
  created_at timestamptz not null default now(),
  constraint one_url_per_user unique(user_id, url)
);

create index bookmarks_fts_idx on public.bookmarks using gin (fts);

alter table public.bookmarks enable row level security;
create policy "owner_all_bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

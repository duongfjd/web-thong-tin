-- ================================================================
-- Personal OS — Schema SQL
-- Chạy toàn bộ file này trong Supabase Dashboard:
-- Project → SQL Editor → New Query → Paste → Run
-- ================================================================

-- Bật UUID extension (thường đã có sẵn)
create extension if not exists "pgcrypto";

-- ================================================================
-- SETTINGS (1 row per user)
-- ================================================================
create table if not exists public.settings (
  key        text not null,
  value      jsonb,
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.settings enable row level security;
create policy "settings_owner" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================================================================
-- TIMESHEET SESSIONS
-- ================================================================
create table if not exists public.sessions (
  id             text primary key default gen_random_uuid()::text,
  user_id        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  check_in_at    timestamptz not null default now(),
  check_out_at   timestamptz,
  source         text not null default 'web' check (source in ('web','telegram','manual')),
  edit_reason    text,
  created_at     timestamptz not null default now(),
  constraint chk_out_after_in check (check_out_at is null or check_out_at > check_in_at)
);
-- Chỉ 1 phiên mở tại 1 thời điểm
create unique index if not exists one_open_session_per_user
  on public.sessions(user_id) where check_out_at is null;

alter table public.sessions enable row level security;
create policy "sessions_owner" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================================================================
-- WORKLOGS
-- ================================================================
create table if not exists public.worklogs (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date       date not null default current_date,
  content    text not null,
  tags       text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.worklogs enable row level security;
create policy "worklogs_owner" on public.worklogs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================================================================
-- EXPENSE CATEGORIES
-- ================================================================
create table if not exists public.categories (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null,
  color      text not null default '#8b949e',
  icon       text not null default 'bi-tag',
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "categories_owner" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================================================================
-- EXPENSES
-- ================================================================
create table if not exists public.expenses (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  amount      bigint not null check (amount > 0),   -- VND, integer only
  note        text,
  category_id text references public.categories(id) on delete set null,
  spent_on    date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses(user_id, spent_on desc);
alter table public.expenses enable row level security;
create policy "expenses_owner" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================================================================
-- BUDGETS (monthly budget per category)
-- ================================================================
create table if not exists public.budgets (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  month       text not null,  -- 'YYYY-MM'
  category_id text references public.categories(id) on delete cascade,
  limit_vnd   bigint not null check (limit_vnd > 0),
  created_at  timestamptz not null default now(),
  unique (user_id, month, category_id)
);
alter table public.budgets enable row level security;
create policy "budgets_owner" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================================================================
-- BOOKMARKS
-- ================================================================
create table if not exists public.bookmarks (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  url         text not null,
  title       text,
  description text,
  image_url   text,
  favicon     text,
  category    text,
  tags        text[] default '{}',
  status      text not null default 'unread' check (status in ('unread','read','archived')),
  created_at  timestamptz not null default now(),
  unique (user_id, url)
);
create index if not exists bookmarks_status_idx on public.bookmarks(user_id, status);
alter table public.bookmarks enable row level security;
create policy "bookmarks_owner" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================================================================
-- SNIPPETS (Developer Vault)
-- ================================================================
create table if not exists public.snippets (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title       text not null,
  body        text not null,
  language    text not null default 'text',
  description text,
  tags        text[] default '{}',
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists snippets_lang_idx on public.snippets(user_id, language);
alter table public.snippets enable row level security;
create policy "snippets_owner" on public.snippets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================================================================
-- CLIPBOARD ITEMS
-- ================================================================
create table if not exists public.clipboard (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  content    text not null,
  kind       text not null default 'text' check (kind in ('text','link','image')),
  pinned     boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.clipboard enable row level security;
create policy "clipboard_owner" on public.clipboard
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bật Realtime chỉ cho clipboard
alter publication supabase_realtime add table public.clipboard;

-- ================================================================
-- VERIFY RLS (kiểm tra tất cả bảng đều bật RLS)
-- ================================================================
-- Chạy câu này để kiểm tra, kết quả phải rỗng (không bảng nào thiếu RLS):
-- select tablename from pg_tables
-- where schemaname = 'public'
-- and tablename not in (
--   select tablename from pg_tables pt
--   join pg_class pc on pc.relname = pt.tablename
--   where pt.schemaname = 'public' and pc.relrowsecurity = true
-- );

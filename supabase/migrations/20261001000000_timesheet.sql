-- Settings table for storing user configurations (including OT rules)
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  ot_rules jsonb not null default '{"standard_hours": 8, "weekend_multiplier": 2, "holiday_multiplier": 3}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_settings_per_user unique(user_id)
);

alter table public.settings enable row level security;
create policy "owner_all_settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Timesheet sessions
create table public.timesheet_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  check_in_at  timestamptz not null,
  check_out_at timestamptz,
  check_in_ip  inet, 
  check_out_ip inet,
  check_in_geo jsonb,  -- {lat,lng,accuracy}
  check_out_geo jsonb,
  source text not null default 'web' check (source in ('web','telegram','manual')),
  edit_reason text,
  created_at timestamptz not null default now(),
  constraint chk_out_after_in check (check_out_at is null or check_out_at > check_in_at)
);

-- Only allow 1 open session per user
create unique index one_open_session_per_user
  on public.timesheet_sessions(user_id) where check_out_at is null;

alter table public.timesheet_sessions enable row level security;
create policy "owner_all_timesheet_sessions" on public.timesheet_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Worklogs (daily text logs)
create table public.worklogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  content_md text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_worklog_per_day unique(user_id, date)
);

alter table public.worklogs enable row level security;
create policy "owner_all_worklogs" on public.worklogs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

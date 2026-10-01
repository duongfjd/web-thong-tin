-- Expense Categories
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  icon text,
  created_at timestamptz not null default now(),
  constraint one_name_per_user unique(user_id, name)
);

alter table public.expense_categories enable row level security;
create policy "owner_all_categories" on public.expense_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  amount_vnd bigint not null check (amount_vnd > 0),
  category_id uuid references public.expense_categories(id) on delete set null,
  note text not null default '',
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
create policy "owner_all_expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category_id uuid references public.expense_categories(id) on delete cascade,
  month date not null, -- stored as first day of the month
  limit_vnd bigint not null check (limit_vnd > 0),
  created_at timestamptz not null default now(),
  constraint one_budget_per_category_month unique(user_id, category_id, month)
);

alter table public.budgets enable row level security;
create policy "owner_all_budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

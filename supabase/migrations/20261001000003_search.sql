create type public.search_result as (
  type text,
  id uuid,
  title text,
  detail text,
  url text,
  created_at timestamptz
);

create or replace function public.global_search(query_text text)
returns setof public.search_result
language plpgsql security definer
as $$
declare
  tsq tsquery;
  search_query text;
begin
  if trim(query_text) = '' then
    return;
  end if;

  -- Convert words to prefix matching tsquery
  search_query := nullif(regexp_replace(trim(query_text), '\s+', ':* & ', 'g'), '');
  if search_query is not null then
    search_query := search_query || ':*';
    tsq := to_tsquery('simple', search_query);
  else
    return;
  end if;

  return query
    -- 1. Bookmarks
    select 
      'bookmark'::text as type,
      b.id,
      coalesce(b.title, b.url) as title,
      b.description as detail,
      b.url,
      b.created_at
    from public.bookmarks b
    where b.user_id = auth.uid() and b.fts @@ tsq
    
    union all
    
    -- 2. Worklogs
    select
      'worklog'::text as type,
      w.id,
      'Worklog ngày ' || w.date::text as title,
      w.content_md as detail,
      '/timesheet'::text as url,
      w.created_at
    from public.worklogs w
    where w.user_id = auth.uid() and w.content_md ilike '%' || query_text || '%'
    
    union all
    
    -- 3. Expenses
    select
      'expense'::text as type,
      e.id,
      'Chi tiêu: ' || trim(to_char(e.amount_vnd, '999G999G999')) || ' đ' as title,
      e.note as detail,
      '/expenses'::text as url,
      e.created_at
    from public.expenses e
    where e.user_id = auth.uid() and e.note ilike '%' || query_text || '%'
    
    order by created_at desc
    limit 20;
end;
$$;

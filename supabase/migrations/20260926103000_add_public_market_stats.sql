create or replace function private.get_public_market_stats()
returns table (
  entries_today bigint,
  settlements_today bigint,
  verified_receipts bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.market_entries
      where created_at >= date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'
    ),
    (
      select count(*)
      from public.auction_settlements
      where settled_at >= date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'
    ),
    (select count(*) from public.auction_settlements);
$$;

create or replace function public.get_public_market_stats()
returns table (
  entries_today bigint,
  settlements_today bigint,
  verified_receipts bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_public_market_stats();
$$;

revoke execute on function private.get_public_market_stats() from public;
grant execute on function private.get_public_market_stats() to anon, authenticated;
grant execute on function public.get_public_market_stats() to anon, authenticated;

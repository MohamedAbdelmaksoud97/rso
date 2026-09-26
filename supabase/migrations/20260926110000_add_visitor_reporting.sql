alter table public.market_entries
  alter column person_name drop not null,
  alter column mobile_or_id drop not null;

alter table public.market_entries
  drop constraint seller_fields_required;

alter table public.market_entries
  add constraint seller_fields_required check (
    entry_kind = 'visitor'
    or (
      person_name is not null
      and mobile_or_id is not null
      and commodity_type is not null
      and quantity is not null
      and total_weight_kg is not null
    )
  );

alter table public.site_settings
  add column public_visitor_count_enabled boolean not null default true;

create index market_entries_visitors_created_idx
  on public.market_entries (created_at desc)
  where entry_kind = 'visitor';

create view public.daily_attendance_summary
with (security_invoker = true)
as
select
  date(created_at at time zone 'Asia/Riyadh') as business_date,
  count(*) filter (where entry_kind = 'visitor') as visitors_count,
  count(*) filter (where entry_kind = 'seller') as sellers_count,
  count(*) as total_entries
from public.market_entries
group by date(created_at at time zone 'Asia/Riyadh');

grant select on public.daily_attendance_summary to authenticated;

drop function public.get_public_market_stats();
drop function private.get_public_market_stats();

create function private.get_public_market_stats()
returns table (
  entries_today bigint,
  visitors_today bigint,
  settlements_today bigint,
  verified_receipts bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when cfg.stats_enabled then (
      select count(*)
      from public.market_entries
      where created_at >= date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'
    ) else 0 end,
    case when cfg.stats_enabled and cfg.public_visitor_count_enabled then (
      select count(*)
      from public.market_entries
      where entry_kind = 'visitor'
        and created_at >= date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'
    ) else 0 end,
    case when cfg.stats_enabled then (
      select count(*)
      from public.auction_settlements
      where settled_at >= date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'
    ) else 0 end,
    case when cfg.stats_enabled then (
      select count(*) from public.auction_settlements
    ) else 0 end
  from public.site_settings cfg
  where cfg.id = true;
$$;

create function public.get_public_market_stats()
returns table (
  entries_today bigint,
  visitors_today bigint,
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

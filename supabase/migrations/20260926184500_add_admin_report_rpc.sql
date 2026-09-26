create or replace function public.get_admin_report(
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if (select private.current_profile_role()) is distinct from 'admin'::public.app_role then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'invalid report range' using errcode = '22007';
  end if;

  if p_end_date - p_start_date > 365 then
    raise exception 'report range exceeds one year' using errcode = '22023';
  end if;

  v_start := p_start_date::timestamp at time zone 'Asia/Riyadh';
  v_end := (p_end_date + 1)::timestamp at time zone 'Asia/Riyadh';

  return (
    with
    filtered_entries as materialized (
      select
        e.id,
        e.receipt_number,
        e.entry_kind,
        e.person_name,
        e.mobile_or_id,
        e.commodity_type,
        e.quantity,
        e.unit_label,
        e.total_weight_kg,
        e.status,
        e.gatekeeper_id,
        e.created_at,
        coalesce(p.full_name, 'غير محدد') as gatekeeper_name
      from public.market_entries e
      left join public.profiles p on p.id = e.gatekeeper_id
      where e.created_at >= v_start and e.created_at < v_end
    ),
    filtered_settlements as materialized (
      select
        s.id,
        s.receipt_number,
        s.approved_buyer_id,
        s.buyer_name,
        s.buyer_phone,
        s.final_price,
        s.auctioneer_commission,
        s.platform_commission,
        s.auctioneer_id,
        s.settled_at,
        e.person_name as seller_name,
        e.mobile_or_id as seller_mobile_or_id,
        coalesce(e.commodity_type, 'غير محدد') as commodity_type,
        e.quantity,
        e.unit_label,
        e.total_weight_kg,
        coalesce(p.full_name, 'غير محدد') as auctioneer_name
      from public.auction_settlements s
      join public.market_entries e on e.id = s.market_entry_id
      left join public.profiles p on p.id = s.auctioneer_id
      where s.settled_at >= v_start and s.settled_at < v_end
    ),
    filtered_profiles as materialized (
      select role, approval_status
      from public.profiles
      where created_at >= v_start and created_at < v_end
    ),
    filtered_events as materialized (
      select event_type
      from public.activity_events
      where created_at >= v_start and created_at < v_end
    ),
    day_series as (
      select generate_series(p_start_date, p_end_date, interval '1 day')::date as business_date
    ),
    daily_entries as (
      select
        date(created_at at time zone 'Asia/Riyadh') as business_date,
        count(*) filter (where entry_kind = 'visitor') as visitors_count,
        count(*) filter (where entry_kind = 'seller') as sellers_count,
        count(*) as entries_count
      from filtered_entries
      group by 1
    ),
    daily_settlements as (
      select
        date(settled_at at time zone 'Asia/Riyadh') as business_date,
        count(*) as settlements_count,
        coalesce(sum(final_price), 0) as sales_total,
        coalesce(sum(platform_commission), 0) as platform_commission,
        coalesce(sum(auctioneer_commission), 0) as auctioneer_commission
      from filtered_settlements
      group by 1
    ),
    daily_rows as (
      select
        d.business_date,
        coalesce(e.visitors_count, 0) as visitors_count,
        coalesce(e.sellers_count, 0) as sellers_count,
        coalesce(e.entries_count, 0) as entries_count,
        coalesce(s.settlements_count, 0) as settlements_count,
        coalesce(s.sales_total, 0) as sales_total,
        coalesce(s.platform_commission, 0) as platform_commission,
        coalesce(s.auctioneer_commission, 0) as auctioneer_commission
      from day_series d
      left join daily_entries e using (business_date)
      left join daily_settlements s using (business_date)
    ),
    commodity_entries as (
      select
        coalesce(commodity_type, 'غير محدد') as commodity_type,
        count(*) as entries_count,
        coalesce(sum(quantity), 0) as quantity_total,
        coalesce(sum(total_weight_kg), 0) as weight_total
      from filtered_entries
      where entry_kind = 'seller'
      group by 1
    ),
    commodity_sales as (
      select
        commodity_type,
        count(*) as sold_count,
        coalesce(sum(final_price), 0) as sales_total,
        coalesce(avg(final_price), 0) as average_price
      from filtered_settlements
      group by 1
    ),
    commodity_keys as (
      select commodity_type from commodity_entries
      union
      select commodity_type from commodity_sales
    ),
    commodity_rows as (
      select
        k.commodity_type,
        coalesce(e.entries_count, 0) as entries_count,
        coalesce(s.sold_count, 0) as sold_count,
        coalesce(e.quantity_total, 0) as quantity_total,
        coalesce(e.weight_total, 0) as weight_total,
        coalesce(s.sales_total, 0) as sales_total,
        coalesce(s.average_price, 0) as average_price
      from commodity_keys k
      left join commodity_entries e using (commodity_type)
      left join commodity_sales s using (commodity_type)
    ),
    auctioneer_rows as (
      select
        auctioneer_id,
        auctioneer_name,
        count(*) as deals_count,
        coalesce(sum(final_price), 0) as sales_total,
        coalesce(avg(final_price), 0) as average_price,
        coalesce(sum(auctioneer_commission), 0) as auctioneer_commission,
        coalesce(sum(platform_commission), 0) as platform_commission
      from filtered_settlements
      group by auctioneer_id, auctioneer_name
    ),
    gatekeeper_rows as (
      select
        gatekeeper_id,
        gatekeeper_name,
        count(*) as entries_count,
        count(*) filter (where entry_kind = 'seller') as sellers_count,
        count(*) filter (where entry_kind = 'visitor') as visitors_count
      from filtered_entries
      group by gatekeeper_id, gatekeeper_name
    ),
    buyer_rows as (
      select
        buyer_name,
        buyer_phone,
        bool_or(approved_buyer_id is not null) as is_approved,
        count(*) as deals_count,
        coalesce(sum(final_price), 0) as total_spend,
        coalesce(avg(final_price), 0) as average_spend
      from filtered_settlements
      group by buyer_name, buyer_phone
    ),
    user_rows as (
      select
        coalesce(role::text, 'unassigned') as role,
        approval_status::text as approval_status,
        count(*) as users_count
      from filtered_profiles
      group by role, approval_status
    ),
    activity_rows as (
      select event_type, count(*) as events_count
      from filtered_events
      group by event_type
    )
    select jsonb_build_object(
      'summary', jsonb_build_object(
        'entries_count', (select count(*) from filtered_entries),
        'visitors_count', (select count(*) from filtered_entries where entry_kind = 'visitor'),
        'sellers_count', (select count(*) from filtered_entries where entry_kind = 'seller'),
        'cancelled_entries', (select count(*) from filtered_entries where status = 'cancelled'),
        'settlements_count', (select count(*) from filtered_settlements),
        'sales_total', (select coalesce(sum(final_price), 0) from filtered_settlements),
        'average_price', (select coalesce(avg(final_price), 0) from filtered_settlements),
        'platform_commission', (select coalesce(sum(platform_commission), 0) from filtered_settlements),
        'auctioneer_commission', (select coalesce(sum(auctioneer_commission), 0) from filtered_settlements),
        'weight_total', (select coalesce(sum(total_weight_kg), 0) from filtered_entries where entry_kind = 'seller'),
        'conversion_rate', coalesce(round(
          (select count(*)::numeric from filtered_settlements) * 100 /
          nullif((select count(*)::numeric from filtered_entries where entry_kind = 'seller'), 0),
          2
        ), 0),
        'new_users', (select count(*) from filtered_profiles),
        'events_count', (select count(*) from filtered_events),
        'pending_users', (select count(*) from public.profiles where approval_status = 'pending'),
        'active_staff', (select count(*) from public.profiles where approval_status = 'approved' and role is not null),
        'active_buyers', (select count(*) from public.approved_buyers where is_active)
      ),
      'daily', coalesce((
        select jsonb_agg(to_jsonb(d) order by d.business_date)
        from daily_rows d
      ), '[]'::jsonb),
      'commodities', coalesce((
        select jsonb_agg(to_jsonb(c) order by c.sales_total desc, c.entries_count desc, c.commodity_type)
        from commodity_rows c
      ), '[]'::jsonb),
      'auctioneers', coalesce((
        select jsonb_agg(to_jsonb(a) order by a.sales_total desc, a.deals_count desc)
        from auctioneer_rows a
      ), '[]'::jsonb),
      'gatekeepers', coalesce((
        select jsonb_agg(to_jsonb(g) order by g.entries_count desc)
        from gatekeeper_rows g
      ), '[]'::jsonb),
      'buyers', coalesce((
        select jsonb_agg(to_jsonb(b) order by b.total_spend desc, b.deals_count desc)
        from buyer_rows b
      ), '[]'::jsonb),
      'users', coalesce((
        select jsonb_agg(to_jsonb(u) order by u.users_count desc, u.role, u.approval_status)
        from user_rows u
      ), '[]'::jsonb),
      'activities', coalesce((
        select jsonb_agg(to_jsonb(a) order by a.events_count desc, a.event_type)
        from activity_rows a
      ), '[]'::jsonb),
      'settlements', coalesce((
        select jsonb_agg(to_jsonb(s) order by s.settled_at desc)
        from filtered_settlements s
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke execute on function public.get_admin_report(date, date) from public;
grant execute on function public.get_admin_report(date, date) to authenticated;

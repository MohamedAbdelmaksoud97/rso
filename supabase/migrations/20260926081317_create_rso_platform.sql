create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('admin', 'auctioneer', 'gatekeeper');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.entry_kind as enum ('seller', 'visitor');
create type public.lot_status as enum ('registered', 'sold', 'cancelled');

create sequence public.lot_receipt_seq;
create sequence public.settlement_receipt_seq;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  email_confirmed boolean not null default false,
  role public.app_role,
  approval_status public.approval_status not null default 'pending',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) between 2 and 120),
  constraint profiles_phone_format check (phone is null or phone ~ '^[0-9+ ]{8,20}$'),
  constraint profiles_approval_consistency check (
    (approval_status = 'approved' and role is not null and email_confirmed) or approval_status <> 'approved'
  )
);

create unique index profiles_email_unique_idx on public.profiles (lower(email));
create index profiles_approval_created_idx on public.profiles (approval_status, created_at desc);
create index profiles_role_approval_idx on public.profiles (role, approval_status);

create table public.approved_buyers (
  id bigint generated always as identity primary key,
  full_name text not null,
  phone text,
  national_id text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_buyers_full_name_length check (char_length(full_name) between 2 and 120),
  constraint approved_buyers_phone_format check (phone is null or phone ~ '^[0-9+ ]{8,20}$')
);

create unique index approved_buyers_phone_unique_idx
  on public.approved_buyers (phone) where phone is not null;
create unique index approved_buyers_national_id_unique_idx
  on public.approved_buyers (national_id) where national_id is not null;
create index approved_buyers_active_name_idx
  on public.approved_buyers (is_active, full_name);

create table public.market_entries (
  id bigint generated always as identity primary key,
  receipt_number text not null unique,
  entry_kind public.entry_kind not null,
  person_name text not null,
  mobile_or_id text not null,
  commodity_type text,
  quantity numeric(12,2),
  unit_label text not null default 'وحدة',
  total_weight_kg numeric(12,2),
  notes text,
  qr_token uuid not null default gen_random_uuid() unique,
  status public.lot_status not null default 'registered',
  gatekeeper_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_entries_person_name_length check (char_length(person_name) between 2 and 120),
  constraint market_entries_mobile_id_length check (char_length(mobile_or_id) between 6 and 24),
  constraint market_entries_quantity_positive check (quantity is null or quantity > 0),
  constraint market_entries_weight_positive check (total_weight_kg is null or total_weight_kg > 0),
  constraint seller_fields_required check (
    entry_kind = 'visitor' or
    (commodity_type is not null and quantity is not null and total_weight_kg is not null)
  )
);

create index market_entries_gatekeeper_created_idx
  on public.market_entries (gatekeeper_id, created_at desc);
create index market_entries_status_created_idx
  on public.market_entries (status, created_at desc);
create index market_entries_mobile_idx on public.market_entries (mobile_or_id);

create table public.commission_settings (
  id bigint generated always as identity primary key,
  auctioneer_rate_percent numeric(7,4) not null default 1.0000,
  platform_rate_percent numeric(7,4) not null default 0.5000,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint commission_auctioneer_rate_range check (auctioneer_rate_percent between 0 and 100),
  constraint commission_platform_rate_range check (platform_rate_percent between 0 and 100),
  constraint commission_date_range check (effective_to is null or effective_to > effective_from)
);

create unique index commission_settings_one_active_idx
  on public.commission_settings (is_active) where is_active;
create index commission_settings_effective_idx
  on public.commission_settings (effective_from desc);

create table public.auction_settlements (
  id bigint generated always as identity primary key,
  receipt_number text not null unique,
  market_entry_id bigint not null unique references public.market_entries(id) on delete restrict,
  approved_buyer_id bigint references public.approved_buyers(id) on delete set null,
  buyer_name text not null,
  buyer_phone text,
  final_price numeric(14,2) not null,
  auctioneer_rate_percent numeric(7,4) not null,
  platform_rate_percent numeric(7,4) not null,
  auctioneer_commission numeric(14,2) not null,
  platform_commission numeric(14,2) not null,
  auctioneer_id uuid not null references public.profiles(id) on delete restrict,
  notes text,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint auction_settlements_buyer_name_length check (char_length(buyer_name) between 2 and 120),
  constraint auction_settlements_price_positive check (final_price > 0),
  constraint auction_settlements_rates_range check (
    auctioneer_rate_percent between 0 and 100 and platform_rate_percent between 0 and 100
  ),
  constraint auction_settlements_commissions_nonnegative check (
    auctioneer_commission >= 0 and platform_commission >= 0
  )
);

create index auction_settlements_auctioneer_date_idx
  on public.auction_settlements (auctioneer_id, settled_at desc);
create index auction_settlements_settled_at_idx
  on public.auction_settlements (settled_at desc);
create index auction_settlements_buyer_idx
  on public.auction_settlements (approved_buyer_id) where approved_buyer_id is not null;

create table public.site_settings (
  id boolean primary key default true,
  platform_name text not null default 'منصة رسو',
  hero_title text not null default 'توثيق موثوق لكل مزاد',
  hero_description text not null default 'المنظومة الرقمية لحوكمة المزادات وتوثيق التعاملات في أسواق النفع العام.',
  announcement text,
  public_fields jsonb not null default '{"seller_name":true,"commodity_type":true,"quantity":true,"total_weight_kg":true,"final_price":true,"buyer_name":true,"settled_at":true}'::jsonb,
  stats_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id),
  constraint site_settings_public_fields_object check (jsonb_typeof(public_fields) = 'object')
);

insert into public.site_settings (id) values (true);

create table public.activity_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_created_idx on public.activity_events (created_at desc);
create index activity_events_type_created_idx on public.activity_events (event_type, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger approved_buyers_set_updated_at
before update on public.approved_buyers
for each row execute function private.set_updated_at();

create trigger market_entries_set_updated_at
before update on public.market_entries
for each row execute function private.set_updated_at();

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone, email_confirmed)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.handle_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles set email_confirmed = true where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
after update of email_confirmed_at on auth.users
for each row execute function private.handle_email_confirmation();

create or replace function private.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid()) and approval_status = 'approved';
$$;

create or replace function private.current_profile_is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and approval_status = 'approved'
  );
$$;

revoke execute on function private.current_profile_role() from public;
revoke execute on function private.current_profile_is_approved() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.current_profile_is_approved() to authenticated;

create or replace function private.assign_receipt_numbers()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'market_entries' then
    new.receipt_number := 'RSO-E-' || to_char(now() at time zone 'Asia/Riyadh', 'YYYYMMDD') || '-' || lpad(nextval('public.lot_receipt_seq')::text, 6, '0');
  elsif tg_table_name = 'auction_settlements' then
    new.receipt_number := 'RSO-S-' || to_char(now() at time zone 'Asia/Riyadh', 'YYYYMMDD') || '-' || lpad(nextval('public.settlement_receipt_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger market_entries_assign_receipt
before insert on public.market_entries
for each row execute function private.assign_receipt_numbers();

create trigger auction_settlements_assign_receipt
before insert on public.auction_settlements
for each row execute function private.assign_receipt_numbers();

create or replace function private.create_auction_settlement(
  p_qr_token uuid,
  p_approved_buyer_id bigint,
  p_buyer_name text,
  p_buyer_phone text,
  p_final_price numeric,
  p_notes text default null
)
returns public.auction_settlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.market_entries;
  v_commission public.commission_settings;
  v_settlement public.auction_settlements;
begin
  if not coalesce((select private.current_profile_role()) in ('auctioneer', 'admin'), false) then
    raise exception 'غير مصرح بتوثيق الترسية';
  end if;

  select * into v_entry
  from public.market_entries
  where qr_token = p_qr_token and status = 'registered'
  for update;

  if not found then
    raise exception 'الكود غير صالح أو تم توثيق هذه البضاعة مسبقاً';
  end if;

  select * into v_commission
  from public.commission_settings
  where is_active and effective_from <= now()
  order by effective_from desc
  limit 1;

  if not found then
    raise exception 'يجب على المدير إعداد العمولات أولاً';
  end if;

  insert into public.auction_settlements (
    market_entry_id, approved_buyer_id, buyer_name, buyer_phone, final_price,
    auctioneer_rate_percent, platform_rate_percent, auctioneer_commission,
    platform_commission, auctioneer_id, notes
  ) values (
    v_entry.id, p_approved_buyer_id, trim(p_buyer_name), nullif(trim(p_buyer_phone), ''), p_final_price,
    v_commission.auctioneer_rate_percent, v_commission.platform_rate_percent,
    round(p_final_price * v_commission.auctioneer_rate_percent / 100, 2),
    round(p_final_price * v_commission.platform_rate_percent / 100, 2),
    (select auth.uid()), nullif(trim(p_notes), '')
  ) returning * into v_settlement;

  update public.market_entries set status = 'sold' where id = v_entry.id;

  insert into public.activity_events (event_type, actor_id, entity_type, entity_id, summary, metadata)
  values (
    'settlement_created', (select auth.uid()), 'auction_settlement', v_settlement.id::text,
    'تم إصدار سند ترسية جديد', jsonb_build_object('receipt_number', v_settlement.receipt_number, 'amount', p_final_price)
  );

  return v_settlement;
end;
$$;

create or replace function public.create_auction_settlement(
  p_qr_token uuid,
  p_approved_buyer_id bigint,
  p_buyer_name text,
  p_buyer_phone text,
  p_final_price numeric,
  p_notes text default null
)
returns public.auction_settlements
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_auction_settlement(
    p_qr_token,
    p_approved_buyer_id,
    p_buyer_name,
    p_buyer_phone,
    p_final_price,
    p_notes
  );
$$;

create or replace function private.search_public_receipt(p_query text)
returns table (
  receipt_number text,
  seller_name text,
  commodity_type text,
  quantity numeric,
  unit_label text,
  total_weight_kg numeric,
  final_price numeric,
  buyer_name text,
  settled_at timestamptz,
  verification_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.receipt_number,
    case when coalesce((cfg.public_fields ->> 'seller_name')::boolean, false) then e.person_name end,
    case when coalesce((cfg.public_fields ->> 'commodity_type')::boolean, false) then e.commodity_type end,
    case when coalesce((cfg.public_fields ->> 'quantity')::boolean, false) then e.quantity end,
    case when coalesce((cfg.public_fields ->> 'quantity')::boolean, false) then e.unit_label end,
    case when coalesce((cfg.public_fields ->> 'total_weight_kg')::boolean, false) then e.total_weight_kg end,
    case when coalesce((cfg.public_fields ->> 'final_price')::boolean, false) then s.final_price end,
    case when coalesce((cfg.public_fields ->> 'buyer_name')::boolean, false) then s.buyer_name end,
    case when coalesce((cfg.public_fields ->> 'settled_at')::boolean, false) then s.settled_at end,
    'موثق'::text
  from public.auction_settlements s
  join public.market_entries e on e.id = s.market_entry_id
  cross join public.site_settings cfg
  where char_length(trim(p_query)) >= 4
    and (s.receipt_number = trim(p_query) or e.mobile_or_id = trim(p_query))
  order by s.settled_at desc
  limit 10;
$$;

create or replace function public.search_public_receipt(p_query text)
returns table (
  receipt_number text,
  seller_name text,
  commodity_type text,
  quantity numeric,
  unit_label text,
  total_weight_kg numeric,
  final_price numeric,
  buyer_name text,
  settled_at timestamptz,
  verification_status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.search_public_receipt(p_query);
$$;

create or replace function private.set_commission_rates(
  p_auctioneer_rate_percent numeric,
  p_platform_rate_percent numeric
)
returns public.commission_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_setting public.commission_settings;
begin
  if not coalesce((select private.current_profile_role()) = 'admin', false) then
    raise exception 'غير مصرح بتعديل العمولات';
  end if;
  if p_auctioneer_rate_percent < 0 or p_auctioneer_rate_percent > 100
    or p_platform_rate_percent < 0 or p_platform_rate_percent > 100 then
    raise exception 'نسب العمولات يجب أن تكون بين 0 و100';
  end if;

  update public.commission_settings
  set is_active = false, effective_to = now()
  where is_active;

  insert into public.commission_settings (
    auctioneer_rate_percent,
    platform_rate_percent,
    created_by
  ) values (
    p_auctioneer_rate_percent,
    p_platform_rate_percent,
    (select auth.uid())
  ) returning * into v_setting;

  insert into public.activity_events (event_type, actor_id, entity_type, entity_id, summary, metadata)
  values ('commission_updated', (select auth.uid()), 'commission_settings', v_setting.id::text, 'تم تحديث نسب العمولات', jsonb_build_object('auctioneer_rate', p_auctioneer_rate_percent, 'platform_rate', p_platform_rate_percent));

  return v_setting;
end;
$$;

create or replace function public.set_commission_rates(
  p_auctioneer_rate_percent numeric,
  p_platform_rate_percent numeric
)
returns public.commission_settings
language sql
security invoker
set search_path = ''
as $$
  select * from private.set_commission_rates(p_auctioneer_rate_percent, p_platform_rate_percent);
$$;

revoke execute on function private.search_public_receipt(text) from public;
grant execute on function private.search_public_receipt(text) to anon, authenticated;
revoke execute on function private.create_auction_settlement(uuid, bigint, text, text, numeric, text) from public;
grant execute on function private.create_auction_settlement(uuid, bigint, text, text, numeric, text) to authenticated;
grant execute on function public.search_public_receipt(text) to anon, authenticated;
grant execute on function public.create_auction_settlement(uuid, bigint, text, text, numeric, text) to authenticated;
revoke execute on function private.set_commission_rates(numeric, numeric) from public;
grant execute on function private.set_commission_rates(numeric, numeric) to authenticated;
grant execute on function public.set_commission_rates(numeric, numeric) to authenticated;

create view public.daily_commission_summary
with (security_invoker = true)
as
select
  auctioneer_id,
  date(settled_at at time zone 'Asia/Riyadh') as business_date,
  count(*) as deals_count,
  sum(final_price) as gross_sales,
  sum(auctioneer_commission) as auctioneer_commission,
  sum(platform_commission) as platform_commission,
  sum(auctioneer_commission) - sum(platform_commission) as net_commission
from public.auction_settlements
group by auctioneer_id, date(settled_at at time zone 'Asia/Riyadh');

alter table public.profiles enable row level security;
alter table public.approved_buyers enable row level security;
alter table public.market_entries enable row level security;
alter table public.commission_settings enable row level security;
alter table public.auction_settlements enable row level security;
alter table public.site_settings enable row level security;
alter table public.activity_events enable row level security;

create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.current_profile_role()) = 'admin');

create policy profiles_admin_update on public.profiles
for update to authenticated
using ((select private.current_profile_role()) = 'admin')
with check ((select private.current_profile_role()) = 'admin');

create policy buyers_approved_staff_select on public.approved_buyers
for select to authenticated
using ((select private.current_profile_is_approved()));

create policy buyers_auctioneer_insert on public.approved_buyers
for insert to authenticated
with check (
  (select private.current_profile_role()) = 'admin'
  or ((select private.current_profile_role()) = 'auctioneer' and not is_active)
);

create policy buyers_admin_update on public.approved_buyers
for update to authenticated
using ((select private.current_profile_role()) = 'admin')
with check ((select private.current_profile_role()) = 'admin');

create policy entries_staff_select on public.market_entries
for select to authenticated
using (
  (select private.current_profile_role()) in ('admin', 'auctioneer')
  or gatekeeper_id = (select auth.uid())
);

create policy entries_gatekeeper_insert on public.market_entries
for insert to authenticated
with check (
  gatekeeper_id = (select auth.uid())
  and (select private.current_profile_role()) in ('gatekeeper', 'admin')
);

create policy entries_gatekeeper_update on public.market_entries
for update to authenticated
using (
  (gatekeeper_id = (select auth.uid()) and status = 'registered')
  or (select private.current_profile_role()) = 'admin'
)
with check (
  (gatekeeper_id = (select auth.uid()) and status in ('registered', 'cancelled'))
  or (select private.current_profile_role()) = 'admin'
);

create policy commission_staff_select on public.commission_settings
for select to authenticated
using ((select private.current_profile_is_approved()));

create policy commission_admin_insert on public.commission_settings
for insert to authenticated
with check ((select private.current_profile_role()) = 'admin');

create policy commission_admin_update on public.commission_settings
for update to authenticated
using ((select private.current_profile_role()) = 'admin')
with check ((select private.current_profile_role()) = 'admin');

create policy settlements_staff_select on public.auction_settlements
for select to authenticated
using (
  (select private.current_profile_role()) = 'admin'
  or auctioneer_id = (select auth.uid())
  or exists (
    select 1 from public.market_entries e
    where e.id = market_entry_id and e.gatekeeper_id = (select auth.uid())
  )
);

create policy settlements_auctioneer_insert on public.auction_settlements
for insert to authenticated
with check (
  auctioneer_id = (select auth.uid())
  and (select private.current_profile_role()) in ('auctioneer', 'admin')
);

create policy site_settings_public_select on public.site_settings
for select to anon, authenticated
using (true);

create policy site_settings_admin_update on public.site_settings
for update to authenticated
using ((select private.current_profile_role()) = 'admin')
with check ((select private.current_profile_role()) = 'admin');

create policy activity_admin_select on public.activity_events
for select to authenticated
using ((select private.current_profile_role()) = 'admin');

create policy activity_approved_insert on public.activity_events
for insert to authenticated
with check (
  actor_id = (select auth.uid()) and (select private.current_profile_is_approved())
);

grant usage on schema public to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select on public.profiles, public.approved_buyers, public.market_entries,
  public.commission_settings, public.auction_settlements, public.activity_events,
  public.daily_commission_summary to authenticated;
grant insert, update on public.profiles, public.approved_buyers, public.market_entries,
  public.commission_settings, public.auction_settlements, public.site_settings,
  public.activity_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_events'
  ) then
    alter publication supabase_realtime add table public.activity_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'auction_settlements'
  ) then
    alter publication supabase_realtime add table public.auction_settlements;
  end if;
end $$;

create index if not exists activity_events_actor_created_idx
on public.activity_events (actor_id, created_at desc)
where actor_id is not null;

create policy activity_own_select on public.activity_events
for select to authenticated
using (
  actor_id = (select auth.uid())
  and (select private.current_profile_is_approved())
);

create or replace function private.log_market_entry_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_events (
    event_type,
    actor_id,
    entity_type,
    entity_id,
    summary,
    metadata
  ) values (
    case when new.entry_kind = 'visitor' then 'visitor_entry_created' else 'seller_entry_created' end,
    new.gatekeeper_id,
    'market_entry',
    new.id::text,
    case when new.entry_kind = 'visitor' then 'تم تسجيل دخول زائر جديد' else 'تم تسجيل بضاعة جديدة وإصدار رمز QR' end,
    jsonb_build_object('receipt_number', new.receipt_number, 'entry_kind', new.entry_kind)
  );
  return new;
end;
$$;

revoke execute on function private.log_market_entry_activity() from public;

create trigger market_entries_activity_after_insert
after insert on public.market_entries
for each row execute function private.log_market_entry_activity();

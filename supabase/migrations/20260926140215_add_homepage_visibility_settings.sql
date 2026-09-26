alter table public.site_settings
  add column announcement_enabled boolean not null default true,
  add column public_search_enabled boolean not null default true,
  add column workflow_enabled boolean not null default true,
  add column governance_enabled boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_settings'
  ) then
    alter publication supabase_realtime add table public.site_settings;
  end if;
end
$$;

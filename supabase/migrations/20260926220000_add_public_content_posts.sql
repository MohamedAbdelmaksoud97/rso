alter table public.site_settings
  add column news_enabled boolean not null default true;

create table public.content_posts (
  id bigint generated always as identity primary key,
  kind text not null default 'news',
  title text not null,
  summary text not null,
  body text not null,
  is_published boolean not null default true,
  is_featured boolean not null default false,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_posts_kind_valid check (kind in ('news', 'announcement')),
  constraint content_posts_title_length check (char_length(trim(title)) between 3 and 140),
  constraint content_posts_summary_length check (char_length(trim(summary)) between 10 and 320),
  constraint content_posts_body_length check (char_length(trim(body)) between 10 and 10000),
  constraint content_posts_date_range check (expires_at is null or expires_at > publish_at)
);

create index content_posts_public_listing_idx
  on public.content_posts (is_featured desc, publish_at desc)
  where is_published;

create index content_posts_admin_listing_idx
  on public.content_posts (created_at desc);

create trigger content_posts_set_updated_at
before update on public.content_posts
for each row execute function private.set_updated_at();

alter table public.content_posts enable row level security;

create policy content_posts_public_select on public.content_posts
for select to anon, authenticated
using (
  is_published
  and publish_at <= now()
  and (expires_at is null or expires_at > now())
);

create policy content_posts_admin_select on public.content_posts
for select to authenticated
using ((select private.current_profile_role()) = 'admin');

create policy content_posts_admin_insert on public.content_posts
for insert to authenticated
with check (
  (select private.current_profile_role()) = 'admin'
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy content_posts_admin_update on public.content_posts
for update to authenticated
using ((select private.current_profile_role()) = 'admin')
with check (
  (select private.current_profile_role()) = 'admin'
  and updated_by = (select auth.uid())
);

create policy content_posts_admin_delete on public.content_posts
for delete to authenticated
using ((select private.current_profile_role()) = 'admin');

grant select on public.content_posts to anon, authenticated;
grant insert, update, delete on public.content_posts to authenticated;
grant usage, select on sequence public.content_posts_id_seq to authenticated;

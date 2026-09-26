create index if not exists market_entries_created_at_idx
  on public.market_entries (created_at desc);

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

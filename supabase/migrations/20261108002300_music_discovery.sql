-- Public chart snapshots, refreshed by a trusted weekly job only.
begin;
create table public.music_chart_snapshots (
  provider text primary key check (provider in ('spotify','spotify-all-time','youtube','soundcloud','tiktok')),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object' and payload->>'provider' = provider
    and jsonb_typeof(payload->'tracks') = 'array'
    and jsonb_array_length(payload->'tracks') <= 150
  ),
  refreshed_at timestamptz not null default now()
);
alter table public.music_chart_snapshots enable row level security;
revoke all on public.music_chart_snapshots from public, anon, authenticated;
grant select on public.music_chart_snapshots to anon, authenticated;
grant all on public.music_chart_snapshots to service_role;
create policy music_charts_public_read on public.music_chart_snapshots for select to anon, authenticated using (true);
notify pgrst, 'reload schema';
commit;

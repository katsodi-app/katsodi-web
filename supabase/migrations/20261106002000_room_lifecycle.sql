-- Room lifecycle by occupancy (TASKS.md, task 3.1; owner decision 2026-11-06:
-- delete fully). A room is occupied while an active member has its page open
-- (any tab state): the page pings every ~30 s. After 10 continuous minutes
-- with nobody present the room is marked inactive; after 30 it is deleted
-- with its chat, queue, invites and other room data. Uploaded chat images
-- are queued for removal from Storage by the trusted scheduler.
begin;
-- Existing rooms start counting from the moment this migration runs.
alter table public.rooms
  add column last_occupied_at timestamptz not null default now(),
  add column inactive_at timestamptz;
create index rooms_last_occupied on public.rooms(last_occupied_at);
grant select(last_occupied_at, inactive_at) on public.rooms to anon, authenticated;

-- Storage objects of deleted rooms, removed by the scheduler (service role).
create table public.room_storage_cleanup (
  room_id uuid primary key,
  queued_at timestamptz not null default now()
);
alter table public.room_storage_cleanup enable row level security;
revoke all on public.room_storage_cleanup from public, anon, authenticated;
grant all on public.room_storage_cleanup to service_role;

-- An active member with the room page open keeps the room occupied.
create function public.room_occupancy_ping(p_room uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  if not exists(select 1 from public.room_members where room_id = p_room
      and user_id = uid and status = 'active') then
    return;
  end if;
  update public.rooms set last_occupied_at = clock_timestamp(), inactive_at = null
    where id = p_room
      and (last_occupied_at < clock_timestamp() - interval '20 seconds' or inactive_at is not null);
end $$;
revoke all on function public.room_occupancy_ping(uuid) from public, anon;
grant execute on function public.room_occupancy_ping(uuid) to authenticated;

-- Run by the trusted scheduler only. Marks rooms empty for 10 minutes as
-- inactive and deletes rooms empty for 30 minutes; returns what it did.
create function public.run_room_lifecycle()
returns table(inactive integer, deleted integer)
language plpgsql security definer set search_path='' as $$
declare marked integer; removed integer;
begin
  update public.rooms set inactive_at = clock_timestamp()
    where inactive_at is null and last_occupied_at < clock_timestamp() - interval '10 minutes';
  get diagnostics marked = row_count;
  with gone as (
    delete from public.rooms
      where last_occupied_at < clock_timestamp() - interval '30 minutes'
      returning id
  )
  insert into public.room_storage_cleanup(room_id) select id from gone
    on conflict (room_id) do nothing;
  get diagnostics removed = row_count;
  return query select marked, removed;
end $$;
revoke all on function public.run_room_lifecycle() from public, anon, authenticated;
grant execute on function public.run_room_lifecycle() to service_role;
notify pgrst, 'reload schema';
commit;

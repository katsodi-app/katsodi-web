-- Screen sharing through LiveKit: one owner/moderator shares a screen or tab,
-- everyone else in the room watches it read-only. The video goes through
-- LiveKit (a separate SFU room per Katsodi room); this table only records who
-- is sharing, so members know when to connect. A share counts as live while
-- the sharer's client confirms it at least once a minute.
-- Requires voice (migration 0600) for durable SFU revocations.
begin;
create table public.room_screens (
  room_id uuid primary key references public.rooms on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  started_at timestamptz not null default clock_timestamp(),
  seen_at timestamptz not null default clock_timestamp()
);
alter table public.room_screens enable row level security;
revoke all on public.room_screens from public, anon, authenticated;
grant select(room_id, user_id, started_at, seen_at) on public.room_screens to authenticated;
create policy room_screens_read on public.room_screens for select to authenticated
  using (private.is_member(room_id));

-- p_on=true starts or confirms the caller's share; false stops it. Only an
-- active owner/moderator of an open room may share, one sharer at a time.
create function public.set_room_screen(p_room uuid, p_on boolean) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); s public.room_screens;
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not exists(
    select 1 from public.room_members where room_id=p_room and user_id=uid
      and status='active' and role in ('owner','moderator')
  ) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_on is not true then
    delete from public.room_screens where room_id=p_room and user_id=uid;
    return;
  end if;
  select * into s from public.room_screens where room_id=p_room;
  if s.room_id is not null and s.user_id<>uid
    and s.seen_at > clock_timestamp()-interval '60 seconds' then
    raise exception 'screen_busy' using errcode='22023';
  end if;
  insert into public.room_screens(room_id, user_id, started_at, seen_at)
    values (p_room, uid, clock_timestamp(), clock_timestamp())
    on conflict (room_id) do update set
      started_at = case when public.room_screens.user_id=excluded.user_id
        then public.room_screens.started_at else excluded.started_at end,
      user_id=excluded.user_id, seen_at=excluded.seen_at;
end $$;
revoke all on function public.set_room_screen(uuid, boolean) from public, anon;
grant execute on function public.set_room_screen(uuid, boolean) to authenticated;

-- Losing host rights or membership ends the share at once, and a demoted
-- host is removed from the SFU (kicks and closes are queued by 0600 already).
create function private.end_screen_on_role_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status<>'active' or new.role not in ('owner','moderator') then
    delete from public.room_screens where room_id=new.room_id and user_id=new.user_id;
  end if;
  if new.status='active' and old.status='active'
    and old.role in ('owner','moderator') and new.role not in ('owner','moderator')
    and to_regclass('public.voice_revocations') is not null then
    insert into public.voice_revocations(room_id, user_id) values (new.room_id, new.user_id);
  end if;
  return new;
end $$;
revoke execute on function private.end_screen_on_role_change() from public, anon, authenticated;
create trigger room_members_end_screen after update of role, status on public.room_members
  for each row execute function private.end_screen_on_role_change();

-- Realtime room signals (migration 1000) are optional; signal when present.
do $$
begin
  if to_regprocedure('private.signal_room_change()') is not null then
    create trigger room_screens_signal after insert or delete or update of user_id on public.room_screens
      for each row execute function private.signal_room_change();
  end if;
end $$;
notify pgrst, 'reload schema';
commit;

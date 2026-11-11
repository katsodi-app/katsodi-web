-- Link demos replace plain screen sharing (migration 1700). Any member posts
-- a link to the chat and asks to demo it; an owner/moderator accepts (a
-- host's own request starts at once). The sharer's browser shows the site
-- and streams it through LiveKit; members watch. Hosts can pause, resume and
-- stop a demo. One demo per room. A live demo stays live while the sharer's
-- client confirms it at least once a minute; a request waits ten minutes.
-- Requires voice (0600) for durable SFU revocations.
begin;
drop trigger if exists room_members_end_screen on public.room_members;
drop function if exists private.end_screen_on_role_change();
drop function if exists public.set_room_screen(uuid, boolean);
drop table if exists public.room_screens;

create table public.room_demos (
  room_id uuid primary key references public.rooms on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  url text not null check (char_length(url) <= 2048 and url ~ '^https://[^[:space:]]+$'),
  status text not null check (status in ('pending','live','paused')),
  requested_at timestamptz not null default clock_timestamp(),
  decided_by uuid references public.profiles on delete set null,
  paused_by uuid references public.profiles on delete set null,
  seen_at timestamptz not null default clock_timestamp()
);
alter table public.room_demos enable row level security;
revoke all on public.room_demos from public, anon, authenticated;
grant select(room_id, user_id, url, status, requested_at, decided_by, paused_by, seen_at)
  on public.room_demos to authenticated;
create policy room_demos_read on public.room_demos for select to authenticated
  using (private.is_member(room_id));

-- A demo that is still waiting or still being confirmed by its sharer.
create function private.demo_current(d public.room_demos) returns boolean
language sql stable set search_path='' as $$
  select d.room_id is not null and case d.status
    when 'pending' then d.requested_at > clock_timestamp()-interval '10 minutes'
    else d.seen_at > clock_timestamp()-interval '60 seconds' end
$$;
create function private.is_room_host(p_room uuid, p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.room_members where room_id=p_room
    and user_id=p_user and status='active' and role in ('owner','moderator'))
$$;
revoke execute on function private.demo_current(public.room_demos), private.is_room_host(uuid, uuid)
  from public, anon, authenticated;

-- Posts the link to the chat and asks to demo it. Returns the demo status.
create function public.request_room_demo(p_room uuid, p_url text) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); d public.room_demos; host boolean;
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.is_member(p_room) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_url is null or char_length(p_url) > 2048 or p_url !~ '^https://[^[:space:]]+$' then
    raise exception 'invalid_source' using errcode='22023';
  end if;
  select * into d from public.room_demos where room_id=p_room;
  if private.demo_current(d) then raise exception 'demo_busy' using errcode='22023'; end if;
  perform public.send_room_message(p_room, p_url);
  host := private.is_room_host(p_room, uid);
  insert into public.room_demos(room_id, user_id, url, status, requested_at, decided_by, paused_by, seen_at)
    values (p_room, uid, p_url, case when host then 'live' else 'pending' end,
      clock_timestamp(), case when host then uid end, null, clock_timestamp())
    on conflict (room_id) do update set user_id=excluded.user_id, url=excluded.url,
      status=excluded.status, requested_at=excluded.requested_at,
      decided_by=excluded.decided_by, paused_by=null, seen_at=excluded.seen_at;
  return case when host then 'live' else 'pending' end;
end $$;

-- Hosts accept or decline a waiting request.
create function public.decide_room_demo(p_room uuid, p_accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); d public.room_demos;
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.is_room_host(p_room, uid) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  select * into d from public.room_demos where room_id=p_room;
  if d.status is distinct from 'pending' or not private.demo_current(d) then
    raise exception 'demo_unavailable' using errcode='22023';
  end if;
  if p_accept then
    update public.room_demos set status='live', decided_by=uid, seen_at=clock_timestamp()
      where room_id=p_room;
  else
    delete from public.room_demos where room_id=p_room;
  end if;
end $$;

-- Hosts pause and resume a running demo. Only hosts resume.
create function public.pause_room_demo(p_room uuid, p_paused boolean) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); d public.room_demos;
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.is_room_host(p_room, uid) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  select * into d from public.room_demos where room_id=p_room;
  if d.status not in ('live','paused') or not private.demo_current(d) then
    raise exception 'demo_unavailable' using errcode='22023';
  end if;
  update public.room_demos set status=case when p_paused then 'paused' else 'live' end,
    paused_by=case when p_paused then uid end where room_id=p_room;
end $$;

-- The sharer confirms a running demo (every ~20 s), keeping it live.
create function public.beat_room_demo(p_room uuid) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); d public.room_demos;
begin
  select * into d from public.room_demos where room_id=p_room and user_id=uid;
  if d.room_id is null or not private.demo_current(d) or not private.is_member(p_room) then
    raise exception 'demo_unavailable' using errcode='22023';
  end if;
  if d.status <> 'pending' then
    update public.room_demos set seen_at=clock_timestamp() where room_id=p_room;
  end if;
  return d.status;
end $$;

-- The sharer, or any host, ends the demo (or withdraws a request).
create function public.stop_room_demo(p_room uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  delete from public.room_demos where room_id=p_room
    and (user_id=uid or private.is_room_host(p_room, uid));
  if not found then raise exception 'forbidden' using errcode='42501'; end if;
end $$;

revoke all on function public.request_room_demo(uuid, text), public.decide_room_demo(uuid, boolean),
  public.pause_room_demo(uuid, boolean), public.beat_room_demo(uuid), public.stop_room_demo(uuid)
  from public, anon;
grant execute on function public.request_room_demo(uuid, text), public.decide_room_demo(uuid, boolean),
  public.pause_room_demo(uuid, boolean), public.beat_room_demo(uuid), public.stop_room_demo(uuid)
  to authenticated;

-- Leaving or removal ends a member's demo; a demoted host loses SFU data
-- rights at once (kicks and closes are queued by 0600 already).
create function private.end_demo_on_member_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status<>'active' then
    delete from public.room_demos where room_id=new.room_id and user_id=new.user_id;
  end if;
  if new.status='active' and old.status='active'
    and old.role in ('owner','moderator') and new.role not in ('owner','moderator')
    and to_regclass('public.voice_revocations') is not null then
    insert into public.voice_revocations(room_id, user_id) values (new.room_id, new.user_id);
  end if;
  return new;
end $$;
revoke execute on function private.end_demo_on_member_change() from public, anon, authenticated;
create trigger room_members_end_demo after update of role, status on public.room_members
  for each row execute function private.end_demo_on_member_change();

-- Realtime room signals (migration 1000) are optional; signal when present.
do $$
begin
  if to_regprocedure('private.signal_room_change()') is not null then
    create trigger room_demos_signal after insert or delete or update of status, user_id, url
      on public.room_demos for each row execute function private.signal_room_change();
  end if;
end $$;
notify pgrst, 'reload schema';
commit;

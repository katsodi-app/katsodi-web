-- Shared playback timeline for providers with an official player API
-- (YouTube first). The server is authoritative: owners/moderators publish
-- play/pause/seek, members read the state and follow it. Position is
-- extrapolated with the database clock, so client clocks never matter.
begin;
create table public.room_playback (
  room_id uuid primary key references public.rooms on delete cascade,
  -- The source this timeline belongs to; a source change invalidates it.
  source_url text not null check (char_length(source_url) <= 2048),
  state text not null check (state in ('playing','paused')),
  position double precision not null check (position >= 0 and position <= 172800),
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.profiles on delete set null
);
alter table public.room_playback enable row level security;
-- No direct table access: reads and writes go through the functions below.
revoke all on public.room_playback from public, anon, authenticated;

-- Current state for an active member, or null when nothing was published for
-- the room's current source.
create function public.get_room_playback(p_room uuid) returns json
language plpgsql stable security definer set search_path='' as $$
declare r public.rooms; p public.room_playback;
begin
  if not private.is_member(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into r from public.rooms where id=p_room;
  select * into p from public.room_playback where room_id=p_room;
  if p.room_id is null or r.closed_at is not null or p.source_url<>r.url then return null; end if;
  return json_build_object(
    'state', p.state,
    'position', least(172800, p.position + case when p.state='playing'
      then extract(epoch from clock_timestamp()-p.updated_at) else 0 end),
    'updated_at', p.updated_at,
    'source_url', p.source_url
  );
end $$;

create function public.set_room_playback(p_room uuid, p_source text, p_state text, p_position double precision)
returns json language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); r public.rooms;
begin
  select * into r from public.rooms where id=p_room and closed_at is null for update;
  if not found or not exists(select 1 from public.room_members where room_id=p_room and user_id=uid and status='active' and role in ('owner','moderator')) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  -- A control from a player still showing the previous source is ignored.
  if p_source is distinct from r.url or r.url='' then raise exception 'stale_source' using errcode='22023'; end if;
  -- In PostgreSQL NaN sorts above every number, so the upper bound also
  -- rejects NaN and Infinity.
  if p_state is null or p_state not in ('playing','paused') or p_position is null
    or p_position < 0 or p_position > 172800 then
    raise exception 'invalid_playback' using errcode='22023';
  end if;
  if exists(select 1 from public.room_playback where room_id=p_room and updated_at>clock_timestamp()-interval '200 milliseconds') then
    raise exception 'slow_down';
  end if;
  insert into public.room_playback(room_id,source_url,state,position,updated_at,updated_by)
    values(p_room,r.url,p_state,p_position,clock_timestamp(),uid)
    on conflict(room_id) do update set source_url=excluded.source_url,state=excluded.state,
      position=excluded.position,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  return public.get_room_playback(p_room);
end $$;

revoke all on function public.get_room_playback(uuid), public.set_room_playback(uuid,text,text,double precision) from public, anon;
grant execute on function public.get_room_playback(uuid), public.set_room_playback(uuid,text,text,double precision) to authenticated;
notify pgrst, 'reload schema';
commit;
